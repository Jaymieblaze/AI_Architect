'use client';

import { useState, useEffect, useRef } from 'react';
import type { GenerateResponse, PollResponse } from '@/types/api';
import type { Concept, AngleImage, AngleType } from '@/types/database';
import { generateAnglePrompts, generateCustomAnglePrompts, getAngleLoadingMessage, getAngleDisplayName, ANGLE_TYPES } from '@/types/angleGeneration';
import { uploadImage } from '@/lib/uploadImage';

const LOADING_PHRASES = [
  "Drafting conceptual geometry...",
  "Calculating structural loads...",
  "Applying parametric textures...",
  "Simulating natural sunlight...",
  "Finalizing architectural render..."
];

const MAX_POLL_DURATION = 5 * 60 * 1000; // 5 minutes
const POLL_INTERVAL = 3000; // 3 seconds
const MAX_RETRIES = 3;
const MIN_PROMPT_LENGTH = 10;
const MAX_PROMPT_LENGTH = 500;

export default function ConceptArchitect() {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<'idle' | 'generating' | 'complete' | 'error'>('idle');
  const [generationMode, setGenerationMode] = useState<'single' | 'multi-angle' | 'custom-angles' | 'image-to-render'>('single');
  const [customAngles, setCustomAngles] = useState<Array<{ name: string; description: string }>>([
    { name: 'Street Level', description: 'street level view' },
    { name: 'Entrance Closeup', description: 'entrance closeup architectural detail' },
    { name: 'Aerial View', description: 'bird\'s eye view from above' },
  ]);
  
  // Image-to-render state
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Single image state
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  
  // Multi-angle state
  const [angleImages, setAngleImages] = useState<AngleImage[]>([]);
  
  // Animation state
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentAnimationIndex, setCurrentAnimationIndex] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(3); // seconds per slide
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [loadingText, setLoadingText] = useState(LOADING_PHRASES[0]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<Concept[]>([]);
  const [showHistory, setShowHistory] = useState(true);
  const pollStartTimeRef = useRef<number>(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);
  const currentJobIdRef = useRef<string | null>(null);
  const currentPromptRef = useRef<string>('');
  const uploadedImageUrlRef = useRef<string | null>(null);
  
  // Multi-angle polling refs
  const angleJobIdsRef = useRef<Map<AngleType, string>>(new Map());
  const anglePollIntervalsRef = useRef<Map<AngleType, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    if (status !== 'generating') return;
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % LOADING_PHRASES.length;
      setLoadingText(LOADING_PHRASES[i]);
    }, 2500);
    return () => clearInterval(interval);
  }, [status]);

  // Animation cycling effect
  useEffect(() => {
    if (!isAnimating || angleImages.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentAnimationIndex((prev) => (prev + 1) % angleImages.length);
    }, animationSpeed * 1000);
    
    return () => clearInterval(interval);
  }, [isAnimating, angleImages.length, animationSpeed]);

  const generateConcept = async () => {
    if (!prompt || prompt.trim().length < MIN_PROMPT_LENGTH) {
      setErrorMessage(`Please enter at least ${MIN_PROMPT_LENGTH} characters to describe your concept.`);
      return;
    }
    
    if (prompt.length > MAX_PROMPT_LENGTH) {
      setErrorMessage(`Prompt is too long. Please keep it under ${MAX_PROMPT_LENGTH} characters.`);
      return;
    }

    // Validate image upload for image-to-render mode
    if (generationMode === 'image-to-render' && !uploadedImage) {
      setErrorMessage('Please upload an image to transform.');
      return;
    }

    setStatus('generating');
    setImageUrl(null);
    setAngleImages([]);
    setErrorMessage(null);
    retryCountRef.current = 0;
    currentPromptRef.current = prompt;
    pollStartTimeRef.current = Date.now();

    if (generationMode === 'image-to-render') {
      // Image-to-Render: Upload image first, then generate with imageUrls
      try {
        setIsUploading(true);
        
        // Upload the image to Supabase
        const uploadResult = await uploadImage(uploadedImage!);
        
        if (!uploadResult.success || !uploadResult.url) {
          throw new Error(uploadResult.error || 'Failed to upload image');
        }

        const sourceImageUrl = uploadResult.url;
        console.log('Uploaded source image:', sourceImageUrl);

        // Store source image URL for database save
        uploadedImageUrlRef.current = sourceImageUrl;

        // Enhance prompt emphasizing EXACT camera angle/viewpoint preservation
        const enhancedPrompt = `CRITICAL: This is an architectural front elevation view (orthogonal projection). Maintain the EXACT camera angle - straight-on front view only, NO side angles, NO perspective distortion. Keep this as a flat front facade view. Only add photorealistic materials (${prompt}), lighting, and landscaping. Do NOT change to a 3D angled perspective. Keep the same orthogonal front-facing viewpoint as the reference image.`;
        console.log('Enhanced prompt:', enhancedPrompt);

        // Generate with the uploaded image as reference (using Krea Nano Banana Pro)
        const response = await fetch('/api/generate-krea', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            user_prompt: enhancedPrompt,
            seed: Math.floor(Math.random() * 4294967295),
            imageUrls: [sourceImageUrl]
          }),
        });

        setIsUploading(false);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Generation API error:', response.status, errorText);
          throw new Error(`Backend failed to respond (${response.status}): ${errorText}`);
        }
        
        const rawData = await response.json();
        console.log("Raw response from Krea:", rawData);

        const job_id = extractJobId(rawData);

        if (!job_id) {
          throw new Error(`No job ID returned. Received: ${JSON.stringify(rawData)}`);
        }

        // Start the Polling Loop (use Krea polling endpoint)
        currentJobIdRef.current = job_id;
        pollStatus(job_id);

      } catch (error) {
        console.error("Failed to start image-to-render generation", error);
        setStatus('error');
        setIsUploading(false);
        setErrorMessage(error instanceof Error ? error.message : "Failed to process image. Please try again.");
      }
    } else if (generationMode === 'single') {
      // Single image generation (existing logic)
      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_prompt: prompt }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Generation API error:', response.status, errorText);
          throw new Error(`Backend failed to respond (${response.status}): ${errorText}`);
        }
        
        const rawData = await response.json();
        console.log("Raw response from n8n:", rawData);

        // Safely extract the job_id - n8n may wrap it in a stringified data field
        let job_id: string | null = null;
        
        if (typeof rawData === 'object' && rawData !== null) {
          // Direct access
          if ('job_id' in rawData && typeof rawData.job_id === 'string') {
            job_id = rawData.job_id;
          }
          // Nested in stringified data field (n8n webhook pattern)
          else if ('data' in rawData && typeof rawData.data === 'string') {
            try {
              const parsed = JSON.parse(rawData.data);
              if (parsed.job_id && typeof parsed.job_id === 'string') {
                job_id = parsed.job_id;
              }
            } catch (e) {
              console.error('Failed to parse nested data:', e);
            }
          }
          // Array response
          else if (Array.isArray(rawData) && rawData.length > 0 && rawData[0]?.job_id) {
            job_id = rawData[0].job_id;
          }
        }

        if (!job_id) {
          throw new Error(`No job ID returned. Received: ${JSON.stringify(rawData)}`);
        }

        // Start the Polling Loop
        currentJobIdRef.current = job_id;
        pollStatus(job_id);

      } catch (error) {
        console.error("Failed to start generation", error);
        setStatus('error');
        setErrorMessage("Failed to connect to the Architect Agent. Please try again.");
      }
    } else {
      // Multi-angle or Custom-angle generation
      try {
        let anglePromptsList: Array<{ angle: string; prompt: string; customLabel?: string }>;
        
        if (generationMode === 'custom-angles') {
          // Validate custom angles
          const validAngles = customAngles.filter(a => a.name.trim() && a.description.trim());
          if (validAngles.length === 0) {
            setErrorMessage('Please add at least one custom angle with both name and description.');
            setStatus('idle');
            return;
          }
          
          anglePromptsList = generateCustomAnglePrompts(prompt, validAngles);
          console.log("Generated custom angle prompts:", anglePromptsList);
        } else {
          // Standard 4-angle mode
          const anglePrompts = generateAnglePrompts(prompt);
          anglePromptsList = ANGLE_TYPES.map(angle => ({
            angle,
            prompt: anglePrompts[angle] || '',
          }));
          console.log("Generated angle prompts:", anglePrompts);
        }
        
        // Generate a random seed for consistency across all angles
        const generationSeed = Math.floor(Math.random() * 4294967295);
        console.log("Using seed for coherence:", generationSeed);
        
        // Initialize angle images array
        const initialAngles: AngleImage[] = anglePromptsList.map(({ angle, customLabel }) => ({
          angle,
          url: '',
          job_id: '',
          status: 'pending' as const,
          customLabel,
        }));
        setAngleImages(initialAngles);
        
        // SEQUENTIAL GENERATION WITH IMAGE-TO-IMAGE:
        // 1. Generate FIRST angle (establishes the building design)
        // 2. Wait for first angle to complete
        // 3. Use first angle image as reference for the other angles
        
        if (anglePromptsList.length === 0) {
          throw new Error('No angle prompts generated');
        }
        
        const [firstAngle, ...otherAnglesList] = anglePromptsList;
        console.log(`Generating ${firstAngle!.customLabel || firstAngle!.angle} view first...`);
        
        const useAdvancedFeatures = true;
        
        const firstRequestBody: any = { 
          user_prompt: firstAngle!.prompt
        };
        
        if (useAdvancedFeatures) {
          firstRequestBody.seed = generationSeed;
        }
        
        const firstResponse = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(firstRequestBody),
        });
        
        if (!firstResponse.ok) {
          const errorText = await firstResponse.text();
          console.error('First angle generation failed:', errorText);
          throw new Error('Failed to generate first view');
        }
        
        const rawData = await firstResponse.json();
        const firstJobId = extractJobId(rawData);
        
        if (!firstJobId) {
          throw new Error('No job ID for first view');
        }
        
        angleJobIdsRef.current.set(firstAngle!.angle as any, firstJobId);
        
        console.log('Waiting for first angle to complete before generating other angles...');
        const firstAngleUrl = await waitForAngleCompletion(firstAngle!.angle as any, firstJobId);
        
        if (!firstAngleUrl) {
          console.warn('First angle failed, generating other angles without reference');
        }
        
        // Step 2: Generate other angles with first angle as reference
        const otherPromises = otherAnglesList.map(async ({ angle, prompt, customLabel }) => {
          try {
            const requestBody: any = {
              user_prompt: prompt,
            };
            
            if (useAdvancedFeatures) {
              requestBody.seed = generationSeed;
              
              if (firstAngleUrl) {
                requestBody.imageUrls = [firstAngleUrl];
                requestBody.imagePromptStrengths = [80];
                console.log(`Generating ${customLabel || angle} with seed + first angle reference (strength: 80)`);
              }
            }
            
            const response = await fetch('/api/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody),
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error(`${angle} generation failed:`, errorText);
              throw new Error(`Failed to generate ${angle} view`);
            }
            
            const rawData = await response.json();
            const job_id = extractJobId(rawData);
            
            if (!job_id) {
              throw new Error(`No job ID for ${angle} view`);
            }
            
            angleJobIdsRef.current.set(angle as any, job_id);
            pollAngleStatus(angle as any, job_id);
            
            return { angle, job_id };
          } catch (error) {
            console.error(`Failed to start ${angle} generation:`, error);
            setAngleImages(prev => prev.map(img => 
              img.angle === angle ? { ...img, status: 'failed' as const } : img
            ));
            return { angle, job_id: null };
          }
        });
        
        await Promise.all(otherPromises);
        
      } catch (error) {
        console.error('Multi-angle generation error:', error);
        setStatus('error');
        setErrorMessage("Failed to connect to the Architect Agent. Please try again.");
      }
    }
  };

  // Helper to extract job_id from various response formats
  const extractJobId = (rawData: any): string | null => {
    if (typeof rawData === 'object' && rawData !== null) {
      if ('job_id' in rawData && typeof rawData.job_id === 'string') {
        return rawData.job_id;
      }
      if ('data' in rawData && typeof rawData.data === 'string') {
        try {
          const parsed = JSON.parse(rawData.data);
          if (parsed.job_id && typeof parsed.job_id === 'string') {
            return parsed.job_id;
          }
        } catch (e) {
          console.error('Failed to parse nested data:', e);
        }
      }
      if (Array.isArray(rawData) && rawData.length > 0 && rawData[0]?.job_id) {
        return rawData[0].job_id;
      }
    }
    return null;
  };

  // Wait for a specific angle to complete and return its URL
  // Used for sequential generation where we need exterior before proceeding
  const waitForAngleCompletion = async (angle: AngleType, jobId: string): Promise<string | null> => {
    const startTime = Date.now();
    const maxWait = 120000; // 2 minutes max wait for exterior
    
    while (Date.now() - startTime < maxWait) {
      try {
        const response = await fetch(`/api/poll?jobId=${jobId}`);
        
        if (!response.ok) {
          console.error(`Poll failed for ${angle}`);
          await new Promise(resolve => setTimeout(resolve, 3000));
          continue;
        }
        
        const text = await response.text();
        if (!text) {
          await new Promise(resolve => setTimeout(resolve, 3000));
          continue;
        }
        
        const data = JSON.parse(text) as PollResponse;
        
        if (data.status === 'completed' && data.image_url) {
          console.log(`${angle} completed with URL:`, data.image_url);
          // Update the angle image state
          setAngleImages(prev => prev.map(img => 
            img.angle === angle 
              ? { ...img, url: data.image_url as string, status: 'completed' as const, job_id: jobId } 
              : img
          ));
          return data.image_url;
        } else if (data.status === 'failed') {
          console.error(`${angle} generation failed`);
          setAngleImages(prev => prev.map(img => 
            img.angle === angle ? { ...img, status: 'failed' as const } : img
          ));
          return null;
        }
        
        // Still processing, wait and retry
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        console.error(`Error waiting for ${angle}:`, error);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    // Timeout
    console.error(`Timeout waiting for ${angle}`);
    setAngleImages(prev => prev.map(img => 
      img.angle === angle ? { ...img, status: 'failed' as const } : img
    ));
    return null;
  };

  const pollStatus = async (jobId: string) => {
    const poll = async () => {
      // Check timeout
      if (Date.now() - pollStartTimeRef.current > MAX_POLL_DURATION) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setStatus('error');
        setErrorMessage('Generation timeout. The request is taking too long. Please try again.');
        return;
      }

      try {
        const response = await fetch(`/api/poll?jobId=${jobId}`);
        
        if (!response.ok) {
          throw new Error(`Poll failed with status ${response.status}`);
        }

        const text = await response.text();
        if (!text) {
          console.warn("Received empty response from server, skipping this tick...");
          return;
        }

        const data = JSON.parse(text) as PollResponse;

        if (data.status === 'completed') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setImageUrl(data.image_url); 
          setStatus('complete');
          retryCountRef.current = 0;
          
          // Save to database
          if (data.image_url && currentJobIdRef.current && currentPromptRef.current) {
            saveConcept(currentPromptRef.current, data.image_url, currentJobIdRef.current);
          }
        } else if (data.status === 'failed') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setStatus('error');
          setErrorMessage('Render failed. Please try again with a different prompt.');
        }
      } catch (error) {
        console.error("Polling error:", error);
        retryCountRef.current++;
        
        // If we've exceeded max retries, stop polling
        if (retryCountRef.current >= MAX_RETRIES) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setStatus('error');
          setErrorMessage('Connection lost. Please check your network and try again.');
        }
      }
    };

    // Start polling
    poll(); // Initial poll
    pollIntervalRef.current = setInterval(poll, POLL_INTERVAL);
  };

  const pollStatusFal = async (requestId: string) => {
    const poll = async () => {
      // Check timeout
      if (Date.now() - pollStartTimeRef.current > MAX_POLL_DURATION) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setStatus('error');
        setErrorMessage('Generation timeout. The request is taking too long. Please try again.');
        return;
      }

      try {
        const response = await fetch(`/api/poll-fal?requestId=${requestId}`);
        
        if (!response.ok) {
          throw new Error(`Poll failed with status ${response.status}`);
        }

        const text = await response.text();
        if (!text) {
          console.warn("Received empty response from server, skipping this tick...");
          return;
        }

        const data = JSON.parse(text) as PollResponse;

        if (data.status === 'completed') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setImageUrl(data.image_url); 
          setStatus('complete');
          retryCountRef.current = 0;
          
          // Save to database
          if (data.image_url && currentJobIdRef.current && currentPromptRef.current) {
            saveConcept(currentPromptRef.current, data.image_url, currentJobIdRef.current);
          }
        } else if (data.status === 'failed') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setStatus('error');
          setErrorMessage('Render failed. Please try again with a different prompt.');
        }
      } catch (error) {
        console.error("Polling error:", error);
        retryCountRef.current++;
        
        // If we've exceeded max retries, stop polling
        if (retryCountRef.current >= MAX_RETRIES) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setStatus('error');
          setErrorMessage('Connection lost. Please check your network and try again.');
        }
      }
    };

    // Start polling
    poll(); // Initial poll
    pollIntervalRef.current = setInterval(poll, POLL_INTERVAL);
  };

  const pollAngleStatus = async (angle: AngleType, jobId: string) => {
    const poll = async () => {
      // Check timeout
      if (Date.now() - pollStartTimeRef.current > MAX_POLL_DURATION) {
        const interval = anglePollIntervalsRef.current.get(angle);
        if (interval) clearInterval(interval);
        
        // Mark this angle as failed
        setAngleImages(prev => prev.map(img => 
          img.angle === angle ? { ...img, status: 'failed' as const } : img
        ));
        
        // Check if all angles are done
        checkAllAnglesComplete();
        return;
      }

      try {
        const response = await fetch(`/api/poll?jobId=${jobId}`);
        
        if (!response.ok) {
          throw new Error(`Poll failed with status ${response.status}`);
        }

        const text = await response.text();
        if (!text) {
          console.warn(`Empty response for ${angle}, skipping...`);
          return;
        }

        const data = JSON.parse(text) as PollResponse;

        if (data.status === 'completed') {
          const interval = anglePollIntervalsRef.current.get(angle);
          if (interval) {
            clearInterval(interval);
            anglePollIntervalsRef.current.delete(angle);
          }
          
          // Only update if we have a valid image URL
          if (data.image_url) {
            setAngleImages(prev => prev.map(img => 
              img.angle === angle 
                ? { ...img, url: data.image_url as string, status: 'completed' as const } 
                : img
            ));
          } else {
            // Mark as failed if no URL
            setAngleImages(prev => prev.map(img => 
              img.angle === angle ? { ...img, status: 'failed' as const } : img
            ));
          }
          
          // Check if all angles are done
          checkAllAnglesComplete();
          
        } else if (data.status === 'failed') {
          const interval = anglePollIntervalsRef.current.get(angle);
          if (interval) {
            clearInterval(interval);
            anglePollIntervalsRef.current.delete(angle);
          }
          
          setAngleImages(prev => prev.map(img => 
            img.angle === angle ? { ...img, status: 'failed' as const } : img
          ));
          
          checkAllAnglesComplete();
        }
      } catch (error) {
        console.error(`Polling error for ${angle}:`, error);
      }
    };

    // Start polling for this angle
    poll(); // Initial poll
    const interval = setInterval(poll, POLL_INTERVAL);
    anglePollIntervalsRef.current.set(angle, interval);
  };

  const checkAllAnglesComplete = () => {
    setAngleImages(currentAngles => {
      const allDone = currentAngles.every(img => 
        img.status === 'completed' || img.status === 'failed'
      );
      
      if (allDone) {
        // Clear all remaining intervals
        anglePollIntervalsRef.current.forEach(interval => clearInterval(interval));
        anglePollIntervalsRef.current.clear();
        
        const anyCompleted = currentAngles.some(img => img.status === 'completed');
        const allCompleted = currentAngles.every(img => img.status === 'completed');
        
        if (allCompleted) {
          setStatus('complete');
          // Save multi-angle concept to database
          if (currentPromptRef.current) {
            saveMultiAngleConcept(currentPromptRef.current, currentAngles);
          }
        } else if (anyCompleted) {
          setStatus('complete'); // Partial success
          if (currentPromptRef.current) {
            saveMultiAngleConcept(currentPromptRef.current, currentAngles);
          }
        } else {
          setStatus('error');
          setErrorMessage('All angles failed. Please try again.');
        }
      }
      
      return currentAngles;
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      // Clear all angle polling intervals
      anglePollIntervalsRef.current.forEach(interval => clearInterval(interval));
      anglePollIntervalsRef.current.clear();
    };
  }, []);

  // Fetch generation history on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/gallery?limit=10');
      if (response.ok) {
        const data = await response.json();
        console.log('Gallery data fetched:', data.concepts?.length, 'concepts');
        // Debug: Log first concept structure
        if (data.concepts && data.concepts.length > 0) {
          console.log('First concept structure:', {
            hasImages: !!data.concepts[0].images,
            imagesLength: data.concepts[0].images?.length,
            hasImageUrl: !!data.concepts[0].image_url,
            prompt: data.concepts[0].prompt?.substring(0, 50),
          });
        }
        setHistory(data.concepts || []);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  // Keyboard shortcut: Ctrl/Cmd + Enter to generate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && prompt && status === 'idle') {
        e.preventDefault();
        generateConcept();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prompt, status]);

  const saveConcept = async (prompt: string, imageUrl: string, jobId: string) => {
    try {
      const body: any = {
        prompt,
        image_url: imageUrl,
        job_id: jobId,
        status: 'completed',
        metadata: {
          generation_time_ms: Date.now() - pollStartTimeRef.current,
          mode: generationMode,
        },
      };

      // Add source image URL for image-to-render mode
      if (generationMode === 'image-to-render' && uploadedImageUrlRef.current) {
        body.source_image_url = uploadedImageUrlRef.current;
      }

      const response = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        console.warn('Failed to save concept to gallery:', await response.text());
      } else {
        // Refresh history after successful save
        fetchHistory();
      }
    } catch (error) {
      console.error('Error saving concept:', error);
      // Non-blocking: user can still use the image even if save fails
    }
  };

  const saveMultiAngleConcept = async (prompt: string, images: AngleImage[]) => {
    try {
      const anyCompleted = images.some(img => img.status === 'completed');
      const allCompleted = images.every(img => img.status === 'completed');
      
      const payload = {
        prompt,
        images,
        status: allCompleted ? 'completed' : anyCompleted ? 'partial' : 'failed',
        metadata: {
          generation_time_ms: Date.now() - pollStartTimeRef.current,
          mode: generationMode, // Use actual mode (multi-angle or custom-angles)
          angle_count: images.length,
        },
      };
      
      console.log('Saving multi-angle concept:', {
        prompt: prompt.substring(0, 50),
        imageCount: images.length,
        completedCount: images.filter(i => i.status === 'completed').length,
        firstImageUrl: images[0]?.url?.substring(0, 50),
        mode: generationMode,
      });
      
      const response = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.warn('Failed to save multi-angle concept:', errorText);
      } else {
        const saved = await response.json();
        console.log('Multi-angle concept saved successfully:', saved.id);
        // Refresh history after successful save
        fetchHistory();
      }
    } catch (error) {
      console.error('Error saving multi-angle concept:', error);
    }
  };

  const loadFromHistory = (concept: Concept) => {
    setPrompt(concept.prompt);
    setErrorMessage(null);
    
    // Check if this is a multi-angle or custom-angle concept
    if (concept.images && concept.images.length > 0) {
      // Detect mode from metadata (defaults to 'multi-angle' if not specified)
      const mode = concept.metadata?.mode as typeof generationMode;
      if (mode === 'custom-angles' || mode === 'multi-angle') {
        setGenerationMode(mode);
      } else {
        setGenerationMode('multi-angle');
      }
      
      console.log('Loading from history:', {
        mode: mode || 'multi-angle',
        imageCount: concept.images.length,
        hasUrls: concept.images.every(img => !!img.url),
        firstUrl: concept.images[0]?.url?.substring(0, 50),
      });
      
      setAngleImages(concept.images);
      setImageUrl(null);
      setStatus('complete');
    } else if (concept.image_url) {
      // Single image concept
      setGenerationMode('single');
      setImageUrl(concept.image_url);
      setAngleImages([]);
      setStatus('complete');
      console.log('Loading single image from history:', concept.image_url.substring(0, 50));
    } else {
      // No images found
      console.warn('Concept has no images:', concept.id);
      setStatus('idle');
    }
    
    currentJobIdRef.current = concept.job_id || null;
    currentPromptRef.current = concept.prompt;
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `architectural-concept-${Date.now()}.jpg`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-6 font-sans">
      <div className="max-w-7xl w-full flex gap-6">
        {/* Main Content Area */}
        <div className="flex-1 bg-neutral-800/50 backdrop-blur-xl border border-neutral-700 rounded-2xl p-8 shadow-2xl">
          
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl text-neutral-100 font-light mb-2 tracking-wide">
                Architectural <span className="font-semibold text-emerald-400">Agent</span>
              </h1>
              <p className="text-neutral-400">Describe your vision, and the agent will draft the concept.</p>
            </div>
            <a
              href="/gallery"
              className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-lg transition-all text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Gallery
            </a>
          </div>

        <div className="space-y-4">
          {/* Mode Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-900/50 rounded-lg border border-neutral-700">
            <button
              onClick={() => setGenerationMode('single')}
              className={`py-2 px-4 rounded-md transition-all text-sm font-medium ${
                generationMode === 'single'
                  ? 'bg-emerald-600 text-white'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Single Image
            </button>
            <button
              onClick={() => setGenerationMode('multi-angle')}
              className={`py-2 px-4 rounded-md transition-all text-sm font-medium ${
                generationMode === 'multi-angle'
                  ? 'bg-emerald-600 text-white'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              4-Angle View
            </button>
            <button
              onClick={() => setGenerationMode('custom-angles')}
              className={`py-2 px-4 rounded-md transition-all text-sm font-medium ${
                generationMode === 'custom-angles'
                  ? 'bg-emerald-600 text-white'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              ✨ Custom Angles
            </button>
            <button
              onClick={() => setGenerationMode('image-to-render')}
              className={`py-2 px-4 rounded-md transition-all text-sm font-medium ${
                generationMode === 'image-to-render'
                  ? 'bg-emerald-600 text-white'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Image-to-Render
            </button>
          </div>

          {/* Image Upload (only for Image-to-Render mode) */}
          {generationMode === 'image-to-render' && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-neutral-300">
                Upload Revit View (Hidden Line / Shaded)
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadedImage(file);
                      // Create preview URL
                      const previewUrl = URL.createObjectURL(file);
                      setUploadedImageUrl(previewUrl);
                    }
                  }}
                  disabled={status === 'generating' || isUploading}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file && file.type.startsWith('image/')) {
                      setUploadedImage(file);
                      const previewUrl = URL.createObjectURL(file);
                      setUploadedImageUrl(previewUrl);
                    }
                  }}
                  className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl hover:border-emerald-500 transition-all cursor-pointer bg-neutral-900/30 ${
                    isDragging ? 'border-emerald-500 bg-emerald-500/10' : 'border-neutral-700'
                  }`}
                >
                  {uploadedImageUrl ? (
                    <div className="relative w-full h-full p-2">
                      <img
                        src={uploadedImageUrl}
                        alt="Uploaded preview"
                        className="w-full h-full object-contain rounded-lg"
                      />
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setUploadedImage(null);
                          setUploadedImageUrl(null);
                          uploadedImageUrlRef.current = null;
                        }}
                        className="absolute top-3 right-3 bg-red-600 hover:bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <>
                      <svg className="w-10 h-10 text-neutral-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm text-neutral-400">Click to upload or drag and drop</p>
                      <p className="text-xs text-neutral-500 mt-1">PNG, JPG up to 10MB</p>
                    </>
                  )}
                </label>
              </div>
              
              {/* Disclaimer */}
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-xs text-amber-200">
                  <strong>AI-Enhanced Visualization:</strong> The AI may adjust perspective for visual appeal. For strict architectural accuracy, upload 3D perspective views rather than flat elevations.
                </div>
              </div>
            </div>
          )}

          {/* Custom Angles Configuration */}
          {generationMode === 'custom-angles' && (
            <div className="space-y-3 p-4 bg-neutral-900/50 border border-neutral-700 rounded-xl">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-neutral-300">
                  Configure Custom Angles ({customAngles.length})
                </label>
                <button
                  onClick={() => setCustomAngles([...customAngles, { name: '', description: '' }])}
                  className="px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-all"
                >
                  + Add Angle
                </button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {customAngles.map((angle, index) => (
                  <div key={index} className="flex gap-2 items-start p-2 bg-neutral-800/50 rounded-lg">
                    <div className="flex-1 space-y-1">
                      <input
                        type="text"
                        placeholder="Name (e.g., Street Level)"
                        value={angle.name}
                        onChange={(e) => {
                          const updated = [...customAngles];
                          if (updated[index]) {
                            updated[index].name = e.target.value;
                            setCustomAngles(updated);
                          }
                        }}
                        className="w-full px-2 py-1 text-sm bg-neutral-900 border border-neutral-700 rounded text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                      />
                      <input
                        type="text"
                        placeholder="Description (e.g., street level view)"
                        value={angle.description}
                        onChange={(e) => {
                          const updated = [...customAngles];
                          if (updated[index]) {
                            updated[index].description = e.target.value;
                            setCustomAngles(updated);
                          }
                        }}
                        className="w-full px-2 py-1 text-sm bg-neutral-900 border border-neutral-700 rounded text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    {customAngles.length > 1 && (
                      <button
                        onClick={() => setCustomAngles(customAngles.filter((_, i) => i !== index))}
                        className="mt-1 text-red-400 hover:text-red-300 text-sm"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-neutral-500">
                First angle establishes the design. Others will reference it for coherence.
              </p>
            </div>
          )}

          <div className="relative">
            <textarea
              className="w-full bg-neutral-900/50 border border-neutral-700 rounded-xl p-4 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none"
              rows={4}
              placeholder={
                generationMode === 'image-to-render'
                  ? "e.g., Photorealistic render with luxury materials, warm natural lighting, high-end finishes..."
                  : "e.g., A minimalist tropical resort with timber cladding and infinity pools..."
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={status === 'generating'}
              maxLength={MAX_PROMPT_LENGTH}
            />
            <div className="absolute bottom-2 right-2 text-xs text-neutral-500">
              {prompt.length}/{MAX_PROMPT_LENGTH}
            </div>
          </div>

          <button
            onClick={generateConcept}
            disabled={
              status === 'generating' || 
              isUploading ||
              !prompt || 
              prompt.trim().length < MIN_PROMPT_LENGTH ||
              (generationMode === 'image-to-render' && !uploadedImage)
            }
            className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            title="Ctrl/Cmd + Enter"
          >
            {status === 'generating' ? (
              <span className="animate-pulse">{loadingText}</span>
            ) : isUploading ? (
              <span className="animate-pulse">Uploading image...</span>
            ) : (
              "Generate Concept"
            )}
          </button>
        </div>

        {/* Error Message */}
        {status === 'error' && errorMessage && (
          <div className="mt-6 p-4 bg-red-900/20 border border-red-700 rounded-lg">
            <p className="text-red-300 text-sm">{errorMessage}</p>
            <button
              onClick={() => { setStatus('idle'); setErrorMessage(null); }}
              className="mt-2 text-red-400 hover:text-red-300 text-xs underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Single Image Display */}
        {(generationMode === 'single' || generationMode === 'image-to-render') && imageUrl && status === 'complete' && (
          <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
            <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-neutral-700 shadow-2xl">
              <img 
                src={imageUrl} 
                alt="Generated Architectural Concept" 
                className="object-contain w-full h-full bg-neutral-900"
              />
            </div>
            
            {/* Action Buttons Below Image */}
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleDownload}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-all flex justify-center items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                Download Image
              </button>
              <button
                onClick={() => { 
                  setStatus('idle'); 
                  setImageUrl(null); 
                  setPrompt(''); 
                  uploadedImageUrlRef.current = null;
                }}
                className="flex-1 py-3 rounded-xl bg-neutral-700 hover:bg-neutral-600 text-neutral-200 font-medium transition-all"
              >
                Generate Another
              </button>
            </div>
          </div>
        )}

        {/* Multi-Angle or Custom-Angle Grid Display */}
        {(generationMode === 'multi-angle' || generationMode === 'custom-angles') && angleImages.length > 0 && status === 'complete' && (
          <div className="mt-8 animate-in fade-in-slide-in-from-bottom-4 duration-700 ease-out">
            <div className={`grid gap-4 ${angleImages.length <= 2 ? 'grid-cols-1 md:grid-cols-2' : angleImages.length === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-2'}`}>
              {angleImages.map((angleData) => {
                const angle = angleData.angle;
                const isCompleted = angleData?.status === 'completed';
                const isFailed = angleData?.status === 'failed';
                
                return (
                  <div 
                    key={angle}
                    className="relative aspect-video rounded-xl overflow-hidden border border-neutral-700 shadow-xl bg-neutral-900"
                  >
                    {isCompleted && angleData?.url ? (
                      <img 
                        src={angleData.url} 
                        alt={`${angleData.customLabel || getAngleDisplayName(angle)} View`} 
                        className="object-cover w-full h-full"
                      />
                    ) : isFailed ? (
                      <div className="flex flex-col items-center justify-center h-full text-red-400">
                        <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <p className="text-sm">Failed</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <div className="animate-spin mb-2 w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
                        <p className="text-neutral-400 text-sm animate-pulse">
                          {angleData?.customLabel ? `Generating ${angleData.customLabel}...` : getAngleLoadingMessage(angle)}
                        </p>
                      </div>
                    )}
                    
                    {/* Angle Label */}
                    <div className="absolute top-2 left-2 px-3 py-1 bg-neutral-900/80 backdrop-blur-sm rounded-full border border-neutral-700">
                      <span className="text-xs font-medium text-neutral-200">
                        {angleData?.customLabel || getAngleDisplayName(angle)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Animation Controls */}
            {status === 'complete' && angleImages.length > 1 && (
              <div className="mt-6 p-4 bg-neutral-800/50 rounded-xl border border-neutral-700">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setIsAnimating(!isAnimating);
                        if (!isAnimating) {
                          setCurrentAnimationIndex(0);
                        }
                      }}
                      className={`p-3 rounded-lg transition-all ${isAnimating ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white`}
                      title={isAnimating ? 'Pause Animation' : 'Play Animation'}
                    >
                      {isAnimating ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>
                    
                    <div className="flex flex-col">
                      <span className="text-xs text-neutral-400 mb-1">Speed</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setAnimationSpeed(Math.max(1, animationSpeed - 0.5))}
                          className="px-2 py-1 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded text-xs transition-all"
                        >
                          −
                        </button>
                        <span className="text-sm text-neutral-200 w-12 text-center">{animationSpeed}s</span>
                        <button
                          onClick={() => setAnimationSpeed(Math.min(10, animationSpeed + 0.5))}
                          className="px-2 py-1 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded text-xs transition-all"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="p-3 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-neutral-200 transition-all"
                    title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Presentation'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {isFullscreen ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      )}
                    </svg>
                  </button>
                </div>
                
                {isAnimating && (
                  <div className="mt-3 text-center">
                    <p className="text-xs text-emerald-400">
                      🎬 Playing: {angleImages[currentAnimationIndex]?.customLabel || getAngleDisplayName(angleImages[currentAnimationIndex]?.angle as any)} ({currentAnimationIndex + 1}/{angleImages.length})
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Fullscreen Animation View */}
            {isFullscreen && (
              <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
                {/* Close Button */}
                <button
                  onClick={() => {
                    setIsFullscreen(false);
                    setIsAnimating(false);
                  }}
                  className="absolute top-4 right-4 p-3 bg-neutral-800/80 hover:bg-neutral-700 rounded-lg text-white transition-all z-10"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                
                {/* Navigation Controls */}
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4 bg-neutral-900/90 backdrop-blur-md px-6 py-4 rounded-xl z-10">
                  <button
                    onClick={() => setCurrentAnimationIndex((prev) => (prev - 1 + angleImages.length) % angleImages.length)}
                    className="p-2 hover:bg-neutral-700 rounded-lg text-white transition-all"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={() => setIsAnimating(!isAnimating)}
                    className={`p-3 rounded-lg transition-all ${isAnimating ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white`}
                  >
                    {isAnimating ? (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>
                  
                  <button
                    onClick={() => setCurrentAnimationIndex((prev) => (prev + 1) % angleImages.length)}
                    className="p-2 hover:bg-neutral-700 rounded-lg text-white transition-all"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  
                  <div className="ml-4 text-sm text-white">
                    {currentAnimationIndex + 1} / {angleImages.length}
                  </div>
                </div>
                
                {/* Current Image */}
                <div className="relative w-full h-full flex items-center justify-center p-8">
                  {angleImages[currentAnimationIndex] && (
                    <div className="relative max-w-7xl max-h-full">
                      <img
                        src={angleImages[currentAnimationIndex].url || ''}
                        alt={angleImages[currentAnimationIndex].customLabel || getAngleDisplayName(angleImages[currentAnimationIndex].angle as any)}
                        className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl transition-opacity duration-500"
                        style={{ opacity: isAnimating ? 1 : 0.95 }}
                      />
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-6 py-3 bg-black/70 backdrop-blur-sm rounded-full">
                        <span className="text-white font-medium text-lg">
                          {angleImages[currentAnimationIndex].customLabel || getAngleDisplayName(angleImages[currentAnimationIndex].angle as any)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Action Buttons Below Grid */}
            {status === 'complete' && (
              <div className="mt-4 flex gap-3">
                {angleImages.length > 1 && (
                  <button
                    onClick={() => {
                      setIsFullscreen(true);
                      setIsAnimating(true);
                      setCurrentAnimationIndex(0);
                    }}
                    className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium transition-all flex justify-center items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Present
                  </button>
                )}
                <button
                  onClick={async () => {
                    // Download all completed images sequentially
                    const completedImages = angleImages.filter(img => img.status === 'completed' && img.url);
                    
                    // Use a simple sequential approach with direct links
                    for (let i = 0; i < completedImages.length; i++) {
                      const img = completedImages[i];
                      if (!img || !img.url) continue;
                      
                      try {
                        // Create download link (direct URL - no CORS issues)
                        const link = document.createElement('a');
                        link.href = img.url;
                        link.download = `architectural-concept-${img.customLabel || img.angle}.jpg`;
                        link.target = '_blank'; // Open in new tab as fallback
                        link.rel = 'noopener noreferrer';
                        
                        // Trigger download
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        
                        // Wait before next download to avoid browser blocking
                        if (i < completedImages.length - 1) {
                          await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                      } catch (error) {
                        console.error('Failed to download image:', error);
                      }
                    }
                  }}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-all flex justify-center items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  Download All
                </button>
                <button
                  onClick={() => { setStatus('idle'); setAngleImages([]); setPrompt(''); }}
                  className="flex-1 py-3 rounded-xl bg-neutral-700 hover:bg-neutral-600 text-neutral-200 font-medium transition-all"
                >
                  Generate Another
                </button>
              </div>
            )}
          </div>
        )}
        </div>

        {/* History Sidebar */}
        <div className={`${showHistory ? 'w-80' : 'w-12'} transition-all duration-300 bg-neutral-800/50 backdrop-blur-xl border border-neutral-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden`}>
          {/* History Header */}
          <div className={`${showHistory ? 'p-4' : 'p-2'} border-b border-neutral-700 flex ${showHistory ? 'justify-between' : 'justify-center'} items-center`}>
            {showHistory && (
              <h2 className="text-lg text-neutral-100 font-medium">Recent</h2>
            )}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 hover:bg-neutral-700 rounded-lg transition-all text-neutral-400 hover:text-neutral-200 shrink-0"
              title={showHistory ? 'Collapse History' : 'Expand History'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {showHistory ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                )}
              </svg>
            </button>
          </div>

          {/* History List */}
          {showHistory && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {history.length === 0 ? (
                <p className="text-neutral-500 text-sm text-center py-8">No history yet</p>
              ) : (
                history.map((concept) => (
                  <button
                    key={concept.id}
                    onClick={() => loadFromHistory(concept)}
                    className="w-full text-left p-3 bg-neutral-900/50 hover:bg-neutral-700/50 border border-neutral-700 rounded-lg transition-all group"
                  >
                    {/* Thumbnail */}
                    <div className="aspect-video w-full rounded overflow-hidden mb-2 bg-neutral-800">
                      {concept.images && concept.images.length > 0 ? (
                        // Multi-angle concept: show 2x2 grid
                        <div className="grid grid-cols-2 gap-0.5 w-full h-full">
                          {concept.images.slice(0, 4).map((img, idx) => (
                            <div key={idx} className="relative bg-neutral-900">
                              {img.status === 'completed' && img.url ? (
                                <img 
                                  src={img.url} 
                                  alt={img.customLabel || img.angle}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  onError={(e) => {
                                    console.error('Gallery image failed to load:', img.url);
                                    e.currentTarget.style.display = 'none';
                                    const parent = e.currentTarget.parentElement;
                                    if (parent) {
                                      parent.innerHTML = '<div class="w-full h-full flex items-center justify-center"><span class="text-neutral-600 text-xs">✕</span></div>';
                                    }
                                  }}
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
                                  <span className="text-neutral-600 text-xs">-</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        // Single image concept
                        concept.image_url ? (
                          <img 
                            src={concept.image_url} 
                            alt={concept.prompt}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              console.error('Gallery single image failed to load:', concept.image_url);
                              e.currentTarget.style.display = 'none';
                              const parent = e.currentTarget.parentElement;
                              if (parent) {
                                parent.innerHTML = '<div class="w-full h-full bg-neutral-900 flex items-center justify-center"><span class="text-neutral-600 text-xs">Image unavailable</span></div>';
                              }
                            }}
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
                            <span className="text-neutral-600 text-xs">No image</span>
                          </div>
                        )
                      )}
                    </div>
                    
                    {/* Prompt Text */}
                    <p className="text-neutral-300 text-xs line-clamp-2 mb-1">
                      {concept.prompt}
                    </p>
                    
                    {/* Timestamp */}
                    <p className="text-neutral-500 text-xs">
                      {new Date(concept.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}