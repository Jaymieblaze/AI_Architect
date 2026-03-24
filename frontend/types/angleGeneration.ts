/**
 * Multi-Angle Generation Utilities
 * Generates 4 coherent architectural views from a single prompt
 */

import type { AngleType } from './database';

export const ANGLE_TYPES: AngleType[] = ['exterior', 'interior', 'aerial', 'detail'];

export const ANGLE_DESCRIPTORS = {
  exterior: {
    prefix: 'exterior architectural view',
    context: 'showing full building facade, main entrance, and surrounding context',
  },
  interior: {
    prefix: 'interior architectural perspective',
    context: 'showing main space, double-height areas, materiality, and spatial flow',
  },
  aerial: {
    prefix: 'aerial bird\'s eye view',
    context: 'showing building from above, roof design, site context, and landscape integration',
  },
  detail: {
    prefix: 'architectural detail close-up',
    context: 'showing material connections, structural elements, and craftsmanship',
  },
};

/**
 * Extracts architectural DNA from user prompt
 * Identifies key materials, style, features for consistency across angles
 */
export function extractArchitecturalDNA(prompt: string): string {
  // Simple extraction - in future, could use GPT-4 for better analysis
  const dna = prompt.toLowerCase();
  
  // Extract key architectural elements
  const materials: string[] = [];
  const styles: string[] = [];
  const features: string[] = [];
  
  // Material keywords
  if (dna.includes('timber') || dna.includes('wood')) materials.push('timber cladding');
  if (dna.includes('glass')) materials.push('glass curtain walls');
  if (dna.includes('concrete')) materials.push('exposed concrete');
  if (dna.includes('steel')) materials.push('steel structure');
  if (dna.includes('brick')) materials.push('brick masonry');
  if (dna.includes('stone')) materials.push('natural stone');
  
  // Style keywords
  if (dna.includes('minimalist') || dna.includes('minimal')) styles.push('minimalist design');
  if (dna.includes('modern')) styles.push('modern architecture');
  if (dna.includes('contemporary')) styles.push('contemporary style');
  if (dna.includes('tropical')) styles.push('tropical architecture');
  if (dna.includes('brutalist')) styles.push('brutalist aesthetic');
  if (dna.includes('organic')) styles.push('organic forms');
  
  // Feature keywords
  if (dna.includes('pool')) features.push('infinity pools');
  if (dna.includes('terrace')) features.push('terraces');
  if (dna.includes('garden')) features.push('gardens');
  if (dna.includes('courtyard')) features.push('courtyards');
  if (dna.includes('atrium')) features.push('double-height atrium');
  if (dna.includes('cantilever')) features.push('cantilevered volumes');
  
  // Combine into DNA string
  const dnaElements = [
    ...materials,
    ...styles,
    ...features,
  ];
  
  return dnaElements.length > 0 
    ? dnaElements.join(', ')
    : prompt; // Fallback to original prompt if no keywords matched
}

/**
 * Generates 4 angle-specific prompts with shared architectural DNA
 * Uses consistent identifier to encourage same building across angles
 */
export function generateAnglePrompts(userPrompt: string): Record<AngleType, string> {
  const dna = extractArchitecturalDNA(userPrompt);
  
  // Generate a consistent building identifier from the prompt 
  // This helps the AI understand it's the same building
  const buildingId = userPrompt.split(' ').slice(0, 5).join(' ');
  
  const prompts: Record<AngleType, string> = {
    exterior: '',
    interior: '',
    aerial: '',
    detail: '',
  };
  
  ANGLE_TYPES.forEach((angle) => {
    const descriptor = ANGLE_DESCRIPTORS[angle];
    
    // For non-exterior angles, explicitly reference "the same building"
    const buildingRef = angle === 'exterior' 
      ? `${userPrompt}` 
      : `THE SAME ${buildingId} building`;
    
    prompts[angle] = `${descriptor.prefix}, ${buildingRef}, ${dna}, ${descriptor.context}, consistent architectural style, professional architectural photography, highly detailed`;
  });
  
  return prompts;
}

/**
 * Get display name for angle type
 */
export function getAngleDisplayName(angle: AngleType): string {
  const names = {
    exterior: 'Exterior View',
    interior: 'Interior Perspective',
    aerial: 'Aerial Overview',
    detail: 'Architectural Detail',
  };
  return names[angle];
}

/**
 * Get loading message for angle
 */
export function getAngleLoadingMessage(angle: AngleType): string {
  const messages = {
    exterior: 'Rendering exterior facade...',
    interior: 'Drafting interior spaces...',
    aerial: 'Capturing aerial perspective...',
    detail: 'Defining architectural details...',
  };
  return messages[angle];
}
