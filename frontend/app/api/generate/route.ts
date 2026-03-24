import { NextResponse } from 'next/server';
import type { GenerateRequest, GenerateResponse, ErrorResponse } from '@/types/api';

export async function POST(request: Request) {
  try {
    const body = await request.json() as GenerateRequest;

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