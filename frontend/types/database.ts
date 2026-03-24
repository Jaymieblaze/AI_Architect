/**
 * Database types for Supabase
 */

export interface Concept {
  id: string;
  created_at: string;
  prompt: string;
  image_url: string;
  job_id: string;
  status: 'completed' | 'failed';
  metadata?: {
    generation_time_ms?: number;
    user_agent?: string;
    [key: string]: unknown;
  };
}

export interface ConceptInsert {
  prompt: string;
  image_url: string;
  job_id: string;
  status?: 'completed' | 'failed';
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
