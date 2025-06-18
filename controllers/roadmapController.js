const Roadmap = require('../models/roadmap');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper: Map tech title keywords to vector icon names
function getVectorIconForTitle(title) {
    const lower = title.toLowerCase();
    if (lower.includes('react native')) return 'react';
    if (lower.includes('react')) return 'react';
    if (lower.includes('node')) return 'nodejs';
    if (lower.includes('javascript')) return 'javascript';
    if (lower.includes('python')) return 'python';
    if (lower.includes('java')) return 'java';
    if (lower.includes('android')) return 'android';
    if (lower.includes('ios')) return 'apple';
    if (lower.includes('mongodb')) return 'mongodb';
    if (lower.includes('data science')) return 'chart-line';
    if (lower.includes('full stack')) return 'layers';
    return 'school'; // fallback
}

// Static milestones template
const defaultMilestones = [
    { id: 1, date: 'Day 1 - Day 10', title: 'HTML, CSS & Responsive Design', completed: false },
    { id: 2, date: 'Day 11 - Day 20', title: 'JavaScript Fundamentals (ES6+)', completed: false },
    { id: 3, date: 'Day 21 - Day 30', title: 'Advanced JS + DOM Manipulation', completed: false },
    { id: 4, date: 'Day 31 - Day 45', title: 'React.js Basics: Components, Props, Hooks', completed: false },
    { id: 5, date: 'Day 46 - Day 55', title: 'React Routing & State Management', completed: false },
    { id: 6, date: 'Day 56 - Day 70', title: 'React Native: Setup & Core Components', completed: false },
    { id: 7, date: 'Day 71 - Day 80', title: 'React Native UI & Navigation', completed: false },
    { id: 8, date: 'Day 81 - Day 95', title: 'Node.js & Express.js Fundamentals', completed: false },
    { id: 9, date: 'Day 96 - Day 105', title: 'MongoDB, Mongoose & REST APIs', completed: false },
    { id: 10, date: 'Day 106 - Day 115', title: 'Authentication & Authorization (JWT)', completed: false },
    { id: 11, date: 'Day 116 - Day 135', title: 'Full Stack Integration (FE & BE)', completed: false },
    { id: 12, date: 'Day 136 - Day 160', title: 'Capstone Project: Full Stack React Native App', completed: false },
    { id: 13, date: 'Day 161 - Day 180', title: 'Resume, GitHub, Portfolio & Deployment', completed: false },
    { id: 14, date: 'YouNailedIt', title: 'Congrats!', completed: false }
];

async function generateRoadmapWithGemini(title) {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-05-20' });

    const prompt = `
Generate a learning roadmap for the topic "${title}".
Respond in the following JSON format exactly:

{
  "initialMilestones": [
    { "id": 1, "date": "Day 1 - Day 10", "title": "Intro to XYZ", "completed": false },
    { "id": 2, "date": "Day 11 - Day 20", "title": "Intermediate XYZ", "completed": false },
    ...
    { "id": 14, "date": "YouNailedIt", "title": "Congrats!", "completed": false }
  ]
}
Replace "XYZ" with appropriate topic-based milestones.
Return ONLY the JSON — no explanation, no code block formatting.
`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    try {
        const parsed = JSON.parse(response); // Assumes Gemini returns plain JSON
        const { icon, iconSet } = getVectorIconForTitle(title);

        return {
            name: title,
            icon,
            iconSet,
            initialMilestones: parsed.initialMilestones
        };
    } catch (err) {
        throw new Error("Failed to parse Gemini response: " + err.message);
    }
}

// POST /api/roadmap/generate
const createRoadmap = async (req, res) => {
    try {
        const {
            title,
            careerInterest,
            primaryGoal,
            secondaryGoal,
            duration,
            profileId,
            login_id // <-- accept login_id from frontend
        } = req.body;

        if (!title) {
            return res.status(400).json({ message: 'title is required' });
        }
        if (!duration || isNaN(duration) || duration <= 0) {
            return res.status(400).json({ message: 'duration (in days) is required and must be a positive number' });
        }

        // Build a detailed prompt for Gemini
        const prompt = `
Given the following roadmap creation details:
- Title: "${title}"
- Career Interest: "${careerInterest || ''}"
- Primary Goal: "${primaryGoal || ''}"
- Secondary Goal: "${secondaryGoal || ''}"
- Duration: "${duration}" days

Generate a technology learning roadmap as a JavaScript object in this exact format:
{
  name: <string>, // Use the title as the name
  icon: <string>, // Suggest a relevant icon name (e.g. 'react', 'nodejs', etc.)
  initialMilestones: [
    { id: 1, date: 'Day X - Day Y', title: '<milestone 1>', completed: false },
    ...
    { id: N, date: 'YouNailedIt', title: 'Congrats!', completed: false }
  ]
}
- Divide the total duration (${duration} days) evenly among the milestones (about 10-14 milestones).
- The milestones should be tailored to the title and career interest.
- Only return the JavaScript object, no explanation, no code block formatting.
`;

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-05-20' });
        const result = await model.generateContent(prompt);
        const response = result.response.text().trim();

        // Parse Gemini's response (remove code block markers if present)
        let roadmapObj;
        try {
            let clean = response.replace(/```(javascript)?/g, '').trim();
            // Try to find the JS object in the response
            const match = clean.match(/\{[\s\S]*\}/);
            if (match) clean = match[0];
            roadmapObj = eval('(' + clean + ')');
        } catch (err) {
            return res.status(500).json({ error: 'Failed to parse Gemini roadmap output' });
        }

        // Optionally, override icon with your own mapping if you want
        if (!roadmapObj.icon) {
            roadmapObj.icon = getVectorIconForTitle(title);
        }

        // Save roadmap with login_id if provided
        const roadmapDoc = new Roadmap({
            profileId,
            login_id,
            title,
            careerInterest,
            goals: {
                primary: primaryGoal,
                secondary: secondaryGoal || ''
            },
            duration,
            generatedContent: {},
            milestones: [], // or roadmapObj.initialMilestones if you want to store them
            progress: {
                completedMilestones: 0,
                totalMilestones: 0,
                percentageComplete: 0
            }
        });
        await roadmapDoc.save();

        // Respond in the required format
        res.status(201).json({
            name: roadmapObj.name,
            icon: roadmapObj.icon,
            initialMilestones: roadmapObj.initialMilestones
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getAllRoadmaps = async (req, res) => {
    try {
        const roadmaps = await Roadmap.find().sort({ createdAt: -1 });
        res.json(roadmaps);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get roadmaps by profile ID
const getRoadmapsByProfileId = async (req, res) => {
    try {
        const { profileId } = req.params;
        if (!profileId) return res.status(400).json({ message: 'Profile ID is required' });
        
        const roadmaps = await Roadmap.find({ profileId }).sort({ createdAt: -1 });
        res.json(roadmaps);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get roadmaps by login_id
const getRoadmapsByLoginId = async (req, res) => {
    try {
        const { login_id } = req.params;
        if (!login_id) return res.status(400).json({ message: 'login_id is required' });

        const roadmaps = await Roadmap.find({ login_id }).sort({ createdAt: -1 });
        res.json(roadmaps);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get a specific roadmap by ID
const getRoadmapById = async (req, res) => {
    try {
        const { id } = req.params;
        const roadmap = await Roadmap.findById(id);
        
        if (!roadmap) {
            return res.status(404).json({ message: 'Roadmap not found' });
        }
        
        res.json(roadmap);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete a roadmap
const deleteRoadmap = async (req, res) => {
    try {
        const { id } = req.params;
        const roadmap = await Roadmap.findByIdAndDelete(id);
        
        if (!roadmap) {
            return res.status(404).json({ message: 'Roadmap not found' });
        }
        
        res.json({ message: 'Roadmap deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update a roadmap
const updateRoadmap = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        const roadmap = await Roadmap.findByIdAndUpdate(
            id, 
            updates,
            { new: true }
        );
        
        if (!roadmap) {
            return res.status(404).json({ message: 'Roadmap not found' });
        }
        
        res.json(roadmap);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete all roadmaps for a profile
const deleteAllProfileRoadmaps = async (req, res) => {
    try {
        const { profileId } = req.params;
        if (!profileId) return res.status(400).json({ message: 'Profile ID is required' });
        
        const result = await Roadmap.deleteMany({ profileId });
        
        res.json({ 
            message: 'Roadmaps deleted successfully', 
            count: result.deletedCount 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    createRoadmap,
    getAllRoadmaps,
    getRoadmapsByProfileId,
    getRoadmapsByLoginId, // <-- export new controller
    getRoadmapById,
    updateRoadmap,
    deleteRoadmap,
    deleteAllProfileRoadmaps
};
