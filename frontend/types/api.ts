/**
 * API type definitions for AI Architect
 */

/**
 * Response from the /api/generate endpoint
 * Contains the job ID for polling status
 */
export interface GenerateResponse {
  job_id: string;
}

/**
 * Request payload for the /api/generate endpoint
 */
export interface GenerateRequest {
  user_prompt: string;
}

/**
 * Response from the /api/poll endpoint
 * Contains job status and image URL when complete
 */
export interface PollResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  image_url: string | null;
}

/**
 * Error response format
 */
export interface ErrorResponse {
  error: string;
}

/**
 * Krea AI job status response
 */
export interface KreaJobResponse {
  status: string;
  result?: {
    urls?: string[];
  };
}

/**
 * Gallery API response
 */
export interface GalleryResponse {
  concepts: Array<{
    id: string;
    created_at: string;
    prompt: string;
    image_url: string;
    job_id: string;
    status: string;
  }>;
  total: number;
  limit: number;
  offset: number;
}
