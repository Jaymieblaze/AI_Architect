-- Create concepts table to store generated architectural designs

CREATE TABLE concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  prompt TEXT NOT NULL,
  image_url TEXT, -- Legacy: single image support (nullable for multi-angle)
  job_id TEXT, -- Legacy: single job ID (nullable for multi-angle)
  images JSONB, -- Multi-angle images: [{ angle, url, job_id }]
  status TEXT NOT NULL DEFAULT 'completed',
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index for faster queries
CREATE INDEX idx_concepts_created_at ON concepts(created_at DESC);
CREATE INDEX idx_concepts_job_id ON concepts(job_id);

-- Add Row Level Security (RLS) - Optional, enable if you add auth later
-- ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (you can restrict this later with auth)
-- CREATE POLICY "Allow all operations" ON concepts FOR ALL USING (true);

COMMENT ON TABLE concepts IS 'Stores AI-generated architectural concept images and prompts';
COMMENT ON COLUMN concepts.prompt IS 'User prompt that generated this concept';
COMMENT ON COLUMN concepts.image_url IS 'Legacy: URL to single generated image (nullable for multi-angle)';
COMMENT ON COLUMN concepts.job_id IS 'Legacy: Krea AI job ID for single image (nullable for multi-angle)';
COMMENT ON COLUMN concepts.images IS 'Multi-angle images: array of { angle, url, job_id, status }';
COMMENT ON COLUMN concepts.metadata IS 'Additional data: generation time, settings, etc.';
