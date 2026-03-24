import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { ErrorResponse } from '@/types/api';

export const dynamic = 'force-dynamic';

// DELETE: Remove a concept from gallery
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    const { error } = await supabase
      .from('concepts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase delete error:', error);
      return NextResponse.json<ErrorResponse>(
        { error: 'Failed to delete concept' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Concept delete error:', error);
    return NextResponse.json<ErrorResponse>(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
