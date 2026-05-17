import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['JOB_MATCH', 'CODE_EXECUTION', 'SYSTEM', 'ADMIN_ALERT'],
        default: 'SYSTEM'
    },
    isRead: {
        type: Boolean,
        default: false
    },
    linkUrl: {
        type: String,
        default: null
    }
}, { timestamps: true })

const Notification = mongoose.model('Notification', notificationSchema)
export default Notification
