/**
 * API type definitions for AI Architect
 */

import type { AngleType, AngleImage } from './database';

/**
 * Response from the /api/generate endpoint
 * Contains single job ID or multiple job IDs for multi-angle
 */
export interface GenerateResponse {
  job_id?: string; // Legacy: single image
  job_ids?: Array<{ angle: AngleType; job_id: string }>; // Multi-angle
  mode: 'single' | 'multi-angle';
}

/**
 * Request payload for the /api/generate endpoint
 */
export interface GenerateRequest {
  user_prompt: string;
 mode?: 'single' | 'multi-angle'; // Optional: defaults to 'single'
}

/**
 * Response from the /api/poll endpoint
 * Contains job status and image URL when complete
 */
export interface PollResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  image_url: string | null;
  angle?: AngleType; // For multi-angle polling
}

/**
 * Multi-angle poll response
 */
export interface MultiAnglePollResponse {
  images: AngleImage[];
  overall_status: 'pending' | 'processing' | 'partial' | 'completed' | 'failed';
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
