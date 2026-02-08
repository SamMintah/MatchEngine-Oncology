// Medical AI models using Hugging Face Inference API
// Purpose: Use MedAlpaca for clinical trial eligibility assessment only

import { HfInference } from '@huggingface/inference';

// Initialize Hugging Face client (suppress deprecation warning - still functional)
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

// Model configuration for assessment only
export const MEDICAL_MODEL = {
  name: 'medalpaca/medalpaca-7b',
  description: 'MedAlpaca medical AI for clinical trial eligibility assessment',
  task: 'text-generation',
} as const;

/**
 * Assess trial fit using MedAlpaca (medical model)
 * Falls back to OpenAI if Hugging Face fails
 */
export const assessWithMedAlpaca = async (
  patientProfile: string,
  trialCriteria: string
): Promise<{ success: boolean; data?: unknown; error?: string; model: string }> => {
  try {
    const prompt = `Assess patient eligibility for trial. Return JSON: matchScore (0-100, cap 25 if excluded), confidenceLevel, inclusionMatches, exclusionFlags, uncertainFactors, explanation, questionsToAsk. If exclusion violated, max score 25.

Patient: ${patientProfile}

Criteria: ${trialCriteria}

JSON only:`;

    const response = await hf.textGeneration({
      model: MEDICAL_MODEL.name,
      inputs: prompt,
      parameters: {
        max_new_tokens: 500, // Reduced from 800 for cost optimization
        temperature: 0.2, // Lower temperature for more consistent output
        return_full_text: false,
      },
    });

    return {
      success: true,
      data: response.generated_text,
      model: MEDICAL_MODEL.name,
    };
  } catch (error) {
    console.error('MedAlpaca assessment failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      model: MEDICAL_MODEL.name,
    };
  }
};

/**
 * Check if Hugging Face API is available
 */
export const isHuggingFaceAvailable = (): boolean => {
  return !!process.env.HUGGINGFACE_API_KEY;
};

/**
 * Get model attribution text for UI display
 */
export const getModelAttribution = (): string => {
  return `Assessment by ${MEDICAL_MODEL.name} (${MEDICAL_MODEL.description})`;
};
