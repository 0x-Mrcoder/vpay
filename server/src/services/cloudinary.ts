import { v2 as cloudinary } from 'cloudinary';

// Configuration will be handled by environment variables
// CLOUDINARY_URL or individual CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

export const uploadToCloudinary = async (fileStr: string, folder: string) => {
    try {
        const uploadResponse = await cloudinary.uploader.upload(fileStr, {
            folder: `vtstack/${folder}`,
            resource_type: 'auto',
        });
        return uploadResponse.secure_url;
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw new Error('Failed to upload image to Cloudinary');
    }
};

export default {
    uploadToCloudinary
};
