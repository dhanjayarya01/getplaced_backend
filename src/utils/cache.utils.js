import redis from '../config/redis.js'

/**
 * Invalidate specific cache key
 */
export const invalidateCache = async (key) => {
    try {
        const result = await redis.del(key)
        if (result > 0) {
            console.log(`🗑️  Cache invalidated: ${key}`)
        }
        return result
    } catch (error) {
        console.error('Cache invalidation error:', error)
        return 0
    }
}

/**
 * Invalidate cache by pattern (e.g., 'companies:*')
 * WARNING: Use sparingly as KEYS command can be slow on large datasets
 */
export const invalidateCachePattern = async (pattern) => {
    try {
        const keys = await redis.keys(pattern)
        if (keys.length > 0) {
            await redis.del(...keys)
            console.log(`🗑️  Cache invalidated: ${keys.length} keys matching '${pattern}'`)
            return keys.length
        }
        return 0
    } catch (error) {
        console.error('Cache pattern invalidation error:', error)
        return 0
    }
}

/**
 * Invalidate all company-related caches
 */
export const invalidateCompanyCache = async (companyId = null) => {
    try {
        if (companyId) {
            // Invalidate specific company
            await invalidateCache(`company:detail:${companyId}`)
            await invalidateCache(`company:admin:problems:${companyId}`)
        }
        // Invalidate all company lists (different filter combinations)
        await invalidateCachePattern('companies:all:*')
        await invalidateCachePattern('companies:suggested:*')
        console.log(`✅ Company cache invalidated${companyId ? ` for ID: ${companyId}` : ''}`)
    } catch (error) {
        console.error('Company cache invalidation error:', error)
    }
}

/**
 * Invalidate DSA problem caches
 */
export const invalidateDSACache = async (problemId = null) => {
    try {
        if (problemId) {
            await invalidateCache(`dsa:problem:${problemId}`)
            // Also invalidate user submissions for this problem
            await invalidateCachePattern(`dsa:problem:${problemId}:submissions:*`)
        }
        await invalidateCachePattern('dsa:all:*')
        await invalidateCachePattern('dsa:interview:search:*')
        console.log(`✅ DSA cache invalidated${problemId ? ` for ID: ${problemId}` : ''}`)
    } catch (error) {
        console.error('DSA cache invalidation error:', error)
    }
}

/**
 * Invalidate development problem caches
 */
export const invalidateDevCache = async (problemId = null) => {
    try {
        if (problemId) {
            await invalidateCache(`dev:problem:${problemId}`)
        }
        await invalidateCachePattern('dev:all:*')
        console.log(`✅ Dev problem cache invalidated${problemId ? ` for ID: ${problemId}` : ''}`)
    } catch (error) {
        console.error('Dev cache invalidation error:', error)
    }
}

/**
 * Invalidate mock interview caches
 */
export const invalidateMockInterviewCache = async (interviewId = null) => {
    try {
        if (interviewId) {
            await invalidateCache(`mock:interview:${interviewId}`)
        }
        await invalidateCachePattern('mock:all:*')
        console.log(`✅ Mock interview cache invalidated${interviewId ? ` for ID: ${interviewId}` : ''}`)
    } catch (error) {
        console.error('Mock interview cache invalidation error:', error)
    }
}

/**
 * Invalidate user-specific caches (stats, progress, submissions)
 */
export const invalidateUserCache = async (userId) => {
    try {
        await invalidateCache(`user:progress:${userId}`)
        await invalidateCache(`dsa:stats:${userId}`)
        await invalidateCache(`dev:stats:${userId}`)
        await invalidateCachePattern(`companies:suggested:${userId}`)
        await invalidateCachePattern(`mock:sessions:${userId}:*`)
        await invalidateCachePattern(`*:user:${userId}*`)
        console.log(`✅ User cache invalidated for ID: ${userId}`)
    } catch (error) {
        console.error('User cache invalidation error:', error)
    }
}

/**
 * Invalidate interview session cache
 */
export const invalidateSessionCache = async (sessionId) => {
    try {
        await invalidateCache(`session:${sessionId}`)
        console.log(`✅ Session cache invalidated for ID: ${sessionId}`)
    } catch (error) {
        console.error('Session cache invalidation error:', error)
    }
}

/**
 * Clear all cache (use with caution!)
 */
export const clearAllCache = async () => {
    try {
        await redis.flushdb()
        console.log('🗑️  All cache cleared!')
    } catch (error) {
        console.error('Clear all cache error:', error)
    }
}

/**
 * Get cache statistics
 */
export const getCacheStats = async () => {
    try {
        const info = await redis.info('stats')
        const memory = await redis.info('memory')
        return {
            info,
            memory,
        }
    } catch (error) {
        console.error('Get cache stats error:', error)
        return null
    }
}

/**
 * Helper function to generate cache key from object
 */
export const generateCacheKey = (prefix, params) => {
    const sortedParams = Object.keys(params)
        .sort()
        .reduce((acc, key) => {
            if (params[key] !== undefined && params[key] !== null) {
                acc[key] = params[key]
            }
            return acc
        }, {})
    return `${prefix}:${JSON.stringify(sortedParams)}`
}

/**
 * Get data from cache or execute function and cache result
 * Generic caching wrapper
 */
export const cacheWrapper = async (cacheKey, ttl, fetchFunction) => {
    try {
        // Try to get from cache
        const cachedData = await redis.get(cacheKey)
        if (cachedData) {
            console.log(`✅ Cache HIT: ${cacheKey}`)
            return JSON.parse(cachedData)
        }

        console.log(`⚠️  Cache MISS: ${cacheKey}`)

        // Fetch fresh data
        const freshData = await fetchFunction()

        // Cache the result
        if (freshData) {
            await redis.setex(cacheKey, ttl, JSON.stringify(freshData))
            console.log(`💾 Cached: ${cacheKey} (TTL: ${ttl}s)`)
        }

        return freshData
    } catch (error) {
        console.error('Cache wrapper error:', error)
        // On error, just execute the function without caching
        return await fetchFunction()
    }
}
