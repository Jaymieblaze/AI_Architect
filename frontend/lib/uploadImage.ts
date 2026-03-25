import { getSupabase } from './supabase/client';

export interface UploadImageResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload an image file to Supabase Storage
 * @param file - The image file to upload
 * @param bucket - The storage bucket name (default: 'uploads')
 * @returns Promise with upload result containing public URL
 */
export async function uploadImage(
  file: File,
  bucket: string = 'uploads'
): Promise<UploadImageResult> {
  try {
    const supabase = getSupabase();
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `user-uploads/${fileName}`;

    // Upload file
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return {
      success: true,
      url: publicUrl
    };

  } catch (error) {
    console.error('Unexpected error during upload:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
