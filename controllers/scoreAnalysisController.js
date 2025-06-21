const scoreAnalysis = require('../models/scoreanalysis');
const { cloudinary, upload } = require('../config/cloudinaryConfig');
const mongoose = require('mongoose');
const { extractTextFromPDF, extractTextFromPDFWithRetry } = require('../utils/extractTextFromPDF');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Simple prompts that work
function createJDPrompt(jdText) {
    return `Extract key requirements from this job description:

${jdText}

Return in this exact JSON format only:
{
  "ROLE": "[job title and level]",
  "REQUIRED_SKILLS": ["list", "of", "required", "technical", "skills"],
  "EXPERIENCE": "[years of experience needed]",
  "EDUCATION": ["education", "requirements"],
  "RESPONSIBILITIES": ["main", "job", "duties"]
}`;
}
function createProfilePrompt(resumeText, linkedinText) {
    const combinedText = `RESUME:\n${resumeText}\n\nLINKEDIN:\n${linkedinText}`;
    
    return `Analyze this candidate profile:

${combinedText}

Return in this exact JSON format only:
{
  "SKILLS": ["list", "of", "technical", "skills"],
  "EXPERIENCE": "[years of experience and key roles]",
  "EDUCATION": ["education", "background"],
  "ACHIEVEMENTS": ["notable", "accomplishments"],
  "EXPERTISE": ["domain", "knowledge"]
}`;
}
function createScoringPrompt(jdAnalysis, profileAnalysis) {
  return `You are an expert hiring analyst. Score the candidate based on how well their profile matches the job description.

🔹 JOB DESCRIPTION:
${JSON.stringify(jdAnalysis)}

🔹 CANDIDATE PROFILE (Combined Resume + LinkedIn Summary):
${JSON.stringify(profileAnalysis)}

🎯 ANALYSIS & SCORING INSTRUCTIONS:
1. Score from 0-100 based on job requirements match
2. Scoring weights:
   - Technical Skills: 30%
   - Relevant Work Experience: 25%
   - Educational Background: 15%
   - Domain/Industry Fit: 15%
   - Soft Skills: 10%
   - Growth Potential: 5%

⚠️ YOU MUST RESPOND WITH VALID JSON ONLY. NO EXPLANATION TEXT. NO MARKDOWN.
⚠️ YOUR ENTIRE RESPONSE MUST BE PARSEABLE AS JSON.

{
  "score": <integer 0-100>,
  "breakdown": {
    "technical_skills": <integer 0-30>,
    "experience": <integer 0-25>,
    "education": <integer 0-15>,
    "domain_fit": <integer 0-15>,
    "soft_skills": <integer 0-10>,
    "growth_potential": <integer 0-5>
  },
  "gaps": [
    "<short gap description>"
  ],
  "suggestions": [
    "<detailed suggestion>"
  ]
}`;
}


// Simple JSON parser with proper fallback
function parseJSON(response) {
    try {
        // Remove markdown code blocks
        let cleanResponse = response.trim()
            .replace(/^```json\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();

        // Find JSON boundaries
        const startIdx = cleanResponse.indexOf('{');
        const endIdx = cleanResponse.lastIndexOf('}');
        
        if (startIdx === -1 || endIdx === -1) {
            throw new Error('No JSON object found');
        }

        const jsonStr = cleanResponse.substring(startIdx, endIdx + 1);
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error('JSON parsing error:', error.message);
        console.error('Original response:', response);
        
        // Return null to trigger retry
        return null;
    }
}
// Simple text cleaning
function cleanText(text) {
    if (!text) return "";
    
    return text
        .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
        .trim()
        .substring(0, 5000);   // Limit to 5000 characters
}

// Multer middleware
const uploadPDFs = upload.fields([
    { name: 'jobDescriptionPDF', maxCount: 1 },
    { name: 'resumePDF', maxCount: 1 },
    { name: 'linkedinPDF', maxCount: 1 }
]);

const isworking = async (req, res) => {
    return res.status(200).json("Analysis service is working");
}

const scoreanalysis = async (req, res) => {
    console.log("🚀 Starting analysis");
    const startTime = Date.now();
    
    try {
        // Validate environment
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ 
                message: "Gemini API key not configured",
                error: "CONFIG_ERROR"
            });
        }
        
        const { profileId } = req.body;
        
        if (!profileId || !mongoose.Types.ObjectId.isValid(profileId)) {
            return res.status(400).json({ message: "Valid profileId is required" });
        }

        // Check required files
        const jobDescription = req.files?.jobDescriptionPDF?.[0];
        const resume = req.files?.resumePDF?.[0];
        const linkedin = req.files?.linkedinPDF?.[0];

        if (!jobDescription) {
            return res.status(400).json({ message: "Job Description PDF is required" });
        }

        if (!resume && !linkedin) {
            return res.status(400).json({ 
                message: "At least Resume or LinkedIn PDF is required" 
            });
        }

        console.log("📄 Extracting text from PDFs...");
        
        // Extract text from PDFs
        let jdText = "";
        let resumeText = "";
        let linkedinText = "";
        
        // Extract Job Description (required)
        try {
            jdText = await extractTextFromPDFWithRetry(jobDescription.path);
            jdText = cleanText(jdText);
            console.log(`Job Description extracted: ${jdText.length} characters`);
            
            if (jdText.length < 50) {
                return res.status(400).json({ 
                    message: "Job Description PDF is empty or unreadable" 
                });
            }
        } catch (error) {
            console.error("JD extraction failed:", error.message);
            return res.status(400).json({ 
                message: "Failed to read Job Description PDF. Please ensure it contains readable text." 
            });
        }
        
        // Extract Resume (optional)
        if (resume) {
            try {
                resumeText = await extractTextFromPDFWithRetry(resume.path);
                resumeText = cleanText(resumeText);
                console.log(`Resume extracted: ${resumeText.length} characters`);
            } catch (error) {
                console.error("Resume extraction failed:", error.message);
                resumeText = "";
            }
        }
        
        // Extract LinkedIn (optional)
        if (linkedin) {
            try {
                linkedinText = await extractTextFromPDFWithRetry(linkedin.path);
                linkedinText = cleanText(linkedinText);
                console.log(`LinkedIn extracted: ${linkedinText.length} characters`);
            } catch (error) {
                console.error("LinkedIn extraction failed:", error.message);
                linkedinText = "";
            }
        }
        
        // Ensure we have candidate data
        if (!resumeText && !linkedinText) {
            return res.status(400).json({ 
                message: "Could not extract readable text from candidate PDFs" 
            });
        }
        
        // Initialize Gemini model with JSON mode
        const model = genAI.getGenerativeModel({ 
            model: 'gemini-1.5-flash-latest',
            generationConfig: {
                responseMimeType: 'application/json',
                maxOutputTokens: 2000,
                temperature: 0.3,
            }
        });
        
        console.log("🤖 Analyzing with Gemini...");
        
        // Step 1: Analyze Job Description with JSON enforcement
        const jdPrompt = `Extract key requirements from this job description:\n\n${jdText}\n\nReturn in this exact JSON format:\n{\n  "ROLE": "[job title]",\n  "REQUIRED_SKILLS": ["skill1", "skill2"],\n  "EXPERIENCE": "[years]",\n  "EDUCATION": ["degree"],\n  "RESPONSIBILITIES": ["duty1", "duty2"]\n}`;
        
        const jdResponse = await model.generateContent(jdPrompt);
        const jdAnalysis = parseJSON(jdResponse.response.text());
        
        if (!jdAnalysis) {
            console.error("Failed to parse JD analysis. Raw response:", jdResponse.response.text());
            return res.status(500).json({ 
                message: "Failed to analyze Job Description" 
            });
        }

        // Step 2: Analyze Candidate Profile with JSON enforcement
        const profilePrompt = `Analyze this candidate profile:\n\nRESUME:\n${resumeText}\n\nLINKEDIN:\n${linkedinText}\n\nReturn in this exact JSON format:\n{\n  "SKILLS": ["skill1", "skill2"],\n  "EXPERIENCE": "[years]",\n  "EDUCATION": ["degree"],\n  "ACHIEVEMENTS": ["achievement1"],\n  "EXPERTISE": ["domain"]\n}`;
        
        const profileResponse = await model.generateContent(profilePrompt);
        const profileAnalysis = parseJSON(profileResponse.response.text());
        
        if (!profileAnalysis) {
            console.error("Failed to parse profile analysis. Raw response:", profileResponse.response.text());
            return res.status(500).json({ 
                message: "Failed to analyze Candidate Profile" 
            });
        }

        // Step 3: Score the match with retries
        console.log("📊 Scoring candidate against job description...");
        let scoringResult = null;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (!scoringResult && retryCount < maxRetries) {
            try {
                const scoringPrompt = `You are an expert hiring analyst. Score candidate match (0-100) between:\n\nJOB DESCRIPTION:\n${JSON.stringify(jdAnalysis)}\n\nCANDIDATE PROFILE:\n${JSON.stringify(profileAnalysis)}\n\nReturn ONLY this JSON:\n{\n  "score": SCORE AFTER ANALYZING,\n  "breakdown": {\n    "technical_skills": Y,\n    "experience": C,\n    "education": Y,\n    "domain_fit": D,\n    "soft_skills": D,\n    "growth_potential": GP\n  },\n  "gaps": ["gap description"],\n  "suggestions": ["suggestion"]\n} ALL SCORTES MUST BE IN RANGE 0-100`;
                
                const scoringResponse = await model.generateContent(scoringPrompt);
                scoringResult = parseJSON(scoringResponse.response.text());
                
                // Validate scoring result structure
                if (!scoringResult || 
                    typeof scoringResult.score !== 'number' ||
                    !scoringResult.breakdown ||
                    !Array.isArray(scoringResult.gaps) ||
                    !Array.isArray(scoringResult.suggestions)) {
                    throw new Error("Invalid scoring structure");
                }
                
                console.log("Scoring successful on attempt", retryCount + 1);
            } catch (error) {
                console.error(`Scoring attempt ${retryCount + 1} failed:`, error.message);
                scoringResult = null;
                retryCount++;
            }
        }

        // Fallback if scoring fails after retries
        if (!scoringResult) {
            console.warn("Using fallback analysis after retry failure");
            scoringResult = {
                score: 50,
                breakdown: {
                    technical_skills: 15,
                    experience: 12,
                    education: 8,
                    domain_fit: 8,
                    soft_skills: 5,
                    growth_potential: 2
                },
                gaps: ["Temporary analysis error - please try again"],
                suggestions: ["Re-upload documents and retry analysis"]
            };
        }

        // Format for database
        const analysisArray = [
            `Technical Skills: ${scoringResult.breakdown.technical_skills}/100`,
            `Experience: ${scoringResult.breakdown.experience}/100`,
            `Education: ${scoringResult.breakdown.education}/100`,
            `Domain Fit: ${scoringResult.breakdown.domain_fit}/100`,
            `Soft Skills: ${scoringResult.breakdown.soft_skills}/100`,
            `Growth Potential: ${scoringResult.breakdown.growth_potential}/100`
        ];
        
        // Create and save analysis
        const newAnalysis = new scoreAnalysis({
            profileId,
            jobDescriptionPDF: jobDescription.path,
            resumePDF: resume?.path || null,
            linkedinPDF: linkedin?.path || null,
            score: scoringResult.score,
            suggestions: scoringResult.suggestions,
            analysis: analysisArray,
            timestamp: new Date()
        });
        
        const savedAnalysis = await newAnalysis.save();
        
        const processingTime = Date.now() - startTime;
        console.log(`✅ Analysis completed in ${processingTime}ms | Score: ${scoringResult.score}`);
        
        res.status(201).json({
            message: "Analysis completed successfully",
            data: savedAnalysis,
            processingTime: `${processingTime}ms`
        });
        
    } catch (error) {
        console.error("❌ Analysis failed:", error);
        res.status(500).json({ 
            message: "Analysis failed", 
            error: error.message 
        });
    }
};

const getAnalysisByProfileId = async (req, res) => {
    try {
        const { profileId } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(profileId)) {
            return res.status(400).json({ message: "Invalid profileId" });
        }

        const analyses = await scoreAnalysis.find({ profileId }).sort({ timestamp: -1 });
        
        if (analyses.length === 0) {
            return res.status(404).json({ message: "No analyses found for this profile" });
        }

        res.status(200).json({
            message: "Analyses retrieved successfully",
            data: analyses,
            count: analyses.length
        });
    } catch (error) {
        console.error("Error retrieving analyses:", error);
        res.status(500).json({ 
            message: "Error retrieving analyses", 
            error: error.message 
        });
    }
};

const getAnalysisById = async (req, res) => {
    try {
        const { analysisId } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(analysisId)) {
            return res.status(400).json({ message: "Invalid analysisId" });
        }

        const analysis = await scoreAnalysis.findById(analysisId);
        
        if (!analysis) {
            return res.status(404).json({ message: "Analysis not found" });
        }

        res.status(200).json({
            message: "Analysis retrieved successfully",
            data: analysis
        });
    } catch (error) {
        console.error("Error retrieving analysis:", error);
        res.status(500).json({ 
            message: "Error retrieving analysis", 
            error: error.message 
        });
    }
};

module.exports = {
    scoreanalysis,
    uploadPDFs,
    isworking,
    getAnalysisByProfileId,
    getAnalysisById
};