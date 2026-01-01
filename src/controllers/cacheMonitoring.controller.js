import redis from '../config/redis.js'
import { invalidateUserCache } from '../utils/cache.utils.js'

/**
 * Cache metrics tracking
 */
let cacheMetrics = {
    hits: 0,
    misses: 0,
    errors: 0,
    lastReset: new Date(),
}

/**
 * Track cache hit
 */
export const recordCacheHit = () => {
    cacheMetrics.hits++
}

/**
 * Track cache miss
 */
export const recordCacheMiss = () => {
    cacheMetrics.misses++
}

/**
 * Track cache error
 */
export const recordCacheError = () => {
    cacheMetrics.errors++
}

/**
 * Get cache statistics
 */
export const getCacheStats = async (req, res) => {
    try {
        const info = await redis.info('stats')
        const memory = await redis.info('memory')

        // Parse Redis info
        const parseInfo = (infoStr) => {
            const lines = infoStr.split('\r\n')
            const stats = {}
            lines.forEach(line => {
                if (line && !line.startsWith('#')) {
                    const [key, value] = line.split(':')
                    if (key && value) {
                        stats[key] = value
                    }
                }
            })
            return stats
        }

        const statsData = parseInfo(info)
        const memoryData = parseInfo(memory)

        // Calculate hit ratio
        const totalRequests = cacheMetrics.hits + cacheMetrics.misses
        const hitRatio = totalRequests > 0 ? (cacheMetrics.hits / totalRequests * 100).toFixed(2) : 0

        // Get Redis key count
        const dbsize = await redis.dbsize()

        res.json({
            success: true,
            data: {
                metrics: {
                    hits: cacheMetrics.hits,
                    misses: cacheMetrics.misses,
                    errors: cacheMetrics.errors,
                    totalRequests,
                    hitRatio: `${hitRatio}%`,
                    lastReset: cacheMetrics.lastReset,
                },
                redis: {
                    keys: dbsize,
                    memoryUsed: memoryData.used_memory_human || memoryData.used_memory,
                    memoryPeak: memoryData.used_memory_peak_human || memoryData.used_memory_peak,
                    connectedClients: statsData.connected_clients,
                    totalCommandsProcessed: statsData.total_commands_processed,
                    keyspaceHits: statsData.keyspace_hits,
                    keyspaceMisses: statsData.keyspace_misses,
                    redisHitRatio: statsData.keyspace_hits && statsData.keyspace_misses
                        ? ((statsData.keyspace_hits / (parseInt(statsData.keyspace_hits) + parseInt(statsData.keyspace_misses))) * 100).toFixed(2) + '%'
                        : 'N/A',
                },
            },
        })
    } catch (error) {
        console.error('Error fetching cache stats:', error)
        res.status(500).json({
            success: false,
            message: 'Error fetching cache statistics',
            error: error.message,
        })
    }
}

/**
 * Reset cache statistics
 */
export const resetCacheStats = (req, res) => {
    cacheMetrics = {
        hits: 0,
        misses: 0,
        errors: 0,
        lastReset: new Date(),
    }

    res.json({
        success: true,
        message: 'Cache statistics reset successfully',
    })
}

/**
 * Get Redis health check
 */
export const getCacheHealth = async (req, res) => {
    try {
        const start = Date.now()
        await redis.ping()
        const latency = Date.now() - start

        const memory = await redis.info('memory')
        const parseMemory = (infoStr) => {
            const lines = infoStr.split('\r\n')
            const stats = {}
            lines.forEach(line => {
                if (line && !line.startsWith('#')) {
                    const [key, value] = line.split(':')
                    if (key && value) stats[key] = value
                }
            })
            return stats
        }

        const memoryData = parseMemory(memory)
        const memoryUsedBytes = parseInt(memoryData.used_memory)
        const maxMemoryBytes = parseInt(memoryData.maxmemory) || 0

        const memoryPercentage = maxMemoryBytes > 0
            ? ((memoryUsedBytes / maxMemoryBytes) * 100).toFixed(2)
            : 'N/A'

        const status = latency < 50 ? 'healthy' : latency < 200 ? 'degraded' : 'slow'

        res.json({
            success: true,
            data: {
                status,
                latency: `${latency}ms`,
                memoryUsed: memoryData.used_memory_human,
                memoryPercentage: maxMemoryBytes > 0 ? `${memoryPercentage}%` : 'unlimited',
                uptime: memoryData.uptime_in_seconds ? `${(parseInt(memoryData.uptime_in_seconds) / 3600).toFixed(2)} hours` : 'N/A',
            },
        })
    } catch (error) {
        console.error('Redis health check error:', error)
        res.status(503).json({
            success: false,
            status: 'unhealthy',
            message: 'Redis connection failed',
            error: error.message,
        })
    }
}

/**
 * Cache warming utility - Preload popular content
 */
export const warmCache = async (req, res) => {
    try {
        const warmedKeys = []

        // Import models
        const { DSAProblem, Company, MockInterview } = await import('../models/index.js')

        // 1. Warm popular DSA problems (top 20 by acceptance rate)
        const popularDSA = await DSAProblem.find({ isActive: true })
            .sort('-acceptance')
            .limit(20)
            .select('-solution -testCases')
            .populate('companies', 'name slug')

        for (const problem of popularDSA) {
            const cacheKey = `dsa:problem:${problem._id}`
            await redis.setex(cacheKey, 3600, JSON.stringify(problem))
            warmedKeys.push(cacheKey)
        }

        // 2. Warm top companies (top 15 by applicants)
        const popularCompanies = await Company.find({ isActive: true })
            .sort('-stats.totalApplicants')
            .limit(15)
            .populate('rolesData.linkedDSAProblems.problem')
            .populate('rolesData.linkedDevProblems.problem')

        for (const company of popularCompanies) {
            const cacheKey = `company:detail:${company._id}`
            await redis.setex(cacheKey, 1800, JSON.stringify(company))
            warmedKeys.push(cacheKey)
        }

        // 3. Warm popular mock interviews
        const popularMockInterviews = await MockInterview.find({ isActive: true })
            .sort('-createdAt')
            .limit(10)

        for (const interview of popularMockInterviews) {
            const cacheKey = `mock:interview:${interview._id}`
            await redis.setex(cacheKey, 1800, JSON.stringify(interview))
            warmedKeys.push(cacheKey)
        }

        res.json({
            success: true,
            message: `Cache warmed successfully with ${warmedKeys.length} keys`,
            data: {
                warmedKeys: warmedKeys.length,
                dsaProblems: popularDSA.length,
                companies: popularCompanies.length,
                mockInterviews: popularMockInterviews.length,
            },
        })
    } catch (error) {
        console.error('Cache warming error:', error)
        res.status(500).json({
            success: false,
            message: 'Error warming cache',
            error: error.message,
        })
    }
}

/**
 * Clear all cache (use with caution!)
 */
export const clearAllCache = async (req, res) => {
    try {
        await redis.flushdb()

        // Reset metrics
        cacheMetrics = {
            hits: 0,
            misses: 0,
            errors: 0,
            lastReset: new Date(),
        }

        res.json({
            success: true,
            message: 'All cache cleared successfully',
        })
    } catch (error) {
        console.error('Clear cache error:', error)
        res.status(500).json({
            success: false,
            message: 'Error clearing cache',
            error: error.message,
        })
    }
}
