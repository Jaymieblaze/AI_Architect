import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_prompt, imageUrls, seed } = body;

    // Validate input
    if (!user_prompt || typeof user_prompt !== 'string') {
      return NextResponse.json(
        { error: 'Invalid prompt: user_prompt is required' },
        { status: 400 }
      );
    }

    const kreaApiKey = process.env.KREA_API_KEY;
    
    if (!kreaApiKey) {
      console.error('🚨 CRITICAL: KREA_API_KEY is missing!');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Build the request body for Krea API
    const kreaRequestBody: any = {
      prompt: user_prompt,
      width: 1024,
      height: 576,
    };

    // Determine endpoint and parameters based on whether img2img is needed
    let endpoint = 'https://api.krea.ai/generate/image/bfl/flux-1-dev';
    
    if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) {
      // Download image and convert to base64 (Krea might reject external URLs)
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
      
      // Use Nano Banana Pro for img2img (docs example uses this)
      endpoint = 'https://api.krea.ai/generate/image/google/nano-banana-pro';
      kreaRequestBody.imageUrls = [dataUri];
      kreaRequestBody.prompt = `Reference image shows exact building geometry to preserve. ${user_prompt}`; // Emphasize reference importance
      // Note: Nano Banana Pro doesn't use steps parameter
    } else {
      // Use Flux for text-to-image
      kreaRequestBody.steps = 28;
      if (seed !== undefined && seed !== null) {
        kreaRequestBody.seed = seed;
      }
    }

    console.log('🔍 Direct Krea API Request to', endpoint);
    console.log(JSON.stringify({ ...kreaRequestBody, imageUrls: kreaRequestBody.imageUrls ? ['<base64-data>'] : undefined }, null, 2));

    // Call Krea API directly
    const kreaResponse = await fetch(endpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${kreaApiKey}`,
      },
      body: JSON.stringify(kreaRequestBody),
    });

    if (!kreaResponse.ok) {
      const errorText = await kreaResponse.text();
      console.error('❌ Krea API Error:', kreaResponse.status, errorText);
      throw new Error(`Krea API responded with status: ${kreaResponse.status}`);
    }

    const data = await kreaResponse.json();
    console.log('✅ Krea API Response:', JSON.stringify(data, null, 2));
    
    return NextResponse.json({ data: JSON.stringify(data) });
    
  } catch (error) {
    console.error("❌ Krea API Connection Error:", error);
    return NextResponse.json(
      { error: 'Failed to contact Krea AI' },
      { status: 500 }
    );
  }
}
