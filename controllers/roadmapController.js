const Roadmap = require('../models/roadmap');
// const { GoogleGenerativeAI } = require('@google/generative-ai'); // Not used for mock

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
    // Add more mappings as needed
    return { icon: 'school', iconSet: 'MaterialIcons' }; // generic fallback
}

// Use this mock function instead of Gemini for now
async function generateRoadmapWithGemini(title) {
    const { icon, iconSet } = getVectorIconForTitle(title);
    return {
        name: title,
        icon, // icon name for React Native Vector Icons
        iconSet, // icon set name for React Native Vector Icons
        initialMilestones: [
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
        ]
    };
}

exports.createRoadmap = async (req, res) => {
    try {
        const { title } = req.body;
        if (!title) return res.status(400).json({ message: 'Title is required' });

        const roadmapObj = await generateRoadmapWithGemini(title);

        const roadmap = new Roadmap(roadmapObj);
        await roadmap.save();

        res.status(201).json(roadmap);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getAllRoadmaps = async (req, res) => {
    try {
        const roadmaps = await Roadmap.find().sort({ createdAt: -1 });
        res.json(roadmaps);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
