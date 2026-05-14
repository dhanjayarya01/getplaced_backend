/**
 * Daily Job Sync Cron
 * Runs automatically at midnight every day.
 * Uses node-cron (install: npm install node-cron)
 */
import cron from 'node-cron'
import fetch from 'node-fetch'

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://localhost:5000'

export function startJobSyncCron() {
    // Fire once immediately on startup (optional — comment out to skip)
    // triggerSync()

    // Schedule: every day at midnight (00:00)
    cron.schedule('0 0 * * *', () => {
        console.log('\n[Cron] ⏰ Daily job sync triggered at midnight')
        triggerSync()
    }, { timezone: 'Asia/Kolkata' })

    console.log('[Cron] ✅ Daily job sync scheduled — runs every night at midnight IST')
}

async function triggerSync() {
    try {
        const res = await fetch(`${BACKEND_URL}/api/jobs/sync-daily`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'x-internal-cron': 'true' },
            body:    JSON.stringify({ query: 'software developer', location: 'Remote', limit: 50 }),
        })
        const data = await res.json()
        console.log('[Cron] ✅ Sync result:', data)
    } catch (e) {
        console.error('[Cron] ❌ Sync failed:', e.message)
    }
}
