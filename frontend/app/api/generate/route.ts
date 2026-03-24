import { NextResponse } from 'next/server';
import type { GenerateRequest, GenerateResponse, ErrorResponse } from '@/types/api';

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

    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.error('🚨 CRITICAL: N8N_WEBHOOK_URL is missing!');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // The Next.js server securely talks to n8n's webhook
    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!n8nResponse.ok) {
      throw new Error(`n8n responded with status: ${n8nResponse.status}`);
    }

    const data = await n8nResponse.json() as GenerateResponse;
    return NextResponse.json<GenerateResponse>(data);
    
  } catch (error) {
    console.error("n8n Connection Error:", error);
    return NextResponse.json<ErrorResponse>(
      { error: 'Failed to contact architectural agent' },
      { status: 500 }
    );
  }
}