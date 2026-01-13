import { Queue } from 'bullmq'
import Redis from 'ioredis'
import dotenv from 'dotenv'

dotenv.config()

// Redis connection configuration
const connection = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null, // Important for BullMQ
    enableReadyCheck: false,
})

// Log Redis connection status
connection.on('connect', () => {
    console.log('✅ Redis connected for BullMQ')
})

connection.on('error', (error) => {
    console.error('❌ Redis connection error:', error.message)
})

// Default queue options
const defaultQueueOptions = {
    connection,
    defaultJobOptions: {
        attempts: 3, // Retry up to 3 times
        backoff: {
            type: 'exponential',
            delay: 2000, // 2s, 4s, 8s
        },
        removeOnComplete: {
            age: 3600, // Keep completed jobs for 1 hour
            count: 1000, // Keep last 1000 completed jobs
        },
        removeOnFail: {
            age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
    },
}

// Create code execution queue
export const codeExecutionQueue = new Queue('code-execution', defaultQueueOptions)

console.log('📋 BullMQ queues initialized:')
console.log('   - code-execution')

// Export connection for workers
export { connection }
