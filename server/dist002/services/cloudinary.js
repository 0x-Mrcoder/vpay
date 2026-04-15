"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToCloudinary = void 0;
const cloudinary_1 = require("cloudinary");
// Configuration will be handled by environment variables
// CLOUDINARY_URL or individual CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
const uploadToCloudinary = async (fileStr, folder) => {
    try {
        const uploadResponse = await cloudinary_1.v2.uploader.upload(fileStr, {
            folder: `vtstack/${folder}`,
            resource_type: 'auto',
        });
        return uploadResponse.secure_url;
    }
    catch (error) {
        console.error('Cloudinary upload error:', error);
        throw new Error('Failed to upload image to Cloudinary');
    }
};
exports.uploadToCloudinary = uploadToCloudinary;
exports.default = {
    uploadToCloudinary: exports.uploadToCloudinary
};
//# sourceMappingURL=cloudinary.js.map