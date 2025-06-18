const Chat = require("../models/chatsschema");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });
const mongoose = require("mongoose");
async function generateGeminiResponse(prompt) {
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

// ✅ 1. Create new chat (chat name + answer from Gemini)
const createSmartChat = async (req, res) => {
  try {
    const { profileId, question } = req.body;

    // Validate required fields
    if (!profileId || !question) {
      return res.status(400).json({ error: "profileId and question are required" });
    }

    const chatNamePrompt = `Suggest a short= title (max 6 words) for this question: "${question} just give  title thats it"`;
    const answerPrompt = question + "\n\nProvide a concise answer to the above question.with 2 to 3 lines or less thats it7";

    const chatName = await generateGeminiResponse(chatNamePrompt);
    const answer = await generateGeminiResponse(answerPrompt);

    const newChat = new Chat({
      profileId,
      chatName,
      messages: [{ question, answer }],
    });

    await newChat.save();
    res.status(200).json(newChat);
  } catch (err) {
    console.error("Create chat error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ 2. Add new message to existing chat
const sendMessageToChat = async (req, res) => {
  try {
    const { chatId, question } = req.body;

    const answer = await generateGeminiResponse(question);
    const chat = await Chat.findById(chatId);

    if (!chat) return res.status(404).json({ error: "Chat not found" });

    chat.messages.push({ question, answer });
    await chat.save();

    res.status(200).json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ 4. Get chat by ID
const getChatById = async (req, res) => {
    try {
        const { chatId } = req.params;
        const chat = await Chat.findById(chatId);
        if (!chat) return res.status(404).json({ error: "Chat not found" });
    res.status(200).json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ 3. Get all chats
const getAllChats = async (req, res) => {
  try {
    const chats = await Chat.find();
    res.status(200).json(chats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ 5. Manually update chat name
const updateChatName = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { newName } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    chat.chatName = newName;
    await chat.save();

    res.status(200).json({ message: "Chat name updated", chat });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getchatByProfileId = async (req, res) => {
    try {
        const { profileId } = req.params;

        // Validate if the provided profileId is a valid ObjectId format
        if (!mongoose.Types.ObjectId.isValid(profileId)) {
            return res.status(400).json({ error: "Invalid Profile ID format." });
        }

        // Convert the string profileId to a MongoDB ObjectId
        const objectIdProfileId = new mongoose.Types.ObjectId(profileId);

        // Use the ObjectId for the query
        const chats = await Chat.find({ profileId: objectIdProfileId }, { _id: 1, chatName: 1 });

        if (!chats || chats.length === 0) {
            return res.status(404).json({ error: "No chats found for this profile" });
        }

        res.status(200).json(chats);
    } catch (err) {
        console.error("Error in getchatByProfileId:", err);
        res.status(500).json({ error: err.message });
    }
};

// ✅ 6. Delete chat
const deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    await Chat.findByIdAndDelete(chatId);
    res.status(200).json({ message: "Chat deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ 7. Delete all chats
const deleteAllChats = async (req, res) => {
  try {
    await Chat.deleteMany();
    res.status(200).json({ message: "All chats deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ 8. Get chat stats
const getChatStats = async (req, res) => {
  try {
    const totalChats = await Chat.countDocuments();
    const totalMessages = (await Chat.find()).reduce((sum, c) => sum + c.messages.length, 0);
    res.status(200).json({ totalChats, totalMessages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createSmartChat,
  sendMessageToChat,
  getChatById,
  getAllChats,
  updateChatName,
  getchatByProfileId,
  deleteChat,
  deleteAllChats,
  getChatStats
};
