import dotenv from "dotenv"
import Redis from 'ioredis'


dotenv.config()
// Redis client configuration

console.log("$$$$$$$$$$$###############################",process.env.REDIS_HOST)


const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000)
        return delay
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
}

// Create Redis client
const redis = new Redis(redisConfig)

// Connection event handlers
redis.on('connect', () => {
    console.log('✅ Redis: Connecting...')
})

redis.on('ready', () => {
    console.log('✅ Redis: Connected and ready')
})

redis.on('error', (err) => {
    console.error('❌ Redis connection error:', err.message)
})

redis.on('close', () => {
    console.log('⚠️  Redis: Connection closed')
})

redis.on('reconnecting', () => {
    console.log('🔄 Redis: Reconnecting...')
})

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('📴 Redis: Gracefully shutting down...')
    await redis.quit()
})

export default redis
