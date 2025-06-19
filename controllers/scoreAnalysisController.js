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

Return in this format:
ROLE: [job title and level]
REQUIRED_SKILLS: [list required technical skills]
EXPERIENCE: [years of experience needed]
EDUCATION: [education requirements]
RESPONSIBILITIES: [main job duties]`;
}

function createProfilePrompt(resumeText, linkedinText) {
    const combinedText = `RESUME:\n${resumeText}\n\nLINKEDIN:\n${linkedinText}`;
    
    return `Analyze this candidate profile:

${combinedText}

Return in this format:
SKILLS: [list of technical skills]
EXPERIENCE: [years of experience and key roles]
EDUCATION: [education background]
ACHIEVEMENTS: [notable accomplishments]
EXPERTISE: [domain knowledge]`;
}

function createScoringPrompt(jdAnalysis, profileAnalysis) {
  return `You are an expert hiring analyst. Score the candidate based on how well their profile matches the job description.

🔹 JOB DESCRIPTION:
${jdAnalysis}

🔹 CANDIDATE PROFILE (Combined Resume + LinkedIn Summary):
${profileAnalysis}

🎯 ANALYSIS & SCORING INSTRUCTIONS:
- Score strictly from 0 to 100 based on how closely the candidate meets the job requirements.
- Evaluate across the following categories:
  1. Technical Skills (30%)
  2. Relevant Work Experience (25%)
  3. Educational Background (15%)
  4. Domain or Industry Fit (15%)
  5. Soft Skills (Communication, Teamwork, etc.) (10%)
  6. Growth Potential (Career progression, certifications, attitude to learning) (5%)

🔍 GAP DETECTION:
- Clearly list any significant mismatches or missing elements between the candidate’s profile and the job description.
- Focus on skills, qualifications, tools, domain expertise, or certifications the candidate lacks.

💡 IMPROVEMENT SUGGESTIONS:
- Provide **detailed, personalized, and actionable suggestions**.
- Each suggestion should clearly explain **what** to improve, **why** it matters for the role, and **how** the candidate can bridge the gap.
- Suggestions should help increase the candidate's alignment score in a real-world job application.

⚠️ YOU MUST RESPOND WITH VALID JSON ONLY. NO EXPLANATION TEXT. NO MARKDOWN.
⚠️ YOUR ENTIRE RESPONSE MUST BE PARSEABLE AS JSON.

{
  "score": <integer between 0 and 100>,
  "breakdown": {
    "technical_skills": <integer>,
    "experience": <integer>,
    "education": <integer>,
    "domain_fit": <integer>,
    "soft_skills": <integer>,
    "growth_potential": <integer>
  },
  "gaps": [
    "<short sentence describing each critical mismatch or missing requirement>"
  ],
  "suggestions": [
    "<detailed and helpful improvement suggestion 1>",
    "<detailed and helpful improvement suggestion 2>",
    "<detailed and helpful improvement suggestion 3>",
    "<detailed and helpful improvement suggestion 4>",
    "<detailed and helpful improvement suggestion 5>"
  ]
}

`;
}


// Simple JSON parser with proper fallback
function parseJSON(response) {
    try {
        // Clean the response
        let cleanResponse = response.trim();
        
        console.log("ATTEMPTING TO PARSE:", cleanResponse.substring(0, 200) + "...");
        
        // Remove markdown code blocks if present
        if (cleanResponse.startsWith('```json')) {
            cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanResponse.includes('```json')) {
            // Handle case where there might be text before the code block
            const jsonStart = cleanResponse.indexOf('```json') + 7;
            const jsonEnd = cleanResponse.indexOf('```', jsonStart);
            if (jsonEnd > jsonStart) {
                cleanResponse = cleanResponse.substring(jsonStart, jsonEnd).trim();
            }
        }
        
        // Find JSON object even if there's text before/after
        const startIndex = cleanResponse.indexOf('{');
        const endIndex = cleanResponse.lastIndexOf('}') + 1;
        
        if (startIndex !== -1 && endIndex > startIndex) {
            const jsonStr = cleanResponse.substring(startIndex, endIndex);
            return JSON.parse(jsonStr);
        }
        
        throw new Error('No valid JSON found');
    } catch (error) {
        console.error('JSON parsing failed:', error.message);
        
        // Return a safe fallback
        return {
            score: 50,
            breakdown: {
                technical_skills: 15,
                experience: 12,
                education: 8,
                domain_fit: 8,
                soft_skills: 5,
                growth_potential: 2
            },
            gaps: ["PDF extraction failed", "Unable to analyze content"],
            suggestions: ["Please upload readable PDF files", "Ensure PDFs contain text content"]
        };
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
        
        // Initialize Gemini model
        const model = genAI.getGenerativeModel({ 
            model: 'gemini-2.5-flash-preview-05-20',
            generationConfig: {
                maxOutputTokens: 2000,
                temperature: 0.3,
            }
        });
        
        console.log("🤖 Analyzing with Gemini...");
        
        // Step 1: Analyze Job Description
        const jdPrompt = createJDPrompt(jdText);
        const jdResponse = await model.generateContent(jdPrompt);
        const jdAnalysis = jdResponse.response.text();
        
        // Step 2: Analyze Candidate Profile
        const profilePrompt = createProfilePrompt(resumeText, linkedinText);
        // console.log("Profile prompt:", profilePrompt);

        const profileResponse = await model.generateContent(profilePrompt);
        // console.log("Profile response:", profileResponse);
        
        const profileAnalysis = profileResponse.response.text();
        console.log("Profile analysis response:", profileResponse.response.text());
        // Step 3: Score the match
        console.log("length of profileAnalysis:", profileAnalysis.length);
        console.log("📊 Scoring candidate against job description...");
        const scoringPrompt = createScoringPrompt(jdAnalysis, profileAnalysis);
        const scoringResponse = await model.generateContent(scoringPrompt);
        console.log("RAW SCORING RESPONSE:", scoringResponse.response.text());
        const scoringResult = parseJSON(scoringResponse.response.text());
        
        // Format for database (convert to arrays of strings as expected by schema)
        const analysisArray = [
            `Technical Skills: ${scoringResult.breakdown.technical_skills}/30`,
            `Experience: ${scoringResult.breakdown.experience}/25`,
            `Education: ${scoringResult.breakdown.education}/15`,
            `Domain Fit: ${scoringResult.breakdown.domain_fit}/15`,
            `Soft Skills: ${scoringResult.breakdown.soft_skills}/10`,
            `Growth Potential: ${scoringResult.breakdown.growth_potential}/10`
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