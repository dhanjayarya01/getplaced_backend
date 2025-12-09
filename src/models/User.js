import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
    {
        googleId: {
            type: String,
            required: true,
            unique: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        name: {
            type: String,
            required: true,
        },
        profilePicture: {
            type: String,
        },
    },
    {
        timestamps: true, // Adds createdAt and updatedAt
    }
)

const User = mongoose.model('User', userSchema)

export default User
