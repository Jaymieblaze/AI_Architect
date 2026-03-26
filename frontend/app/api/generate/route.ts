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
  const payload: any = {
    prompt,
    model: 'krea-ai',
    width: 1024,
    height: 1024,
    num_outputs: 1,
  };

  // Add seed if provided
  if (seed !== undefined) {
    payload.seed = seed;
  }

  // Add image URLs for img2img workflow
  if (imageUrls && imageUrls.length > 0) {
    payload.image = imageUrls[0]; // KREA uses first image as base
    payload.strength = 0.7; // Transformation strength
  }

  const response = await fetch('https://api.krea.ai/jobs', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`KREA API error [${response.status}]:`, errorText);
    throw new Error(`KREA API returned ${response.status}`);
  }

  const data = await response.json();
  return data.id;
}

/**
 * Generate multiple angles via KREA API
 */
async function generateMultiAngle(
  apiKey: string,
  prompt: string,
  imageUrls?: string[],
  seed?: number
): Promise<Array<{ angle: AngleType; job_id: string }>> {
  const baseSeed = seed || Math.floor(Math.random() * 1000000);
  
  const jobPromises = PRESET_ANGLES.map(async (angle, index) => {
    const anglePrompt = `${prompt}, ${angle} view, architectural visualization`;
    const angleSeed = baseSeed + index; // Consistent but varied seeds
    
    const jobId = await generateSingleImage(apiKey, anglePrompt, imageUrls, angleSeed);
    
    return { angle, job_id: jobId };
  });

  return Promise.all(jobPromises);
}