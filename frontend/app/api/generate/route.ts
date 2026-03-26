import { NextResponse } from 'next/server';
import type { GenerateRequest, GenerateResponse, ErrorResponse } from '@/types/api';
import type { AngleType } from '@/types/database';

// Force dynamic rendering (no static optimization)
export const dynamic = 'force-dynamic';

// Define angle configurations
const PRESET_ANGLES: AngleType[] = ['exterior', 'interior', 'aerial', 'detail'];

export async function POST(request: Request) {
  try {
    const body = await request.json() as GenerateRequest;

    // Validate input
    if (!body.user_prompt || typeof body.user_prompt !== 'string') {
      return NextResponse.json<ErrorResponse>(
        { error: 'Invalid prompt: user_prompt is required and must be a string' },
        { status: 400 }
      );
    }

    const trimmedPrompt = body.user_prompt.trim();
    if (trimmedPrompt.length < 10) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Prompt too short: minimum 10 characters required' },
        { status: 400 }
      );
    }

    if (trimmedPrompt.length > 500) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Prompt too long: maximum 500 characters allowed' },
        { status: 400 }
      );
    }

    const kreaApiKey = process.env.KREA_API_KEY;
    
    if (!kreaApiKey) {
      console.error('🚨 CRITICAL: KREA_API_KEY is missing!');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const mode = body.mode || 'single';
    
    // Single image generation
    if (mode === 'single') {
      const jobId = await generateSingleImage(kreaApiKey, trimmedPrompt, body.imageUrls, body.seed);
      return NextResponse.json<GenerateResponse>({ 
        job_id: jobId, 
        mode: 'single' 
      });
    }

    // Multi-angle generation
    if (mode === 'multi-angle') {
      const jobIds = await generateMultiAngle(kreaApiKey, trimmedPrompt, body.imageUrls, body.seed);
      return NextResponse.json<GenerateResponse>({ 
        job_ids: jobIds, 
        mode: 'multi-angle' 
      });
    }

    return NextResponse.json<ErrorResponse>(
      { error: 'Invalid mode' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error("KREA API Error:", error);
    return NextResponse.json<ErrorResponse>(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}

/**
 * Generate a single image via KREA API
 */
async function generateSingleImage(
  apiKey: string, 
  prompt: string, 
  imageUrls?: string[],
  seed?: number
): Promise<string> {
  // Build the request body for Krea API
  // Using n8n workflow resolution for better quality
  const kreaRequestBody: any = {
    prompt,
    width: 1376,
    height: 768,
  };

  // Determine endpoint and parameters based on whether img2img is needed
  let endpoint = 'https://api.krea.ai/generate/image/bfl/flux-1-dev';
  
  if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) {
    // Download image and convert to base64 (Krea requires base64 data URIs)
    const imageUrl = imageUrls[0]!; // Safe: we checked length > 0
    console.log('📥 Downloading image from:', imageUrl);
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const mimeType = imageResponse.headers.get('content-type') || 'image/png';
    const dataUri = `data:${mimeType};base64,${base64Image}`;
    
    console.log(`✅ Image converted to base64 (${Math.round(base64Image.length / 1024)}KB)`);
    
    // Use Nano Banana Pro for img2img
    endpoint = 'https://api.krea.ai/generate/image/google/nano-banana-pro';
    kreaRequestBody.imageUrls = [dataUri];
    
    // imagePromptStrengths controls adherence (0-100 scale)
    // 80 = strong reference adherence
    kreaRequestBody.imagePromptStrengths = [80];
    
    kreaRequestBody.prompt = `Reference image shows exact building geometry to preserve. ${prompt}`;
    // Note: Nano Banana Pro doesn't use steps parameter
  } else {
    // Use Flux for text-to-image
    kreaRequestBody.steps = 28;
    if (seed !== undefined && seed !== null) {
      kreaRequestBody.seed = seed;
    }
  }

  console.log('🔍 KREA API Request to', endpoint);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(kreaRequestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`KREA API error [${response.status}]:`, errorText);
    throw new Error(`KREA API returned ${response.status}`);
  }

  const data = await response.json();
  console.log('✅ KREA API Response:', JSON.stringify(data, null, 2));
  
  // Return the job_id from KREA's response
  if (!data.job_id) {
    throw new Error('KREA API did not return a job_id');
  }
  return data.job_id;
}

/**
 * Generate multiple angles via KREA API with sequential image references
 * Matches n8n workflow strategy: each angle uses previous completed angle(s) as reference
 */
async function generateMultiAngle(
  apiKey: string,
  prompt: string,
  imageUrls?: string[],
  seed?: number
): Promise<Array<{ angle: AngleType; job_id: string }>> {
  const baseSeed = seed || Math.floor(Math.random() * 1000000);
  const results: Array<{ angle: AngleType; job_id: string }> = [];
  const completedImageUrls: string[] = [];
  
  // Generate angles sequentially, using previous completed angles as references
  for (let index = 0; index < PRESET_ANGLES.length; index++) {
    const angle = PRESET_ANGLES[index]!; // Safe: we're iterating within bounds
    const anglePrompt = `${prompt}, ${angle} view, architectural visualization`;
    const angleSeed = baseSeed + index;
    
    // For first angle: use input imageUrls (if provided) or generate from text
    // For subsequent angles: use previously completed angle(s) as reference
    let referenceUrls = imageUrls;
    if (index > 0 && completedImageUrls.length > 0) {
      // Use the most recent completed angle as primary reference
      // For detail view (index 3), could use multiple previous angles
      referenceUrls = index === 3 && completedImageUrls.length >= 2
        ? [completedImageUrls[0]!, completedImageUrls[2]!] // exterior + aerial
        : [completedImageUrls[index - 1]!]; // previous angle
    }
    
    const jobId = await generateSingleImage(apiKey, anglePrompt, referenceUrls, angleSeed);
    results.push({ angle, job_id: jobId });
    
    // Poll until this angle completes before starting next one
    // This ensures we have the image URL to use as reference
    if (index < PRESET_ANGLES.length - 1) {
      console.log(`⏳ Waiting for ${angle} to complete before generating next angle...`);
      const completedUrl = await pollUntilComplete(apiKey, jobId);
      completedImageUrls.push(completedUrl);
      
      // Add 2 second delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return results;
}

/**
 * Poll a KREA job until it completes and return the image URL
 */
async function pollUntilComplete(
  apiKey: string,
  jobId: string,
  maxAttempts: number = 60
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`https://api.krea.ai/jobs/${jobId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Failed to poll job ${jobId}: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status === 'completed') {
      // Construct image URL
      const imageUrl = data.result?.urls?.[0] || `https://app-uploads.krea.ai/public/${jobId}-image.jpeg`;
      console.log(`✅ Job ${jobId} completed: ${imageUrl}`);
      return imageUrl;
    }
    
    if (data.status === 'failed') {
      throw new Error(`Job ${jobId} failed`);
    }
    
    // Wait 2 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error(`Job ${jobId} timed out after ${maxAttempts} attempts`);
}