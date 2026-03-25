-- Migration: Add image-to-render support to concepts table
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/xtdekvmlwlrcmkakdyio/editor)

-- Add source_image_url column for image-to-render mode
ALTER TABLE concepts 
  ADD COLUMN IF NOT EXISTS source_image_url TEXT;

-- Update comment
COMMENT ON COLUMN concepts.source_image_url IS 'Source image URL for image-to-render mode (uploaded Revit view)';

-- Verify the migration
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'concepts' 
ORDER BY ordinal_position;
