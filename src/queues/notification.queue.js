import { Queue } from 'bullmq'
import { connection } from './setup.js'

export const notificationQueue = new Queue('notifications', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000
        },
        removeOnComplete: true,
        removeOnFail: false
    }
})

/**
 * Helper to enqueue a new notification job
 * @param {Object} data 
 * @param {string} data.userId
 * @param {string} data.title
 * @param {string} data.message
 * @param {string} [data.type]
 * @param {string} [data.linkUrl]
 */
export async function sendNotification(data) {
    return notificationQueue.add('send-notification', data)
}
