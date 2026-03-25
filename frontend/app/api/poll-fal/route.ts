import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestId = searchParams.get('requestId');

  if (!requestId) {
    return NextResponse.json(
      { error: 'Missing requestId' },
      { status: 400 }
    );
  }

  try {
    const falApiKey = process.env.FAL_API_KEY;
    
    if (!falApiKey) {
      console.error('🚨 CRITICAL: FAL_API_KEY is missing!');
      return NextResponse.json(
        { error: 'API Key missing on server' },
        { status: 500 }
      );
    }

    // Fal.ai queue status endpoint
    const response = await fetch(`https://queue.fal.run/fal-ai/flux-pro/requests/${requestId}/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${falApiKey}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`🚨 FAL.AI API ERROR [${response.status}]:`, errorText);
      return NextResponse.json(
        { error: `Fal.ai returned ${response.status}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    
    console.log('📊 Fal.ai Poll Response:', JSON.stringify(data, null, 2));
    
    // Fal.ai status mapping
    // Possible statuses: IN_QUEUE, IN_PROGRESS, COMPLETED, FAILED
    let mappedStatus: 'queued' | 'processing' | 'completed' | 'failed' = 'queued';
    
    if (data.status === 'IN_QUEUE') {
      mappedStatus = 'queued';
    } else if (data.status === 'IN_PROGRESS') {
      mappedStatus = 'processing';
    } else if (data.status === 'COMPLETED') {
      mappedStatus = 'completed';
    } else if (data.status === 'FAILED') {
      mappedStatus = 'failed';
    }

    // When completed, fetch the actual result from response_url
    let imageUrl = null;
    if (data.status === 'COMPLETED' && data.response_url) {
      console.log('✅ Job completed, fetching result from:', data.response_url);
      const resultResponse = await fetch(data.response_url, {
        method: 'GET',
        headers: {
          'Authorization': `Key ${falApiKey}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      });

      if (resultResponse.ok) {
        const resultData = await resultResponse.json();
        console.log('🖼️ Fal.ai Result:', JSON.stringify(resultData, null, 2));
        imageUrl = resultData.images?.[0]?.url || null;
      }
    }
    
    console.log(`🔄 Status: ${mappedStatus}, Image URL: ${imageUrl || 'none'}`);
    
    return NextResponse.json({
      status: mappedStatus,
      image_url: imageUrl
    });
    
  } catch (error) {
    console.error('🚨 NEXT.JS SERVER ERROR:', error);
    return NextResponse.json(
      { error: 'Failed to poll Fal.ai' },
      { status: 500 }
    );
  }
}
