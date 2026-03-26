import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { ConceptInsert } from '@/types/database';
import type { ErrorResponse } from '@/types/api';

export const dynamic = 'force-dynamic';

// GET: Fetch all concepts for gallery
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const supabase = createServerClient();

    const { data, error, count } = await supabase
      .from('concepts')
      .select('*', { count: 'exact' })
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json<ErrorResponse>(
        { error: 'Failed to fetch gallery' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      concepts: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Gallery fetch error:', error);
    return NextResponse.json<ErrorResponse>(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Save a new concept
export async function POST(request: Request) {
  try {
    const body = await request.json() as ConceptInsert;

    // Validate required fields - either single image OR multi-angle
    const hasPrompt = !!body.prompt;
    const hasSingleImage = !!(body.image_url && body.job_id);
    const hasMultiAngle = !!(body.images && Array.isArray(body.images) && body.images.length > 0);
    
    if (!hasPrompt || (!hasSingleImage && !hasMultiAngle)) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Missing required fields: prompt and (image_url + job_id OR images array)' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const insertData: any = {
      prompt: body.prompt,
      status: body.status || 'completed',
      metadata: body.metadata,
    };

    // Add single image fields if present
    if (body.image_url) {
      insertData.image_url = body.image_url;
    }
    if (body.job_id) {
      insertData.job_id = body.job_id;
    }

    // Add source_image_url for image-to-render mode
    if (body.source_image_url) {
      insertData.source_image_url = body.source_image_url;
    }

    // Add images array for multi-angle mode
    if (body.images) {
      insertData.images = body.images;
    }

    const { data, error } = await supabase
      .from('concepts')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json<ErrorResponse>(
        { error: 'Failed to save concept' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Concept save error:', error);
    return NextResponse.json<ErrorResponse>(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
