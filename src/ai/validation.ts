// AI output validation layer
// Purpose: Catch obvious AI errors before displaying results to clinicians
// Enhanced with medical guardrails for breast cancer trial matching

import type { PatientProfile, MockTrial, MatchResult } from '@/types';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface GuardrailResult {
  shouldOverride: boolean;
  overrideScore?: number;
  overrideStatus?: 'match' | 'uncertain' | 'exclude';
  flags: string[];
  reasoning: string;
}

/**
 * Medical guardrails for breast cancer trial matching
 * Enforces deterministic clinical logic that overrides AI assessment
 */
export const applyMedicalGuardrails = (
  patient: PatientProfile,
  trial: MockTrial,
  aiAssessment: MatchResult
): GuardrailResult => {
  const flags: string[] = [];
  let shouldOverride = false;
  let overrideScore: number | undefined;
  let overrideStatus: 'match' | 'uncertain' | 'exclude' | undefined;
  let reasoning = '';

  // Extract patient biomarkers
  const biomarkers = patient.biomarkers || {};
  
  const her2Status = extractBiomarkerStatus(biomarkers, 'HER2');
  
  // Extract trial requirements
  const trialText = `${trial.title} ${trial.briefSummary} ${trial.inclusionCriteria.join(' ')}`.toLowerCase();
  const exclusionText = trial.exclusionCriteria.join(' ').toLowerCase();

  // Helper: Check if trial requires HER2-positive
  const requiresHER2Positive = 
    trialText.includes('her2+') || 
    trialText.includes('her2-positive') || 
    trialText.includes('her2 positive') ||
    /\bher2\s*positive\b/.test(trialText);

  // Helper: Check if trial requires HER2-negative (excluding HER2-low and HER2-positive)
  const requiresHER2Negative = 
    (trialText.includes('her2-negative') || 
     trialText.includes('her2 negative') ||
     trialText.includes('triple negative') ||
     trialText.includes('tnbc') ||
     /\bher2\s*negative\b/.test(trialText)) &&
    !trialText.includes('her2-positive') &&
    !trialText.includes('her2+') &&
    !trialText.includes('her2 positive') &&
    !/\bher2\s*positive\b/.test(trialText) &&
    !trialText.includes('her2-low');

  // GUARDRAIL 1: HER2 Status Mismatch
  if (requiresHER2Positive) {
    if (her2Status === 'negative') {
      shouldOverride = true;
      overrideScore = 15;
      overrideStatus = 'exclude';
      flags.push('HER2 status mismatch: Trial requires HER2+, patient is HER2-');
      reasoning = 'Hard exclusion: Patient is HER2-negative but trial requires HER2-positive status. This is a fundamental eligibility criterion.';
    } else if (her2Status === 'unknown') {
      shouldOverride = true;
      overrideScore = 45;
      overrideStatus = 'uncertain';
      flags.push('HER2 status unknown: Trial requires HER2+, patient status not documented');
      reasoning = 'Uncertain match: HER2 status not documented. Additional testing required to determine eligibility for this HER2-positive trial.';
    }
  }

  if (requiresHER2Negative) {
    if (her2Status === 'positive') {
      shouldOverride = true;
      overrideScore = 15;
      overrideStatus = 'exclude';
      flags.push('HER2 status mismatch: Trial requires HER2-, patient is HER2+');
      reasoning = 'Hard exclusion: Patient is HER2-positive but trial requires HER2-negative status.';
    } else if (her2Status === 'unknown') {
      shouldOverride = true;
      overrideScore = 45;
      overrideStatus = 'uncertain';
      flags.push('HER2 status unknown: Trial requires HER2-, patient status not documented');
      reasoning = 'Uncertain match: HER2 status not documented. Additional testing required to determine eligibility for this HER2-negative trial.';
    }
  }

  // GUARDRAIL 2: Metastatic vs Early-Stage Mismatch
  const isMetastatic = patient.stage?.toLowerCase().includes('iv') || 
                       patient.stage?.toLowerCase().includes('metastatic') ||
                       patient.conditions.some(c => c.toLowerCase().includes('metastatic'));
  
  const isEarlyStage = patient.stage?.match(/stage\s*(i|ii|iii)/i) && !isMetastatic;

  if (trialText.includes('metastatic') || trialText.includes('stage iv') || trialText.includes('advanced')) {
    if (isEarlyStage) {
      shouldOverride = true;
      overrideScore = 20;
      overrideStatus = 'exclude';
      flags.push('Stage mismatch: Trial for metastatic disease, patient has early-stage cancer');
      reasoning = 'Hard exclusion: Trial is for metastatic/advanced breast cancer, but patient has early-stage disease.';
    }
  }

  if (trialText.includes('early') || trialText.includes('adjuvant') || trialText.includes('neoadjuvant')) {
    if (isMetastatic) {
      shouldOverride = true;
      overrideScore = 20;
      overrideStatus = 'exclude';
      flags.push('Stage mismatch: Trial for early-stage disease, patient has metastatic cancer');
      reasoning = 'Hard exclusion: Trial is for early-stage breast cancer, but patient has metastatic disease.';
    }
  }

  // GUARDRAIL 3: Prior Treatment Requirements
  const priorTreatments = patient.priorTreatments.map(t => t.toLowerCase()).join(' ');
  const hasPriorTrastuzumab = priorTreatments.includes('trastuzumab') || priorTreatments.includes('herceptin');
  const hasPriorTaxane = priorTreatments.includes('taxane') || priorTreatments.includes('paclitaxel') || 
                         priorTreatments.includes('docetaxel');
  const hasPriorTDM1 = priorTreatments.includes('t-dm1') || priorTreatments.includes('kadcyla') || 
                       priorTreatments.includes('trastuzumab emtansine');

  // Trial requires prior trastuzumab
  if (trialText.includes('prior trastuzumab') || trialText.includes('previous trastuzumab')) {
    if (!hasPriorTrastuzumab) {
      shouldOverride = true;
      overrideScore = 25;
      overrideStatus = 'exclude';
      flags.push('Prior treatment requirement: Trial requires prior trastuzumab, patient has not received it');
      reasoning = 'Hard exclusion: Trial requires prior trastuzumab therapy, but patient treatment history does not include it.';
    }
  }

  // Trial requires prior taxane
  if (trialText.includes('prior taxane') || trialText.includes('previous taxane')) {
    if (!hasPriorTaxane) {
      shouldOverride = true;
      overrideScore = 25;
      overrideStatus = 'exclude';
      flags.push('Prior treatment requirement: Trial requires prior taxane, patient has not received it');
      reasoning = 'Hard exclusion: Trial requires prior taxane-based therapy, but patient treatment history does not include it.';
    }
  }

  // Trial excludes prior T-DM1
  if (exclusionText.includes('t-dm1') || exclusionText.includes('trastuzumab emtansine')) {
    if (hasPriorTDM1) {
      shouldOverride = true;
      overrideScore = 15;
      overrideStatus = 'exclude';
      flags.push('Prior treatment exclusion: Trial excludes prior T-DM1, patient has received it');
      reasoning = 'Hard exclusion: Trial excludes patients with prior T-DM1 therapy, but patient has received it.';
    }
  }

  // GUARDRAIL 4: ECOG Performance Status
  const ecogMatch = patient.performanceStatus?.match(/ECOG\s*(\d)/i);
  if (ecogMatch) {
    const ecogScore = parseInt(ecogMatch[1]);
    
    // Most trials require ECOG 0-1
    if (trialText.includes('ecog 0-1') || trialText.includes('ecog performance status 0-1')) {
      if (ecogScore > 1) {
        shouldOverride = true;
        overrideScore = 30;
        overrideStatus = 'exclude';
        flags.push(`ECOG performance status: Trial requires ECOG 0-1, patient is ECOG ${ecogScore}`);
        reasoning = `Hard exclusion: Trial requires ECOG performance status 0-1, but patient has ECOG ${ecogScore}.`;
      }
    }
  }

  // GUARDRAIL 5: Triple Negative Breast Cancer (TNBC) Consistency
  const isTNBC = patient.conditions.some(c => c.toLowerCase().includes('triple negative') || c.toLowerCase().includes('tnbc'));
  const trialForTNBC = trialText.includes('triple negative') || trialText.includes('tnbc');
  
  if (trialForTNBC && !isTNBC && her2Status === 'positive') {
    shouldOverride = true;
    overrideScore = 15;
    overrideStatus = 'exclude';
    flags.push('Subtype mismatch: Trial for TNBC, patient is HER2+');
    reasoning = 'Hard exclusion: Trial is for triple-negative breast cancer, but patient is HER2-positive.';
  }

  // GUARDRAIL 6: Brain Metastases
  const hasBrainMets = patient.conditions.some(c => c.toLowerCase().includes('brain met')) ||
                       priorTreatments.includes('brain') ||
                       priorTreatments.includes('cranial');
  
  if (exclusionText.includes('brain metastases') || exclusionText.includes('cns metastases')) {
    if (hasBrainMets) {
      shouldOverride = true;
      overrideScore = 20;
      overrideStatus = 'exclude';
      flags.push('Brain metastases: Trial excludes brain/CNS metastases, patient has them');
      reasoning = 'Hard exclusion: Trial excludes patients with brain metastases, but patient has documented CNS involvement.';
    }
  }

  // GUARDRAIL 7: Consistency Check - Patient Profile vs AI Assessment
  const assessmentText = aiAssessment.explanation.toLowerCase();
  
  // Check if AI assessment contradicts patient biomarkers
  if (her2Status === 'positive' && assessmentText.includes('her2-negative')) {
    flags.push('AI consistency error: Assessment mentions HER2-negative but patient is HER2-positive');
  }
  
  if (her2Status === 'negative' && assessmentText.includes('her2-positive')) {
    flags.push('AI consistency error: Assessment mentions HER2-positive but patient is HER2-negative');
  }

  if (isMetastatic && assessmentText.includes('early-stage')) {
    flags.push('AI consistency error: Assessment mentions early-stage but patient has metastatic disease');
  }

  return {
    shouldOverride,
    overrideScore,
    overrideStatus,
    flags,
    reasoning: reasoning || 'No guardrail overrides applied',
  };
};

/**
 * Helper function to extract biomarker status (positive/negative/unknown)
 */
const extractBiomarkerStatus = (biomarkers: Record<string, string>, marker: string): 'positive' | 'negative' | 'unknown' => {
  const markerKey = Object.keys(biomarkers).find(k => k.toLowerCase().includes(marker.toLowerCase()));
  if (!markerKey) return 'unknown';
  
  const value = biomarkers[markerKey].toLowerCase();
  if (value.includes('positive') || value.includes('+') || value === '3+' || value === '2+') {
    return 'positive';
  }
  if (value.includes('negative') || value.includes('-') || value === '0' || value === '1+') {
    return 'negative';
  }
  return 'unknown';
};

/**
 * Validates patient profile extracted by AI
 * Catches unrealistic values and medical contradictions
 */
export const validatePatientProfile = (profile: PatientProfile): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Age validation (18-120 years)
  if (profile.age < 18) {
    errors.push(`Age ${profile.age} is below minimum (18 years)`);
  } else if (profile.age > 120) {
    errors.push(`Age ${profile.age} is unrealistic (max 120 years)`);
  } else if (profile.age === 0) {
    warnings.push('Age not extracted, defaulting to unknown');
  }

  // Cancer stage validation (I, II, III, IV, or null)
  if (profile.stage) {
    const normalizedStage = profile.stage.toUpperCase().replace(/STAGE\s*/i, '').trim();
    const validStages = ['I', 'IA', 'IB', 'II', 'IIA', 'IIB', 'III', 'IIIA', 'IIIB', 'IIIC', 'IV', 'IVA', 'IVB'];
    
    if (!validStages.some(valid => normalizedStage.startsWith(valid))) {
      errors.push(`Invalid cancer stage: "${profile.stage}". Must be I, II, III, or IV`);
    }

    // Check for impossible combinations
    if (normalizedStage === '0' && profile.conditions.some(c => c.toLowerCase().includes('metastatic'))) {
      errors.push('Impossible combination: Stage 0 cannot be metastatic');
    }
  }

  // ECOG performance status validation (0-5)
  if (profile.performanceStatus) {
    const ecogMatch = profile.performanceStatus.match(/ECOG\s*(\d)/i);
    if (ecogMatch) {
      const ecogScore = parseInt(ecogMatch[1]);
      if (ecogScore < 0 || ecogScore > 5) {
        errors.push(`Invalid ECOG score: ${ecogScore}. Must be 0-5`);
      }
    }
  }

  // Biomarker contradiction checks
  const biomarkerKeys = Object.keys(profile.biomarkers).map(k => k.toLowerCase());
  const biomarkerValues = Object.values(profile.biomarkers).map(v => v.toLowerCase());
  
  // TNBC (Triple Negative) cannot be HER2+, ER+, or PR+
  const isTNBC = profile.conditions.some(c => c.toLowerCase().includes('triple negative') || c.toLowerCase().includes('tnbc'));
  const hasHER2Positive = biomarkerKeys.includes('her2') && biomarkerValues.some(v => v.includes('positive') || v.includes('+'));
  const hasERPositive = biomarkerKeys.includes('er') && biomarkerValues.some(v => v.includes('positive') || v.includes('+'));
  const hasPRPositive = biomarkerKeys.includes('pr') && biomarkerValues.some(v => v.includes('positive') || v.includes('+'));

  if (isTNBC && (hasHER2Positive || hasERPositive || hasPRPositive)) {
    errors.push('Biomarker contradiction: Triple Negative Breast Cancer cannot be HER2+, ER+, or PR+');
  }

  // Check for missing critical data
  if (profile.conditions.length === 0) {
    warnings.push('No conditions/diagnoses extracted from patient notes');
  }

  if (!profile.stage && profile.conditions.some(c => c.toLowerCase().includes('cancer'))) {
    warnings.push('Cancer stage not specified - may limit trial matching accuracy');
  }

  if (Object.keys(profile.biomarkers).length === 0 && profile.conditions.some(c => c.toLowerCase().includes('breast cancer'))) {
    warnings.push('No biomarkers (HER2, ER, PR) extracted - critical for breast cancer trial matching');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Validates mock trials generated by AI
 * Ensures trials have required fields and realistic data
 */
export const validateMockTrials = (trials: MockTrial[]): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate each trial
  trials.forEach((trial, index) => {
    const trialNum = index + 1;

    // NCT ID format validation
    if (!trial.nctId || !trial.nctId.match(/^NCT\d{8}$/)) {
      errors.push(`Trial ${trialNum}: Invalid NCT ID format "${trial.nctId}". Must be NCT + 8 digits`);
    }

    // Required fields
    if (!trial.title || trial.title.length < 10) {
      errors.push(`Trial ${trialNum}: Title missing or too short`);
    }

    if (!trial.phase || !['Phase 1', 'Phase 2', 'Phase 3'].includes(trial.phase)) {
      errors.push(`Trial ${trialNum}: Invalid phase "${trial.phase}". Must be Phase 1, 2, or 3`);
    }

    if (!trial.briefSummary || trial.briefSummary.length < 20) {
      errors.push(`Trial ${trialNum}: Brief summary missing or too short`);
    }

    // Criteria validation
    if (!trial.inclusionCriteria || trial.inclusionCriteria.length < 3) {
      errors.push(`Trial ${trialNum}: Must have at least 3 inclusion criteria`);
    }

    if (!trial.exclusionCriteria || trial.exclusionCriteria.length < 2) {
      errors.push(`Trial ${trialNum}: Must have at least 2 exclusion criteria`);
    }

    // Cancer type validation
    if (!trial.cancerType || !['breast', 'lung', 'colorectal', 'prostate', 'other'].includes(trial.cancerType)) {
      warnings.push(`Trial ${trialNum}: Invalid or missing cancerType "${trial.cancerType}"`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Sanitizes patient profile by fixing common AI extraction errors
 * Infers biomarkers from conditions text when missing
 * Returns corrected profile with fixes applied
 */
export const sanitizePatientProfile = (profile: PatientProfile, rawText?: string): PatientProfile => {
  const sanitized = { ...profile };

  // Fix age bounds
  if (sanitized.age < 0) sanitized.age = 0;
  if (sanitized.age > 120) sanitized.age = 120;

  // Normalize stage format
  if (sanitized.stage) {
    sanitized.stage = sanitized.stage
      .replace(/stage\s*/i, 'Stage ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Normalize ECOG format
  if (sanitized.performanceStatus && !sanitized.performanceStatus.toUpperCase().startsWith('ECOG')) {
    const ecogMatch = sanitized.performanceStatus.match(/(\d)/);
    if (ecogMatch) {
      sanitized.performanceStatus = `ECOG ${ecogMatch[1]}`;
    }
  }

  // Normalize biomarker keys to standard format
  const normalizedBiomarkers: Record<string, string> = {};
  Object.entries(sanitized.biomarkers).forEach(([key, value]) => {
    const normalizedKey = key.toUpperCase().replace(/[^A-Z0-9]/g, '');
    normalizedBiomarkers[normalizedKey] = value;
  });
  sanitized.biomarkers = normalizedBiomarkers;

  // HEURISTIC: Infer biomarkers from all text fields if missing
  // This reduces false "unknown" guardrail flags
  // Check conditions, medications, and prior treatments
  const allText = [
    ...sanitized.conditions,
    ...sanitized.medications,
    ...sanitized.priorTreatments,
    rawText || '',
  ].join(' ').toLowerCase();
  
  // Infer HER2 status
  if (!sanitized.biomarkers.HER2) {
    if (allText.includes('her2+') || 
        allText.includes('her2-positive') || 
        allText.includes('her2 positive') ||
        allText.includes('her2pos')) {
      sanitized.biomarkers.HER2 = 'positive';
      console.log('✓ Inferred HER2: positive from patient text');
    } else if (allText.includes('her2-') || 
               allText.includes('her2-negative') || 
               allText.includes('her2 negative') ||
               allText.includes('her2neg')) {
      sanitized.biomarkers.HER2 = 'negative';
      console.log('✓ Inferred HER2: negative from patient text');
    } else if (allText.includes('triple negative') || allText.includes('tnbc')) {
      // TNBC implies HER2-, ER-, PR-
      sanitized.biomarkers.HER2 = 'negative';
      console.log('✓ Inferred HER2: negative from TNBC');
    }
  }

  // Infer ER status
  if (!sanitized.biomarkers.ER) {
    if (allText.includes('er+') || 
        allText.includes('er-positive') || 
        allText.includes('er positive') ||
        allText.includes('erpos')) {
      sanitized.biomarkers.ER = 'positive';
      console.log('✓ Inferred ER: positive from patient text');
    } else if (allText.includes('er-') || 
               allText.includes('er-negative') || 
               allText.includes('er negative') ||
               allText.includes('erneg')) {
      sanitized.biomarkers.ER = 'negative';
      console.log('✓ Inferred ER: negative from patient text');
    } else if (allText.includes('triple negative') || allText.includes('tnbc')) {
      sanitized.biomarkers.ER = 'negative';
      console.log('✓ Inferred ER: negative from TNBC');
    } else if (allText.includes('hr+') || 
               allText.includes('hr-positive') || 
               allText.includes('hormone receptor positive')) {
      sanitized.biomarkers.ER = 'positive';
      console.log('✓ Inferred ER: positive from HR+ status');
    }
  }

  // Infer PR status
  if (!sanitized.biomarkers.PR) {
    if (allText.includes('pr+') || 
        allText.includes('pr-positive') || 
        allText.includes('pr positive') ||
        allText.includes('prpos')) {
      sanitized.biomarkers.PR = 'positive';
      console.log('✓ Inferred PR: positive from patient text');
    } else if (allText.includes('pr-') || 
               allText.includes('pr-negative') || 
               allText.includes('pr negative') ||
               allText.includes('prneg')) {
      sanitized.biomarkers.PR = 'negative';
      console.log('✓ Inferred PR: negative from patient text');
    } else if (allText.includes('triple negative') || allText.includes('tnbc')) {
      sanitized.biomarkers.PR = 'negative';
      console.log('✓ Inferred PR: negative from TNBC');
    } else if (allText.includes('hr+') || 
               allText.includes('hr-positive') || 
               allText.includes('hormone receptor positive')) {
      sanitized.biomarkers.PR = 'positive';
      console.log('✓ Inferred PR: positive from HR+ status');
    }
  }

  return sanitized;
};
