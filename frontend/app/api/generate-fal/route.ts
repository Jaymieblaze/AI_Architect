import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { user_prompt, seed, imageUrls } = await request.json();

    const falApiKey = process.env.FAL_API_KEY;

    if (!falApiKey) {
      console.error('🚨 CRITICAL: FAL_API_KEY is missing!');
      return NextResponse.json(
        { error: 'API Key missing on server' },
        { status: 500 }
      );
    }

    // Build the request body for Fal.ai Flux Ultra
    const falRequestBody: any = {
      prompt: user_prompt,
      aspect_ratio: '16:9',
      num_images: 1,
      output_format: 'jpeg',
      safety_tolerance: '2',
    };

    // Use Flux Ultra img2img for architecture (preserves structure better)
    let endpoint = 'https://queue.fal.run/fal-ai/flux-pro/v1.1-ultra';
    
    if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) {
      // Download image and convert to base64
      console.log('📥 Downloading image from:', imageUrls[0]);
      const imageResponse = await fetch(imageUrls[0]);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: ${imageResponse.status}`);
      }
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');
      const mimeType = imageResponse.headers.get('content-type') || 'image/png';
      const dataUri = `data:${mimeType};base64,${base64Image}`;
      
      console.log(`✅ Image converted to base64 (${Math.round(base64Image.length / 1024)}KB)`);
      
      // Add img2img parameters - HIGH image_prompt_strength preserves geometry
      falRequestBody.image_url = dataUri;
      falRequestBody.image_prompt_strength = 0.95; // 0.95 = strongly preserve structure
      
      console.log('🏗️ Image-to-render mode: HIGH structure preservation (0.95)');
    }

    if (seed !== undefined && seed !== null) {
      falRequestBody.seed = seed;
    }

    console.log('🔍 Fal.ai API Request to', endpoint);
    console.log(JSON.stringify({ ...falRequestBody, image_url: falRequestBody.image_url ? '<base64-data>' : undefined }, null, 2));

    // Call Fal.ai API
    const falResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...falRequestBody,
        webhook_url: undefined, // Not using webhooks for now
      }),
    });

    if (!falResponse.ok) {
      const errorText = await falResponse.text();
      console.error('❌ Fal.ai API Error:', falResponse.status, errorText);
      throw new Error(`Fal.ai API responded with status: ${falResponse.status}`);
    }

    const data = await falResponse.json();
    console.log('✅ Fal.ai API Response:', JSON.stringify(data, null, 2));

    // Fal.ai returns job immediately - check if queued or completed
    if (data.request_id) {
      // Job is queued, return request_id for polling
      return NextResponse.json({
        job_id: data.request_id,
        status: 'queued',
      });
    } else if (data.images && data.images.length > 0) {
      // Job completed immediately
      return NextResponse.json({
        job_id: null,
        status: 'completed',
        image_url: data.images[0].url,
      });
    } else {
      throw new Error('Unexpected Fal.ai response format');
    }
  } catch (error) {
    console.error('❌ Fal.ai Connection Error:', error);
    return NextResponse.json(
      { error: 'Failed to contact Fal.ai' },
      { status: 500 }
    );
  }
}
