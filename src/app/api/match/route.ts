// Next.js API route for clinical trial matching
// Purpose: Server-side endpoint that orchestrates patient extraction, trial generation, and matching

import { NextRequest, NextResponse } from 'next/server';
import { extractPatient, generateTrials, assessTrial } from '../../../ai/execute';

interface MatchRequest {
  patientText: string;
}

interface TrialMatch {
  trial: {
    nctId: string;
    title: string;
    phase: string;
    briefSummary: string;
    inclusionCriteria: string[];
    exclusionCriteria: string[];
    matchType: string;
    matchScore: number;
  };
  result: {
    matchScore: number;
    confidenceLevel: string;
    inclusionMatches: string[];
    exclusionFlags: string[];
    uncertainFactors: string[];
    explanation: string;
    questionsToAsk: string[];
  };
  rank: number;
}

/**
 * POST handler for clinical trial matching
 * Accepts patient free-text, extracts profile, generates trials, and assesses matches
 */
export const POST = async (request: NextRequest): Promise<NextResponse> => {
  try {
    // Parse request body
    const body = await request.json() as MatchRequest;
    const { patientText } = body;

    if (!patientText) {
      return NextResponse.json(
        { success: false, error: 'patientText is required' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        }
      );
    }

    // Log patient input (truncated for privacy)
    console.log('Matching patient:', patientText.slice(0, 50));

    // Step 1: Extract structured patient profile from free-text
    const profile = await extractPatient(patientText);

    // Step 2: Generate mock trials tailored to patient
    const trials = await generateTrials(patientText);

    // Step 3: Assess each trial against patient profile
    const matches: TrialMatch[] = [];
    
    for (const trial of trials) {
      const criteria = {
        inclusion: trial.inclusionCriteria,
        exclusion: trial.exclusionCriteria,
      };
      
      const result = await assessTrial(profile, criteria);
      
      matches.push({
        trial,
        result,
        rank: 0, // Will be calculated after sorting
      });
    }

    // Step 4: Sort matches by score (descending)
    matches.sort((a, b) => b.result.matchScore - a.result.matchScore);

    // Step 5: Assign ranks
    matches.forEach((match, index) => {
      match.rank = index + 1;
    });

    // Return successful response with CORS headers
    return NextResponse.json(
      {
        success: true,
        profile,
        matches,
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  } catch (error) {
    console.error('Match API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  }
};

/**
 * OPTIONS handler for CORS preflight requests
 */
export const OPTIONS = async (): Promise<NextResponse> => NextResponse.json(
  {},
  {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  }
);
