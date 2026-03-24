'use client';

import { useState, useEffect, useRef } from 'react';
import type { GenerateResponse, PollResponse } from '@/types/api';

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
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(LOADING_PHRASES[0]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pollStartTimeRef = useRef<number>(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);

  useEffect(() => {
    if (status !== 'generating') return;
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % LOADING_PHRASES.length;
      setLoadingText(LOADING_PHRASES[i]);
    }, 2500);
    return () => clearInterval(interval);
  }, [status]);

  const generateConcept = async () => {
    if (!prompt || prompt.trim().length < MIN_PROMPT_LENGTH) {
      setErrorMessage(`Please enter at least ${MIN_PROMPT_LENGTH} characters to describe your concept.`);
      return;
    }
    
    if (prompt.length > MAX_PROMPT_LENGTH) {
      setErrorMessage(`Prompt is too long. Please keep it under ${MAX_PROMPT_LENGTH} characters.`);
      return;
    }

    setStatus('generating');
    setImageUrl(null);
    setErrorMessage(null);
    retryCountRef.current = 0;

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_prompt: prompt }),
      });
      
      if (!response.ok) {
        throw new Error("Backend failed to respond");
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
      pollStartTimeRef.current = Date.now();
      pollStatus(job_id);

    } catch (error) {
      console.error("Failed to start generation", error);
      setStatus('error');
      setErrorMessage("Failed to connect to the Architect Agent. Please try again.");
    }
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

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

  const handleDownload = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `architectural-concept-${Date.now()}.jpg`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-3xl w-full bg-neutral-800/50 backdrop-blur-xl border border-neutral-700 rounded-2xl p-8 shadow-2xl">
        
        <h1 className="text-3xl text-neutral-100 font-light mb-2 tracking-wide">
          Architectural <span className="font-semibold text-emerald-400">Agent</span>
        </h1>
        <p className="text-neutral-400 mb-8">Describe your vision, and the agent will draft the concept.</p>

        <div className="space-y-4">
          <div className="relative">
            <textarea
              className="w-full bg-neutral-900/50 border border-neutral-700 rounded-xl p-4 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none"
              rows={4}
              placeholder="e.g., A minimalist tropical resort with timber cladding and infinity pools..."
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
            disabled={status === 'generating' || !prompt || prompt.trim().length < MIN_PROMPT_LENGTH}
            className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            title="Ctrl/Cmd + Enter"
          >
            {status === 'generating' ? (
              <span className="animate-pulse">{loadingText}</span>
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

        {/* Image Reveal Section */}
        {imageUrl && status === 'complete' && (
          <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
            <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-neutral-700 shadow-2xl group">
              <img 
                src={imageUrl} 
                alt="Generated Architectural Concept" 
                className="object-cover w-full h-full"
              />
              {/* Overlay with download button */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
                <button
                  onClick={handleDownload}
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium shadow-lg"
                >
                  Download Image
                </button>
              </div>
            </div>
            <div className="mt-4 flex justify-between items-center">
              <button
                onClick={() => { setStatus('idle'); setImageUrl(null); setPrompt(''); }}
                className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                ← Generate Another
              </button>
              <span className="text-xs text-neutral-500">Right-click image to save</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}