-- Create concepts table to store generated architectural designs

CREATE TABLE concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  prompt TEXT NOT NULL,
  image_url TEXT NOT NULL,
  job_id TEXT NOT NULL,
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
COMMENT ON COLUMN concepts.image_url IS 'URL to the generated image (from Krea AI)';
COMMENT ON COLUMN concepts.job_id IS 'Krea AI job ID for tracking';
COMMENT ON COLUMN concepts.metadata IS 'Additional data: generation time, settings, etc.';
