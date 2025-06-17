const mongoose = require('mongoose');
const ScoreAnalysis = require('../models/scoreanalysis');
const User = require('../models/userSchema');
const extractTextFromPDF = require('../utils/extractTextFromPDF');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const scoreanalysis = async (req, res) => {
    try {
        const { profileId, jobDescriptionPDF, resumePDF, linkedinPDF } = req.body;
        
        // Validate input
        if (!jobDescriptionPDF) {
            return res.status(400).json({ 
                success: false, 
                message: 'Job description PDF is required' 
            });
        }

        if (!profileId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Profile ID is required' 
            });
        }
        
        // Find user by profileId
        const user = await User.findById(profileId);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Extract text from job description PDF
        const jdText = await extractTextFromPDF(jobDescriptionPDF);
        if (!jdText || jdText.trim().length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Job description PDF is empty or invalid' 
            });
        }

        let resumeText = '';
        let linkedinText = '';
        let finalResumePDF = resumePDF;
        let finalLinkedinPDF = linkedinPDF;

        // If no resume/linkedin PDFs provided, get from user profile
        if (!resumePDF && !linkedinPDF) {
            if (user.pdf && user.pdf.resume) {
                finalResumePDF = user.pdf.resume;
            }
            if (user.pdf && user.pdf.linkedin) {
                finalLinkedinPDF = user.pdf.linkedin;
            }
        }

        // PRIORITY: Use only resume if available (either uploaded or from profile)
        // Only use LinkedIn if resume is not available
        let useResume = false;
        let useLinkedIn = false;

        // Extract resume text if available
        if (finalResumePDF) {
            try {
                resumeText = await extractTextFromPDF(finalResumePDF);
                if (resumeText && resumeText.trim().length > 0) {
                    useResume = true;
                    console.log('Using resume for analysis (priority over LinkedIn)');
                } else {
                    console.warn('Resume PDF is empty or invalid');
                }
            } catch (error) {
                console.error('Error extracting resume text:', error);
            }
        }

        // Extract LinkedIn text only if resume is not available or invalid
        if (!useResume && finalLinkedinPDF) {
            try {
                linkedinText = await extractTextFromPDF(finalLinkedinPDF);
                if (linkedinText && linkedinText.trim().length > 0) {
                    useLinkedIn = true;
                    console.log('Using LinkedIn for analysis (resume not available)');
                } else {
                    console.warn('LinkedIn PDF is empty or invalid');
                }
            } catch (error) {
                console.error('Error extracting LinkedIn text:', error);
            }
        }

        // Clear LinkedIn text if we're using resume (to ensure only resume is analyzed)
        if (useResume) {
            linkedinText = '';
        }

        // Check if at least one profile document is available
        if (!useResume && !useLinkedIn) {
            return res.status(400).json({ 
                success: false, 
                message: 'At least one valid profile document (resume or LinkedIn) is required' 
            });
        }

        // Call Gemini API for analysis (will use resume if available, otherwise LinkedIn)
        const analysisResult = await callGemini(jdText, resumeText, linkedinText);

        if (analysisResult.error) {
            return res.status(500).json({
                success: false,
                message: 'Analysis failed',
                error: analysisResult.errorDetails
            });
        }

        // Save analysis result to database
        const scoreAnalysis = new ScoreAnalysis({
            userId: profileId,
            jobDescription: jdText,
            resume: resumeText,
            linkedin: linkedinText,
            score: analysisResult.score,
            reasoning: analysisResult.reasoning,
            suggestions: analysisResult.suggestions,
            analysisDate: new Date()
        });

        await scoreAnalysis.save();

        // Return successful response
        res.status(200).json({
            success: true,
            message: 'Score analysis completed successfully',
            data: {
                analysisId: scoreAnalysis._id,
                score: analysisResult.score,
                reasoning: analysisResult.reasoning,
                suggestions: analysisResult.suggestions,
                analysisDate: scoreAnalysis.analysisDate,
                documentUsed: useResume ? 'resume' : 'linkedin'
            }
        });

    } catch (error) {
        console.error('Score analysis error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Gemini API call function
const callGemini = async (jdText, resumeText, linkedinText, dataContext = '') => {
    try {
        // Validate inputs
        if (!jdText || jdText.trim().length === 0) {
            throw new Error('Job description is required and cannot be empty');
        }

        if ((!resumeText || resumeText.trim().length === 0) && 
            (!linkedinText || linkedinText.trim().length === 0)) {
            throw new Error('At least one of resume or LinkedIn profile must be provided');
        }

        // Create intelligent prompt based on available data
        const prompt = createIntelligentPrompt(jdText, resumeText, linkedinText, dataContext);

        const model = genAI.getGenerativeModel({ 
            model: 'gemini-1.5-pro',
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048,
            }
        });

        console.log('Sending request to Gemini API...');
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log('Raw Gemini response:', text);

        // Parse and validate response
        const parsedResponse = parseGeminiResponse(text);
        return enhanceResponse(parsedResponse, resumeText, linkedinText);

    } catch (error) {
        console.error('Gemini API call failed:', error);
        
        // Return structured error response
        return {
            score: 0,
            reasoning: `Analysis failed: ${error.message}`,
            suggestions: [
                'Please ensure your files are readable PDF documents',
                'Try uploading your documents again',
                'Contact support if the issue persists',
                'Check if your PDF files are not corrupted',
                'Ensure PDF files contain readable text content'
            ],
            error: true,
            errorDetails: error.message
        };
    }
};

// Create intelligent prompt function
function createIntelligentPrompt(jdText, resumeText, linkedinText, dataContext) {
    const hasResume = resumeText && resumeText.trim().length > 0;
    const hasLinkedIn = linkedinText && linkedinText.trim().length > 0;

    let prompt = `You are an expert career counselor and recruiter. Analyze the following job application materials against the provided job description.

${dataContext}

Job Description:
${jdText}

`;

    // PRIORITY LOGIC: Use resume if available, otherwise use LinkedIn
    if (hasResume) {
        prompt += `Resume:
${resumeText}

ANALYSIS INSTRUCTIONS:
- Focus analysis on the resume content against job requirements
- Provide detailed resume-specific feedback
- This analysis prioritizes resume data as the primary source
`;
    } else if (hasLinkedIn) {
        prompt += `LinkedIn Profile:
${linkedinText}

ANALYSIS INSTRUCTIONS:
- Focus analysis on the LinkedIn profile content against job requirements
- Provide detailed LinkedIn-specific feedback
- Resume was not available, so analysis is based on LinkedIn profile only
`;
    }

    prompt += `

SCORING CRITERIA:
- Skills Match (30%): How well do the candidate's skills align with job requirements?
- Experience Match (25%): Does the experience level and type match the role?
- Education & Qualifications (15%): Are educational requirements met?
- Industry/Domain Knowledge (15%): Relevant industry experience?
- Cultural/Soft Skills Fit (10%): Leadership, teamwork, communication skills?
- Growth Potential (5%): Ability to grow into the role?

OUTPUT REQUIREMENTS:
Return ONLY a valid JSON object with these exact keys:
{
  "score": <number between 0-100>,
  "reasoning": "<single concise sentence explaining the score>",
  "suggestions": [
    "<specific actionable improvement suggestion 1>",
    "<specific actionable improvement suggestion 2>",
    "<specific actionable improvement suggestion 3>",
    "<specific actionable improvement suggestion 4>",
    "<specific actionable improvement suggestion 5>"
  ]
}

IMPORTANT:
- Score must be a number between 0-100
- Reasoning must be one clear, concise sentence
- Provide exactly 5 specific, actionable suggestions
- Be constructive and helpful in your feedback
- Focus on improvements that will increase job match score
- Make suggestions specific to the role and candidate's profile
`;

    return prompt;
}

// Parse Gemini response
function parseGeminiResponse(text) {
    try {
        // Clean the response text
        let cleanText = text.trim();
        
        // Remove markdown code blocks if present
        cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        
        // Find JSON object in the response
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleanText = jsonMatch[0];
        }

        const parsed = JSON.parse(cleanText);
        
        // Validate required fields
        if (typeof parsed.score !== 'number' || 
            !parsed.reasoning || 
            !Array.isArray(parsed.suggestions)) {
            throw new Error('Invalid response format from Gemini');
        }

        // Ensure score is within valid range
        parsed.score = Math.max(0, Math.min(100, parsed.score));
        
        // Ensure we have exactly 5 suggestions
        if (parsed.suggestions.length < 5) {
            while (parsed.suggestions.length < 5) {
                parsed.suggestions.push('Continue improving your profile to match job requirements');
            }
        } else if (parsed.suggestions.length > 5) {
            parsed.suggestions = parsed.suggestions.slice(0, 5);
        }

        return parsed;
        
    } catch (error) {
        console.error('Failed to parse Gemini response:', error);
        console.error('Raw response:', text);
        
        // Return default response on parsing failure
        return {
            score: 50,
            reasoning: 'Unable to complete detailed analysis due to parsing error',
            suggestions: [
                'Ensure your resume clearly highlights relevant skills',
                'Match your experience with job requirements',
                'Include relevant keywords from the job description',
                'Quantify your achievements with specific metrics',
                'Tailor your profile to the specific role requirements'
            ]
        };
    }
}

// Enhance response with additional context
function enhanceResponse(parsedResponse, resumeText, linkedinText) {
    const hasResume = resumeText && resumeText.trim().length > 0;
    const hasLinkedIn = linkedinText && linkedinText.trim().length > 0;
    
    // Add context about what data was analyzed (priority: resume over LinkedIn)
    let dataContext = '';
    if (hasResume) {
        dataContext = 'Analysis based on resume (primary source)';
    } else if (hasLinkedIn) {
        dataContext = 'Analysis based on LinkedIn profile (resume not available)';
    }
    
    return {
        ...parsedResponse,
        dataContext,
        timestamp: new Date().toISOString()
    };
}

// Get user's score analysis history
const getScoreHistory = async (req, res) => {
    try {
        const { profileId } = req.params;
        
        if (!profileId) {
            return res.status(400).json({
                success: false,
                message: 'Profile ID is required'
            });
        }

        const analyses = await ScoreAnalysis.find({ userId: profileId })
            .sort({ analysisDate: -1 })
            .limit(10)
            .select('score reasoning suggestions analysisDate');

        res.status(200).json({
            success: true,
            message: 'Score history retrieved successfully',
            data: analyses
        });

    } catch (error) {
        console.error('Get score history error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

module.exports = {
    scoreanalysis,
    getScoreHistory
};