const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Verify that all required environment variables are present
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error("ERROR: Cloudinary credentials missing in environment variables!");
    // Don't throw error here to allow app to start, but the upload functionality will fail
}

// Step 1: Configure Cloudinary with your credentials
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Step 2: Define a single Cloudinary folder for all uploads
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        // We'll use just one folder for everything
        const folder = "FutureGuide_Uploads";

        // Determine if the file is an image or raw document
        const isImage = file.mimetype.startsWith("image/");
        const resourceType = isImage ? "image" : "raw";

        return {
            folder,
            resource_type: resourceType, // Important: "raw" is required for non-image files like PDFs
            allowed_formats: ["jpg", "jpeg", "png", "pdf", "doc", "docx"], // Optional filter
        };
    },
});

// Step 3: Create the upload middleware
const upload = multer({ storage });

module.exports = {
    cloudinary,
    upload,
};
