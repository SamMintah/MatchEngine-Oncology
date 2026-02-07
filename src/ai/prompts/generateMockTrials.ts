// Prompt: Generate realistic mock clinical trials for demo purposes
// Purpose: Create 3 breast cancer trials covering perfect match, hard exclusion, and uncertain scenarios

/**
 * Base prompt for generating mock clinical trials tailored to demo patient
 */
export const generateMockTrialsPrompt = `You are a clinical trial database generator. Create 3 realistic breast cancer clinical trials for demonstration purposes.

Demo patient context: 52-year-old female, Stage III HER2-positive breast cancer, progressed on trastuzumab, ECOG performance status 1.

Generate exactly 3 trials covering these scenarios:

1. PERFECT MATCH: A HER2-targeted therapy trial that explicitly allows patients who have progressed on prior trastuzumab. This should be a clear "yes" for enrollment consideration.

2. HARD EXCLUSION: A trial that requires "no prior anti-HER2 therapy" or similar strict exclusion. Patient fails immediately due to prior trastuzumab exposure.

3. UNCERTAIN: A trial requiring ECOG 0 (fully active) while patient has ECOG 1 (restricted in physically strenuous activity). This is a borderline case needing clinician judgment.

Each trial must include:
- nctId: string (format "NCT" + 8 random digits, e.g., "NCT04567890")
- title: string (realistic trial name with drug/intervention)
- phase: "Phase 1" | "Phase 2" | "Phase 3"
- briefSummary: string (2 sentences max, describe intervention and target population)
- inclusionCriteria: string[] (3-5 specific bullet points)
- exclusionCriteria: string[] (3-5 specific bullet points)
- matchType: "perfect" | "excluded" | "uncertain" (for demo routing logic)
- matchScore: number (0-100, pre-calculated: perfect=90-95, excluded=15-25, uncertain=55-65)

Requirements:
- Use realistic drug names (e.g., trastuzumab deruxtecan, tucatinib, neratinib)
- Include specific biomarker requirements (HER2+, ER/PR status)
- Mention age ranges, stage requirements, performance status
- Make criteria medically accurate for breast cancer trials
- Return valid JSON array only, no additional text

Example output format:
[
  {
    "nctId": "NCT04123456",
    "title": "Study of Trastuzumab Deruxtecan in HER2+ Metastatic Breast Cancer After Prior HER2-Targeted Therapy",
    "phase": "Phase 3",
    "briefSummary": "This study evaluates trastuzumab deruxtecan in patients with HER2-positive metastatic breast cancer who have received prior anti-HER2 therapy. The primary endpoint is progression-free survival.",
    "inclusionCriteria": [
      "Age 18 years or older",
      "HER2-positive breast cancer (IHC 3+ or FISH+)",
      "Stage III or IV disease",
      "Prior treatment with trastuzumab allowed",
      "ECOG performance status 0-2"
    ],
    "exclusionCriteria": [
      "Active brain metastases requiring immediate treatment",
      "Severe cardiac dysfunction (LVEF <50%)",
      "Uncontrolled intercurrent illness"
    ],
    "matchType": "perfect",
    "matchScore": 92
  }
]

Now generate 3 trials for this patient:`;

/**
 * Builds the complete prompt with patient context
 * @param patientProfile - Free-text or structured patient description
 * @returns Complete prompt string for LLM
 */
export const buildMockTrialsPrompt = (patientProfile: string): string => `${generateMockTrialsPrompt}\n\nPatient: ${patientProfile}`;

/**
 * Type definition for mock trial structure
 */
export interface MockTrial {
  nctId: string;
  title: string;
  phase: 'Phase 1' | 'Phase 2' | 'Phase 3';
  briefSummary: string;
  inclusionCriteria: string[];
  exclusionCriteria: string[];
  matchType: 'perfect' | 'excluded' | 'uncertain';
  matchScore: number;
}
