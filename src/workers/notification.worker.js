import { Worker } from 'bullmq'
import { connection } from '../queues/setup.js'
import { Notification } from '../models/index.js'

export const notificationWorker = new Worker(
    'notifications',
    async (job) => {
        const { userId, title, message, type, linkUrl } = job.data

        try {
            // Save to database
            const notification = await Notification.create({
                userId,
                title,
                message,
                type: type || 'SYSTEM',
                linkUrl: linkUrl || null
            })

            // Publish to Redis so SSE endpoints can pick it up and push to frontend
            const channelName = `user:${userId}:notifications`
            await connection.publish(channelName, JSON.stringify(notification))

            console.log(`[Notification] Sent to user ${userId}: ${title}`)
            return notification
        } catch (error) {
            console.error('[Notification Worker Error]', error)
            throw error
        }
    },
    { connection }
)

notificationWorker.on('failed', (job, err) => {
    console.error(`[Notification] Job ${job.id} failed:`, err.message)
})
