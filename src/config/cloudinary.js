import { v2 as cloudinary } from 'cloudinary'
import dotenv from 'dotenv'

dotenv.config()

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dalk0qwux',
    api_key: process.env.CLOUDINARY_API_KEY || '727812226962826',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'nkVVfEG3NsGzPQ-UlhgPeeAuNOk',
})

export default cloudinary
