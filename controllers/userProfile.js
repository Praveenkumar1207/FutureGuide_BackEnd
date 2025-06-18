const UserProfile = require('../models/userProfileSchema');

// Helper to extract file URLs from req.files
function extractFileUrls(files, fieldName) {
    if (files && files[fieldName] && files[fieldName][0] && files[fieldName][0].path) {
        return files[fieldName][0].path;
    }
    return undefined;
}

// Validate required fields for profile creation
function validateProfileData(data) {
    const requiredFields = [
        "firstName", "lastName", "gender", "college", "branch",
        "year", "course", "specialization", "mobile", "Profile_image_path"
    ];
    const missing = requiredFields.filter(f => !data[f] || data[f].length === 0);
    return missing;
}

// Create a new user profile
const createProfile = async (req, res) => {
    try {
        // Extract file URLs from req.files
        const profileImageUrl = extractFileUrls(req.files, "Profile_image_path");
        const resumeUrl = extractFileUrls(req.files, "Resume_path");
        const jobDescUrl = extractFileUrls(req.files, "Job_description_path");
        const linkedInDataUrl = extractFileUrls(req.files, "LinkedIn_data_path");

        // Merge file URLs with other fields from req.body
        const profileData = {
            ...req.body,
            Profile_image_path: profileImageUrl,
            Resume_path: resumeUrl,
            Job_description_path: jobDescUrl,
            LinkedIn_data_path: linkedInDataUrl,
        };

        // Remove undefined fields (if file not uploaded)
        Object.keys(profileData).forEach(
            key => profileData[key] === undefined && delete profileData[key]
        );

        // If skill is sent as a string (e.g., from form), convert to array
        if (typeof profileData.skill === "string") {
            profileData.skill = profileData.skill.split(',').map(s => s.trim());
        }

        // Validate required fields
        const missingFields = validateProfileData(profileData);
        if (missingFields.length > 0) {
            return res.status(400).json({ error: `Missing required fields: ${missingFields.join(', ')}` });
        }

        // Check for duplicate mobile
        const existingMobile = await UserProfile.findOne({ mobile: profileData.mobile });
        if (existingMobile) {
            return res.status(400).json({ error: 'Profile with this mobile already exists' });
        }
        // Check for duplicate login_id if provided
        if (profileData.login_id) {
            const existingLoginId = await UserProfile.findOne({ login_id: profileData.login_id });
            if (existingLoginId) {
                return res.status(400).json({ error: 'Profile with this login_id already exists' });
            }
        }

        const profile = new UserProfile(profileData);
        const savedProfile = await profile.save();
        res.status(201).json(savedProfile);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get all profiles
const getAllProfiles = async (req, res) => {
    try {
        const profiles = await UserProfile.find();
        res.json(profiles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get profile by login_id
const getProfileByLoginId = async (req, res) => {
    try {
        const profile = await UserProfile.findOne({ login_id: req.params.login_id });
        if (!profile) return res.status(404).json({ message: "Profile not found" });
        res.json(profile);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update profile by login_id
const updateProfile = async (req, res) => {
    try {
        // If files are uploaded, extract their URLs
        let updateData = { ...req.body };
        if (req.files) {
            const profileImageUrl = extractFileUrls(req.files, "Profile_image_path");
            const resumeUrl = extractFileUrls(req.files, "Resume_path");
            const jobDescUrl = extractFileUrls(req.files, "Job_description_path");
            const linkedInDataUrl = extractFileUrls(req.files, "LinkedIn_data_path");

            if (profileImageUrl) updateData.Profile_image_path = profileImageUrl;
            if (resumeUrl) updateData.Resume_path = resumeUrl;
            if (jobDescUrl) updateData.Job_description_path = jobDescUrl;
            if (linkedInDataUrl) updateData.LinkedIn_data_path = linkedInDataUrl;
        }

        // If skill is sent as a string, convert to array
        if (typeof updateData.skill === "string") {
            updateData.skill = updateData.skill.split(',').map(s => s.trim());
        }

        const updated = await UserProfile.findOneAndUpdate(
            { login_id: req.params.login_id },
            updateData,
            { new: true }
        );
        if (!updated) return res.status(404).json({ message: "Profile not found" });
        res.json(updated);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Delete profile by login_id
const deleteProfile = async (req, res) => {
    try {
        const deleted = await UserProfile.findOneAndDelete({ login_id: req.params.login_id });
        if (!deleted) return res.status(404).json({ message: "Profile not found" });
        res.json({ message: "Profile deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    createProfile,
    getAllProfiles,
    getProfileByLoginId,
    updateProfile,
    deleteProfile
};