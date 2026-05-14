import redis from '../config/redis.js'
import { invalidateUserCache } from '../utils/cache.utils.js'

let cacheMetrics = {
    hits: 0,
    misses: 0,
    errors: 0,
    lastReset: new Date(),
}

export const recordCacheHit = () => {
    cacheMetrics.hits++
}

export const recordCacheMiss = () => {
    cacheMetrics.misses++
}

export const recordCacheError = () => {
    cacheMetrics.errors++
}

export const getCacheStats = async (req, res) => {
    try {
        const info = await redis.info('stats')
        const memory = await redis.info('memory')

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

        const totalRequests = cacheMetrics.hits + cacheMetrics.misses
        const hitRatio = totalRequests > 0 ? (cacheMetrics.hits / totalRequests * 100).toFixed(2) : 0

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

export const getCacheHealth = async (req, res) => {
    try {
        const start = Date.now()
        await redis.ping()
        const latency = Date.now() - start

        const [memInfo, serverInfo] = await Promise.all([
            redis.info('memory'),
            redis.info('server'),
        ])

        const parseInfo = (infoStr) => {
            const stats = {}
            infoStr.split('\r\n').forEach(line => {
                if (line && !line.startsWith('#')) {
                    const [key, value] = line.split(':')
                    if (key && value !== undefined) stats[key.trim()] = value.trim()
                }
            })
            return stats
        }

        const mem = parseInfo(memInfo)
        const srv = parseInfo(serverInfo)

        const memoryUsedBytes = parseInt(mem.used_memory) || 0
        const maxMemoryBytes  = parseInt(mem.maxmemory)   || 0
        const uptimeSecs      = parseInt(srv.uptime_in_seconds) || 0

        const memoryPercentage = maxMemoryBytes > 0
            ? ((memoryUsedBytes / maxMemoryBytes) * 100).toFixed(2) + '%'
            : 'unlimited'

        const uptimeStr = uptimeSecs > 0
            ? uptimeSecs >= 3600
                ? `${Math.floor(uptimeSecs / 3600)}h ${Math.floor((uptimeSecs % 3600) / 60)}m`
                : `${Math.floor(uptimeSecs / 60)}m`
            : 'N/A'

        const status = latency < 50 ? 'healthy' : latency < 200 ? 'degraded' : 'slow'

        res.json({
            success: true,
            data: {
                status,
                latency: `${latency}ms`,
                memoryUsed: mem.used_memory_human || `${(memoryUsedBytes / 1024 / 1024).toFixed(2)}M`,
                memoryPercentage,
                uptime: uptimeStr,
                version: srv.redis_version || 'N/A',
                role:    srv.role || 'master',
                port:    srv.tcp_port || '6379',
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

export const warmCache = async (req, res) => {
    try {
        const warmedKeys = []

        const { DSAProblem, Company, MockInterview } = await import('../models/index.js')

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

export const clearAllCache = async (req, res) => {
    try {
        await redis.flushdb()

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

// ── Key Management ────────────────────────────────────────────────────────────

/** GET /api/cache/keys?pattern=*&page=1&limit=50
 *  Returns paginated list of all keys with TTL, type, and memory usage */
export const getKeys = async (req, res) => {
    try {
        const pattern = req.query.pattern || '*'
        const page    = Math.max(1, parseInt(req.query.page)  || 1)
        const limit   = Math.min(200, parseInt(req.query.limit) || 50)

        const allKeys = await redis.keys(pattern)
        allKeys.sort()

        const total     = allKeys.length
        const start     = (page - 1) * limit
        const pageKeys  = allKeys.slice(start, start + limit)

        const keyDetails = await Promise.all(pageKeys.map(async (key) => {
            try {
                const [ttl, type] = await Promise.all([redis.ttl(key), redis.type(key)])
                // Get approximate size using OBJECT ENCODING + strlen for strings
                let size = null
                if (type === 'string') {
                    size = await redis.strlen(key).catch(() => null)
                } else if (type === 'list') {
                    size = await redis.llen(key).catch(() => null)
                } else if (type === 'set') {
                    size = await redis.scard(key).catch(() => null)
                } else if (type === 'hash') {
                    size = await redis.hlen(key).catch(() => null)
                } else if (type === 'zset') {
                    size = await redis.zcard(key).catch(() => null)
                }
                return { key, ttl, type, size }
            } catch {
                return { key, ttl: -2, type: 'unknown', size: null }
            }
        }))

        res.json({
            success: true,
            data: {
                keys: keyDetails,
                pagination: { page, limit, total, pages: Math.ceil(total / limit) },
                pattern,
            },
        })
    } catch (error) {
        console.error('Error listing keys:', error)
        res.status(500).json({ success: false, message: 'Error listing keys', error: error.message })
    }
}

/** GET /api/cache/key/:key — get the value, TTL, and type of a single key */
export const getKey = async (req, res) => {
    try {
        const key = decodeURIComponent(req.params.key)
        const [type, ttl] = await Promise.all([redis.type(key), redis.ttl(key)])

        if (type === 'none') {
            return res.status(404).json({ success: false, message: 'Key not found' })
        }

        let value = null
        if (type === 'string') {
            const raw = await redis.get(key)
            try   { value = JSON.parse(raw) }
            catch { value = raw }
        } else if (type === 'list')  { value = await redis.lrange(key, 0, 99) }
        else if (type === 'set')     { value = await redis.smembers(key) }
        else if (type === 'hash')    { value = await redis.hgetall(key) }
        else if (type === 'zset')    { value = await redis.zrange(key, 0, 99, 'WITHSCORES') }

        res.json({ success: true, data: { key, type, ttl, value } })
    } catch (error) {
        console.error('Error getting key:', error)
        res.status(500).json({ success: false, message: 'Error getting key', error: error.message })
    }
}

/** DELETE /api/cache/key/:key — delete a single key */
export const deleteKey = async (req, res) => {
    try {
        const key = decodeURIComponent(req.params.key)
        const deleted = await redis.del(key)
        res.json({ success: true, deleted, message: deleted ? `Deleted: ${key}` : 'Key not found' })
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting key', error: error.message })
    }
}

/** DELETE /api/cache/keys/bulk — delete multiple keys by pattern or array */
export const deleteKeys = async (req, res) => {
    try {
        const { keys, pattern } = req.body
        let toDelete = keys || []
        if (pattern) {
            const found = await redis.keys(pattern)
            toDelete = [...new Set([...toDelete, ...found])]
        }
        if (toDelete.length === 0) {
            return res.json({ success: true, deleted: 0, message: 'No keys matched' })
        }
        const deleted = await redis.del(...toDelete)
        res.json({ success: true, deleted, message: `Deleted ${deleted} key(s)` })
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting keys', error: error.message })
    }
}

/** POST /api/cache/key — set a key with optional TTL */
export const setKey = async (req, res) => {
    try {
        const { key, value, ttl } = req.body
        if (!key) return res.status(400).json({ success: false, message: 'key is required' })
        const val = typeof value === 'string' ? value : JSON.stringify(value)
        if (ttl && ttl > 0) {
            await redis.setex(key, parseInt(ttl), val)
        } else {
            await redis.set(key, val)
        }
        res.json({ success: true, message: `Set: ${key}${ttl ? ` (TTL: ${ttl}s)` : ''}` })
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error setting key', error: error.message })
    }
}
