import { NextResponse } from 'next/server';

// 🔥 THE FIX: Tell Next.js this is a dynamic route and should NEVER be cached
export const dynamic = 'force-dynamic'; 

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
  }

  try {
    const kreaKey = process.env.KREA_API_KEY;
    
    if (!kreaKey) {
      console.error("🚨 CRITICAL: KREA_API_KEY is missing!");
      return NextResponse.json({ error: 'API Key missing on server' }, { status: 500 });
    }

    const response = await fetch(`https://api.krea.ai/jobs/${jobId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${kreaKey}`,
        'Content-Type': 'application/json',
      },
      // 🔥 THE FIX: Tell the fetch API to never cache Krea's response
      cache: 'no-store' 
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`🚨 KREA API ERROR [${response.status}]:`, errorText);
      return NextResponse.json({ error: `Krea returned ${response.status}` }, { status: 500 });
    }

    const data = await response.json();
    
    return NextResponse.json({
      status: data.status,
      image_url: data.result?.urls?.[0] || null
    });
    
  } catch (error) {
    console.error("🚨 NEXT.JS SERVER ERROR:", error);
    return NextResponse.json({ error: 'Failed to poll Krea' }, { status: 500 });
  }
}