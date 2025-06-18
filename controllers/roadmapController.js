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
        const { title } = req.body;
        if (!title) return res.status(400).json({ message: 'Title is required' });

        const roadmapObj = await generateRoadmapWithGemini(title);

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

module.exports = {
    createRoadmap,
    getAllRoadmaps
};
