const Roadmap = require('../models/roadmap');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load Gemini API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper: Map tech title keywords to vector icon names
function getVectorIconForTitle(title) {
    const lower = title.toLowerCase();
    if (lower.includes('react native')) return { icon: 'logo-react', iconSet: 'Ionicons' };
    if (lower.includes('react')) return { icon: 'logo-react', iconSet: 'Ionicons' };
    if (lower.includes('node')) return { icon: 'nodejs', iconSet: 'FontAwesome' };
    if (lower.includes('javascript')) return { icon: 'logo-javascript', iconSet: 'Ionicons' };
    if (lower.includes('python')) return { icon: 'language-python', iconSet: 'MaterialCommunityIcons' };
    if (lower.includes('java')) return { icon: 'language-java', iconSet: 'MaterialCommunityIcons' };
    if (lower.includes('android')) return { icon: 'android', iconSet: 'FontAwesome' };
    if (lower.includes('ios')) return { icon: 'logo-apple', iconSet: 'Ionicons' };
    if (lower.includes('mongodb')) return { icon: 'leaf', iconSet: 'FontAwesome' };
    if (lower.includes('data science')) return { icon: 'chart-line', iconSet: 'FontAwesome5' };
    if (lower.includes('full stack')) return { icon: 'layers', iconSet: 'Feather' };
    return { icon: 'school', iconSet: 'MaterialIcons' }; // fallback
}

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

const createRoadmap = async (req, res) => {
    try {
        const { title, profileId } = req.body;
        if (!title) return res.status(400).json({ message: 'Title is required' });
        if (!profileId) return res.status(400).json({ message: 'Profile ID is required' });

        const roadmapObj = await generateRoadmapWithGemini(title);
        roadmapObj.profileId = profileId; // Add profileId to the roadmap object

        const roadmap = new Roadmap(roadmapObj);
        await roadmap.save();

        res.status(201).json(roadmap);
    } catch (error) {
        console.error("Gemini Error:", error.message);
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
    getRoadmapById,
    updateRoadmap,
    deleteRoadmap,
    deleteAllProfileRoadmaps
};
