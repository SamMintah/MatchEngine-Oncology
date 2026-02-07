// AI execution layer using Vercel AI SDK
// Purpose: Execute prompts with error handling, retries, and timeouts

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { buildExtractionPrompt } from './prompts/extractPatientProfile';
import { buildAssessmentPrompt } from './prompts/assessTrialFit';
import { buildMockTrialsPrompt } from './prompts/generateMockTrials';
import type { PatientProfile, TrialCriteria, MatchResult, MockTrial } from '@/types';

const AI_TIMEOUT_MS = 10000; // 10 second timeout
const MODEL = openai('gpt-4o-mini');

/**
 * Creates a timeout promise that rejects after specified milliseconds
 */
const createTimeout = (ms: number): Promise<never> => 
  new Promise((_, reject) => {
    setTimeout(() => reject(new Error('AI request timeout')), ms);
  });

/**
 * Safely parses JSON with retry logic
 * @param text - Raw text response from AI
 * @param retryPrompt - Prompt to use if initial parse fails
 * @returns Parsed object or null if parsing fails
 */
const safeJsonParse = async <T>(
  text: string,
  retryPrompt?: string
): Promise<T | null> => {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    console.error('JSON parse failed on first attempt:', error);
    
    if (retryPrompt) {
      try {
        const retryResponse = await Promise.race([
          generateText({
            model: MODEL,
            prompt: `${retryPrompt}\n\nReturn valid JSON only. No markdown, no explanations.`,
          }),
          createTimeout(AI_TIMEOUT_MS),
        ]);
        
        return JSON.parse(retryResponse.text) as T;
      } catch (retryError) {
        console.error('JSON parse failed on retry:', retryError);
        return null;
      }
    }
    
    return null;
  }
};

/**
 * Extracts structured patient profile from free-text clinical notes
 * @param freeText - Raw clinical notes or patient description
 * @returns Structured PatientProfile object
 */
export const extractPatient = async (freeText: string): Promise<PatientProfile> => {
  const prompt = buildExtractionPrompt(freeText);
  
  try {
    const response = await Promise.race([
      generateText({
        model: MODEL,
        prompt,
      }),
      createTimeout(AI_TIMEOUT_MS),
    ]);
    
    const parsed = await safeJsonParse<PatientProfile>(response.text, prompt);
    
    if (parsed) {
      return parsed;
    }
    
    // Fallback: return empty profile
    console.error('Failed to parse patient profile, returning fallback');
    return {
      age: 0,
      gender: 'unknown',
      conditions: [],
      medications: [],
      allergies: [],
      biomarkers: {},
      stage: null,
      priorTreatments: [],
      performanceStatus: null,
      labValues: {},
    };
  } catch (error) {
    console.error('extractPatient failed:', error);
    return {
      age: 0,
      gender: 'unknown',
      conditions: [],
      medications: [],
      allergies: [],
      biomarkers: {},
      stage: null,
      priorTreatments: [],
      performanceStatus: null,
      labValues: {},
    };
  }
};

/**
 * Assesses how well a patient fits a clinical trial's eligibility criteria
 * @param patient - Structured patient profile
 * @param trial - Trial inclusion/exclusion criteria
 * @returns Match result with score, explanations, and recommendations
 */
export const assessTrial = async (
  patient: PatientProfile,
  trial: TrialCriteria
): Promise<MatchResult> => {
  const prompt = buildAssessmentPrompt(patient, trial);
  
  try {
    const response = await Promise.race([
      generateText({
        model: MODEL,
        prompt,
      }),
      createTimeout(AI_TIMEOUT_MS),
    ]);
    
    const parsed = await safeJsonParse<MatchResult>(response.text, prompt);
    
    if (parsed) {
      return parsed;
    }
    
    // Fallback: return low-confidence uncertain match
    console.error('Failed to parse match result, returning fallback');
    return {
      matchScore: 0,
      confidenceLevel: 'low',
      inclusionMatches: [],
      exclusionFlags: ['Unable to assess criteria due to processing error'],
      uncertainFactors: ['All criteria require manual review'],
      explanation: 'Assessment failed. Please review trial criteria manually.',
      questionsToAsk: ['Verify all eligibility criteria with trial coordinator'],
    };
  } catch (error) {
    console.error('assessTrial failed:', error);
    return {
      matchScore: 0,
      confidenceLevel: 'low',
      inclusionMatches: [],
      exclusionFlags: ['Unable to assess criteria due to processing error'],
      uncertainFactors: ['All criteria require manual review'],
      explanation: 'Assessment failed. Please review trial criteria manually.',
      questionsToAsk: ['Verify all eligibility criteria with trial coordinator'],
    };
  }
};

/**
 * Generates 3 mock clinical trials for demo purposes
 * @param patientText - Patient description for context
 * @returns Array of 3 MockTrial objects (perfect match, excluded, uncertain)
 */
export const generateTrials = async (patientText: string): Promise<MockTrial[]> => {
  const prompt = buildMockTrialsPrompt(patientText);
  
  try {
    const response = await Promise.race([
      generateText({
        model: MODEL,
        prompt,
      }),
      createTimeout(AI_TIMEOUT_MS),
    ]);
    
    const parsed = await safeJsonParse<MockTrial[]>(response.text, prompt);
    
    if (parsed && Array.isArray(parsed) && parsed.length === 3) {
      return parsed;
    }
    
    // Fallback: return hardcoded demo trials
    console.error('Failed to generate trials, returning fallback');
    return getFallbackTrials();
  } catch (error) {
    console.error('generateTrials failed:', error);
    return getFallbackTrials();
  }
};

/**
 * Hardcoded fallback trials for demo reliability
 */
const getFallbackTrials = (): MockTrial[] => [
  {
    nctId: 'NCT05123456',
    title: 'Study of Trastuzumab Deruxtecan in HER2+ Breast Cancer After Prior Therapy',
    phase: 'Phase 3',
    briefSummary: 'Evaluates trastuzumab deruxtecan in patients with HER2-positive breast cancer who progressed on prior anti-HER2 therapy. Primary endpoint is progression-free survival.',
    inclusionCriteria: [
      'Age 18 years or older',
      'HER2-positive breast cancer (IHC 3+ or FISH+)',
      'Stage III or IV disease',
      'Prior trastuzumab allowed and progression documented',
      'ECOG performance status 0-2',
    ],
    exclusionCriteria: [
      'Active brain metastases requiring immediate treatment',
      'LVEF <50%',
      'Uncontrolled intercurrent illness',
    ],
    matchType: 'perfect',
    matchScore: 92,
  },
  {
    nctId: 'NCT05234567',
    title: 'First-Line Tucatinib Plus Trastuzumab in Treatment-Naive HER2+ Breast Cancer',
    phase: 'Phase 2',
    briefSummary: 'Investigates tucatinib combination therapy in treatment-naive HER2-positive breast cancer patients. Requires no prior systemic anti-HER2 therapy.',
    inclusionCriteria: [
      'Age 18-75 years',
      'HER2-positive breast cancer',
      'Stage II-IV disease',
      'No prior systemic therapy for breast cancer',
      'ECOG performance status 0-1',
    ],
    exclusionCriteria: [
      'Prior anti-HER2 therapy (trastuzumab, pertuzumab, etc.)',
      'Prior chemotherapy for breast cancer',
      'Cardiac dysfunction',
    ],
    matchType: 'excluded',
    matchScore: 20,
  },
  {
    nctId: 'NCT05345678',
    title: 'Neratinib Maintenance Therapy in High-Risk HER2+ Breast Cancer',
    phase: 'Phase 3',
    briefSummary: 'Studies neratinib as maintenance therapy after standard treatment in high-risk HER2-positive breast cancer. Requires excellent performance status.',
    inclusionCriteria: [
      'Age 18-70 years',
      'HER2-positive breast cancer',
      'Stage III disease',
      'Completed prior trastuzumab-based therapy',
      'ECOG performance status 0 (fully active)',
    ],
    exclusionCriteria: [
      'Metastatic disease',
      'Severe diarrhea or GI disorders',
      'Inadequate organ function',
    ],
    matchType: 'uncertain',
    matchScore: 62,
  },
];
