const mongoose = require('mongoose');
const ScoreAnalysis = require('../models/scoreanalysis');
const User = require('../models/userSchema');
const UserProfile = require('../models/userProfileSchema');
const extractTextFromPDF = require('../utils/extractTextFromPDF');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { cloudinary } = require('../config/cloudinaryConfig');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const isworking = async(req, res) => {
    res.status(200).json({
        success: true,
        message: 'API is working correctly',
        data: {
            status: 'OK',
            timestamp: new Date().toISOString()
        }
    });
}

// Step 1: Upload JD and check user profile status
const uploadJDAndCheckProfile = async (req, res) => {
    try {
        const { profileId } = req.body;
        
        // Validate input
        if (!profileId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Profile ID is required' 
            });
        }

        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                message: 'Job description file is required' 
            });
        }
        
        // Find user by profileId - use UserProfile instead of User
        const user = await UserProfile.findOne({ login_id: profileId });
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User profile not found' 
            });
        }

        // JD file is already uploaded to Cloudinary via multer middleware
        const jdCloudinaryUrl = req.file.path;
        
        // Extract text from uploaded JD
        const jdText = await extractTextFromPDF(jdCloudinaryUrl);
        if (!jdText || jdText.trim().length === 0) {
            // Delete the uploaded file if it's invalid
            await cloudinary.uploader.destroy(req.file.public_id, { resource_type: 'raw' });
            return res.status(400).json({ 
                success: false, 
                message: 'Job description PDF is empty or invalid' 
            });
        }

        // Check user's profile status
        const hasResume = user.pdf && user.pdf.resume;
        const hasLinkedIn = user.pdf && user.pdf.linkedin;
        
        let profileStatus = {
            hasResume,
            hasLinkedIn,
            requiresDocuments: false,
            canProceedWithExisting: false,
            canUploadTemporary: true // Always allow temporary uploads
        };

        // Apply business logic
        if (!hasResume && !hasLinkedIn) {
            // Case: No documents in profile - Can upload temporary OR permanent
            profileStatus.requiresDocuments = true;
        } else {
            // Case: Has at least one document - CAN proceed with existing OR upload temporary
            profileStatus.canProceedWithExisting = true;
        }

        res.status(200).json({
            success: true,
            message: 'Job description uploaded successfully',
            data: {
                jdCloudinaryUrl,
                jdText: jdText.substring(0, 200) + '...', // Preview only
                profileStatus,
                options: {
                    proceedWithExisting: profileStatus.canProceedWithExisting,
                    uploadTemporary: true, // Always available
                    updateProfile: !hasResume || !hasLinkedIn // Only if profile is incomplete
                }
            }
        });

    } catch (error) {
        console.error('Upload JD and check profile error:', error);
        
        // Clean up uploaded file on error
        if (req.file && req.file.public_id) {
            try {
                await cloudinary.uploader.destroy(req.file.public_id, { resource_type: 'raw' });
            } catch (cleanupError) {
                console.error('Error cleaning up file:', cleanupError);
            }
        }
        
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Step 2: Upload Documents - MODIFIED to support temporary and permanent uploads
const uploadProfileDocuments = async (req, res) => {
    try {
        const { profileId, documentType, uploadMode } = req.body; 
        // uploadMode: 'temporary' or 'permanent'
        
        // Validate input
        if (!profileId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Profile ID is required' 
            });
        }

        if (!documentType || !['resume', 'linkedin'].includes(documentType)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Document type must be either "resume" or "linkedin"' 
            });
        }

        if (!uploadMode || !['temporary', 'permanent'].includes(uploadMode)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Upload mode must be either "temporary" or "permanent"' 
            });
        }

        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                message: `${documentType} file is required` 
            });
        }
        
        // Find user by profileId
        const user = await UserProfile.findById(profileId);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Document file is already uploaded to Cloudinary via multer middleware
        const documentCloudinaryUrl = req.file.path;
        
        // Extract text to validate document
        const documentText = await extractTextFromPDF(documentCloudinaryUrl);
        if (!documentText || documentText.trim().length === 0) {
            // Delete the uploaded file if it's invalid
            await cloudinary.uploader.destroy(req.file.public_id, { resource_type: 'raw' });
            return res.status(400).json({ 
                success: false, 
                message: `${documentType} PDF is empty or invalid` 
            });
        }

        let responseData = {
            documentType,
            documentUrl: documentCloudinaryUrl,
            documentPreview: documentText.substring(0, 200) + '...',
            uploadMode,
            profileUpdated: false
        };

        // MODIFIED LOGIC: Only update profile if mode is 'permanent' AND profile field is empty
        if (uploadMode === 'permanent') {
            // Initialize pdf object if it doesn't exist
            if (!user.pdf) {
                user.pdf = {};
            }

            // Check if user already has this document type
            const existingDocument = user.pdf[documentType];
            
            if (!existingDocument) {
                // Profile field is empty - safe to update
                user.pdf[documentType] = documentCloudinaryUrl;
                await user.save();
                responseData.profileUpdated = true;
                responseData.message = `${documentType} saved to your profile permanently`;
            } else {
                // Profile field has document - ask for confirmation or treat as temporary
                responseData.message = `You already have a ${documentType} in your profile. This upload is treated as temporary.`;
                responseData.uploadMode = 'temporary'; // Override to temporary
                responseData.existingDocument = true;
            }
        } else {
            // Temporary mode - don't update profile
            responseData.message = `${documentType} uploaded for this analysis only (temporary)`;
        }

        res.status(200).json({
            success: true,
            message: responseData.message,
            data: responseData
        });

    } catch (error) {
        console.error('Upload profile documents error:', error);
        
        // Clean up uploaded file on error
        if (req.file && req.file.public_id) {
            try {
                await cloudinary.uploader.destroy(req.file.public_id, { resource_type: 'raw' });
            } catch (cleanupError) {
                console.error('Error cleaning up file:', cleanupError);
            }
        }
        
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Step 3: Perform score analysis - MODIFIED to support temporary documents
const scoreanalysis = async (req, res) => {
    try {
        const { 
            profileId, 
            jdCloudinaryUrl, 
            temporaryResumeUrl, 
            temporaryLinkedInUrl,
            useTemporary 
        } = req.body;
        
        // Validate input
        if (!jdCloudinaryUrl) {
            return res.status(400).json({ 
                success: false, 
                message: 'Job description Cloudinary URL is required' 
            });
        }

        if (!profileId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Profile ID is required' 
            });
        }
        
        // Find user by profileId
        const user = await UserProfile.findById(profileId);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Extract text from job description
        const jdText = await extractTextFromPDF(jdCloudinaryUrl);
        if (!jdText || jdText.trim().length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Job description is empty or invalid' 
            });
        }

        // MODIFIED: Determine document sources (temporary vs profile)
        let resumeUrl = null;
        let linkedinUrl = null;
        let resumeText = '';
        let linkedinText = '';
        let documentSource = '';

        // Priority logic for document selection:
        // 1. Use temporary documents if provided and useTemporary is true
        // 2. Fall back to profile documents
        // 3. Prefer resume over LinkedIn

        if (useTemporary && temporaryResumeUrl) {
            // Use temporary resume
            resumeUrl = temporaryResumeUrl;
            documentSource = 'temporary-resume';
            try {
                resumeText = await extractTextFromPDF(resumeUrl);
                if (!resumeText || resumeText.trim().length === 0) {
                    resumeUrl = null;
                    documentSource = '';
                }
            } catch (error) {
                console.error('Error extracting temporary resume text:', error);
                resumeUrl = null;
                documentSource = '';
            }
        } else if (useTemporary && temporaryLinkedInUrl) {
            // Use temporary LinkedIn
            linkedinUrl = temporaryLinkedInUrl;
            documentSource = 'temporary-linkedin';
            try {
                linkedinText = await extractTextFromPDF(linkedinUrl);
                if (!linkedinText || linkedinText.trim().length === 0) {
                    linkedinUrl = null;
                    documentSource = '';
                }
            } catch (error) {
                console.error('Error extracting temporary LinkedIn text:', error);
                linkedinUrl = null;
                documentSource = '';
            }
        }

        // Fall back to profile documents if no temporary docs or they failed
        if (!resumeUrl && !linkedinUrl) {
            const hasResumeInProfile = user.pdf && user.pdf.resume;
            const hasLinkedInInProfile = user.pdf && user.pdf.linkedin;

            if (hasResumeInProfile) {
                resumeUrl = user.pdf.resume;
                documentSource = 'profile-resume';
                try {
                    resumeText = await extractTextFromPDF(resumeUrl);
                    if (!resumeText || resumeText.trim().length === 0) {
                        resumeUrl = null;
                        documentSource = '';
                    }
                } catch (error) {
                    console.error('Error extracting profile resume text:', error);
                    resumeUrl = null;
                    documentSource = '';
                }
            }

            // Use LinkedIn only if resume is not available
            if (!resumeUrl && hasLinkedInInProfile) {
                linkedinUrl = user.pdf.linkedin;
                documentSource = 'profile-linkedin';
                try {
                    linkedinText = await extractTextFromPDF(linkedinUrl);
                    if (!linkedinText || linkedinText.trim().length === 0) {
                        linkedinUrl = null;
                        documentSource = '';
                    }
                } catch (error) {
                    console.error('Error extracting profile LinkedIn text:', error);
                    linkedinUrl = null;
                    documentSource = '';
                }
            }
        }

        // Clear LinkedIn text if we're using resume (priority logic)
        if (resumeUrl && resumeText) {
            linkedinText = '';
            console.log(`Using ${documentSource} for analysis`);
        } else if (linkedinUrl && linkedinText) {
            console.log(`Using ${documentSource} for analysis`);
        }

        // Final validation
        if (!resumeText && !linkedinText) {
            return res.status(400).json({ 
                success: false, 
                message: 'No valid documents found for analysis. Please upload at least one document.' 
            });
        }

        // Call Gemini API for analysis
        const analysisResult = await callGemini(jdText, resumeText, linkedinText, documentSource);

        if (analysisResult.error) {
            return res.status(500).json({
                success: false,
                message: 'Analysis failed',
                error: analysisResult.errorDetails
            });
        }

        // Save analysis result to database
        const scoreAnalysis = new ScoreAnalysis({
            profileId: profileId,
            jobDescription: jdText,
            resumeText: resumeText,
            linkedinText: linkedinText,
            score: analysisResult.score,
            reasoning: analysisResult.reasoning,
            suggestions: analysisResult.suggestions,
            analysisType: resumeText ? 'resume' : 'linkedin',
            documentSource: documentSource // Track if temporary or profile document was used
        });

        await scoreAnalysis.save();

        // Clean up temporary documents after analysis (optional)
        if (useTemporary) {
            setTimeout(async () => {
                try {
                    if (temporaryResumeUrl) {
                        const publicId = extractPublicIdFromUrl(temporaryResumeUrl);
                        if (publicId) {
                            await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
                        }
                    }
                    if (temporaryLinkedInUrl) {
                        const publicId = extractPublicIdFromUrl(temporaryLinkedInUrl);
                        if (publicId) {
                            await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
                        }
                    }
                } catch (cleanupError) {
                    console.warn('Could not clean up temporary documents:', cleanupError);
                }
            }, 5000); // Clean up after 5 seconds
        }

        // Return successful response
        res.status(200).json({
            success: true,
            message: 'Score analysis completed successfully',
            data: {
                analysisId: scoreAnalysis._id,
                score: analysisResult.score,
                reasoning: analysisResult.reasoning,
                suggestions: analysisResult.suggestions,
                analysisDate: scoreAnalysis.createdAt,
                documentUsed: resumeText ? 'resume' : 'linkedin',
                documentSource: documentSource
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

// Helper function to extract public_id from Cloudinary URL
function extractPublicIdFromUrl(cloudinaryUrl) {
    try {
        const matches = cloudinaryUrl.match(/\/FutureGuide_Uploads\/([^\/]+)\./);
        return matches ? `FutureGuide_Uploads/${matches[1]}` : null;
    } catch (error) {
        console.error('Error extracting public_id:', error);
        return null;
    }
}

// Keep existing Gemini functions with small modification
const callGemini = async (jdText, resumeText, linkedinText, documentSource = '') => {
    try {
        if (!jdText || jdText.trim().length === 0) {
            throw new Error('Job description is required and cannot be empty');
        }

        if ((!resumeText || resumeText.trim().length === 0) && 
            (!linkedinText || linkedinText.trim().length === 0)) {
            throw new Error('At least one of resume or LinkedIn profile must be provided');
        }

        // Create intelligent prompt with document source context
        const prompt = createIntelligentPrompt(jdText, resumeText, linkedinText, documentSource);

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

        const parsedResponse = parseGeminiResponse(text);
        return enhanceResponse(parsedResponse, resumeText, linkedinText, documentSource);

    } catch (error) {
        console.error('Gemini API call failed:', error);
        
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

function createIntelligentPrompt(jdText, resumeText, linkedinText, documentSource) {
    const hasResume = resumeText && resumeText.trim().length > 0;
    const hasLinkedIn = linkedinText && linkedinText.trim().length > 0;

    let prompt = `You are an expert career counselor and recruiter. Analyze the following job application materials against the provided job description.

Document Source Context: ${documentSource}

Job Description:
${jdText}

`;

    if (hasResume) {
        prompt += `Resume:
${resumeText}

ANALYSIS INSTRUCTIONS:
- Focus analysis on the resume content against job requirements
- Provide detailed resume-specific feedback
- Document source: ${documentSource}
`;
    } else if (hasLinkedIn) {
        prompt += `LinkedIn Profile:
${linkedinText}

ANALYSIS INSTRUCTIONS:
- Focus analysis on the LinkedIn profile content against job requirements
- Provide detailed LinkedIn-specific feedback
- Document source: ${documentSource}
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

function parseGeminiResponse(text) {
    try {
        let cleanText = text.trim();
        cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleanText = jsonMatch[0];
        }

        const parsed = JSON.parse(cleanText);
        
        if (typeof parsed.score !== 'number' || 
            !parsed.reasoning || 
            !Array.isArray(parsed.suggestions)) {
            throw new Error('Invalid response format from Gemini');
        }

        parsed.score = Math.max(0, Math.min(100, parsed.score));
        
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

function enhanceResponse(parsedResponse, resumeText, linkedinText, documentSource) {
    const hasResume = resumeText && resumeText.trim().length > 0;
    const hasLinkedIn = linkedinText && linkedinText.trim().length > 0;
    
    let dataContext = '';
    if (hasResume) {
        dataContext = `Analysis based on resume (${documentSource})`;
    } else if (hasLinkedIn) {
        dataContext = `Analysis based on LinkedIn profile (${documentSource})`;
    }
    
    return {
        ...parsedResponse,
        dataContext,
        documentSource,
        timestamp: new Date().toISOString()
    };
}

// Keep existing helper functions
const getScoreHistory = async (req, res) => {
    try {
        const { profileId } = req.params;
        
        if (!profileId) {
            return res.status(400).json({
                success: false,
                message: 'Profile ID is required'
            });
        }

        const analyses = await ScoreAnalysis.find({ profileId: profileId })
            .sort({ createdAt: -1 })
            .limit(10)
            .select('score reasoning suggestions createdAt analysisType documentSource');

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

const getProfileDocumentStatus = async (req, res) => {
    try {
        const { profileId } = req.params;
        
        if (!profileId) {
            return res.status(400).json({
                success: false,
                message: 'Profile ID is required'
            });
        }

        const user = await UserProfile.findById(profileId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const hasResume = user.pdf && user.pdf.resume;
        const hasLinkedIn = user.pdf && user.pdf.linkedin;

        res.status(200).json({
            success: true,
            message: 'Profile document status retrieved successfully',
            data: {
                hasResume,
                hasLinkedIn,
                resumeUrl: hasResume ? user.pdf.resume : null,
                linkedinUrl: hasLinkedIn ? user.pdf.linkedin : null,
                canAnalyze: hasResume || hasLinkedIn,
                allowTemporaryUpload: true,
                allowProfileUpdate: !hasResume || !hasLinkedIn
            }
        });

    } catch (error) {
        console.error('Get profile document status error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

module.exports = {
    isworking,
    uploadJDAndCheckProfile,
    uploadProfileDocuments,
    scoreanalysis,
    getScoreHistory,
    getProfileDocumentStatus
};