/**
 * Database types for Supabase
 */

export type AngleType = 'exterior' | 'interior' | 'aerial' | 'detail' | string; // Allow custom angles

export interface AngleImage {
  angle: AngleType;
  url: string;
  job_id: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  customLabel?: string; // Display name for custom angles
}

export interface Concept {
 id: string;
  created_at: string;
  prompt: string;
  // Legacy single-image fields (nullable)
  image_url?: string | null;
  job_id?: string | null;
  // New multi-angle field
  images?: AngleImage[] | null;
  // Source image for img2img transformations
  source_image_url?: string | null;
  status: 'completed' | 'failed' | 'partial';
  metadata?: {
    generation_time_ms?: number;
    user_agent?: string;
    mode?: 'single' | 'multi-angle' | 'image-to-render';
    [key: string]: unknown;
  };
}

export interface ConceptInsert {
  prompt: string;
  // Legacy single-image (optional)
  image_url?: string;
  job_id?: string;
  // New multi-angle (optional)
  images?: AngleImage[];
  status?: 'completed' | 'failed' | 'partial';
  metadata?: Concept['metadata'];
}

export interface Database {
  public: {
    Tables: {
      concepts: {
        Row: Concept;
        Insert: ConceptInsert;
        Update: Partial<ConceptInsert>;
      };
    };
  };
}
