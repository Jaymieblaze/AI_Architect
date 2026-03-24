-- Migration: Add multi-angle image support to concepts table
-- Run this in Supabase SQL Editor if you have existing data

-- Add new columns
ALTER TABLE concepts 
  ALTER COLUMN image_url DROP NOT NULL,
  ALTER COLUMN job_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS images JSONB;

-- Update comments
COMMENT ON COLUMN concepts.image_url IS 'Legacy: URL to single generated image (nullable for multi-angle)';
COMMENT ON COLUMN concepts.job_id IS 'Legacy: Krea AI job ID for single image (nullable for multi-angle)';
COMMENT ON COLUMN concepts.images IS 'Multi-angle images: array of { angle, url, job_id, status }';

-- Example images structure:
-- [
--   { "angle": "exterior", "url": "https://...", "job_id": "abc123", "status": "completed" },
--   { "angle": "interior", "url": "https://...", "job_id": "def456", "status": "completed" },
--   { "angle": "aerial", "url": "https://...", "job_id": "ghi789", "status": "completed" },
--   { "angle": "detail", "url": "https://...", "job_id": "jkl012", "status": "completed" }
-- ]
