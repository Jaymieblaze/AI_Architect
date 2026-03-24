import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // The Next.js server securely talks to n8n's PRODUCTION webhook
    const n8nResponse = await fetch('http://localhost:5678/webhook/generate-concept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!n8nResponse.ok) {
      throw new Error(`n8n responded with status: ${n8nResponse.status}`);
    }

    const data = await n8nResponse.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error("n8n Connection Error:", error);
    return NextResponse.json({ error: 'Failed to contact architectural agent' }, { status: 500 });
  }
}