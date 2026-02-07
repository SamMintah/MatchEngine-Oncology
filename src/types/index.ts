// Global type definitions

export interface Patient {
  id: string;
  name: string;
}

export interface ClinicalTrial {
  id: string;
  title: string;
}

export interface PatientProfile {
  age: number;
  gender: 'male' | 'female' | 'other' | 'unknown';
  conditions: string[];
  medications: string[];
  allergies: string[];
  biomarkers: Record<string, string>;
  stage: string | null;
  priorTreatments: string[];
  performanceStatus: string | null;
  labValues: Record<string, string>;
}

export interface TrialCriteria {
  inclusion: string[];
  exclusion: string[];
}

export interface MatchResult {
  matchScore: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  inclusionMatches: string[];
  exclusionFlags: string[];
  uncertainFactors: string[];
  explanation: string;
  questionsToAsk: string[];
}

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
