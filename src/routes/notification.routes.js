import express from 'express'
import { authenticateUser } from '../middleware/auth.middleware.js'
import { Notification } from '../models/index.js'
import { connection } from '../queues/setup.js'

const router = express.Router()

// GET /api/notifications/stream - Server-Sent Events endpoint
router.get('/stream', authenticateUser, (req, res) => {
    const userId = req.user._id.toString()
    
    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    // Tell the client we are connected
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'SSE Connection Established' })}\n\n`)

    // We need a dedicated subscriber connection for Redis because 
    // a connection in subscriber mode cannot be used for anything else.
    const subscriber = connection.duplicate()
    const channelName = `user:${userId}:notifications`

    subscriber.subscribe(channelName, (err) => {
        if (err) {
            console.error('[SSE] Failed to subscribe to Redis:', err)
        } else {
            console.log(`[SSE] Subscribed to ${channelName}`)
        }
    })

    subscriber.on('message', (channel, message) => {
        if (channel === channelName) {
            // Send the notification to the connected client
            res.write(`data: ${message}\n\n`)
        }
    })

    // Cleanup on client disconnect
    req.on('close', () => {
        subscriber.unsubscribe(channelName)
        subscriber.quit()
        console.log(`[SSE] Connection closed for user ${userId}`)
    })
})

// GET /api/notifications - Get all user notifications
router.get('/', authenticateUser, async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(50)
            
        const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false })

        res.json({ success: true, data: notifications, unreadCount })
    } catch (error) {
        console.error('[Notification] Fetch error:', error)
        res.status(500).json({ success: false, message: 'Server Error' })
    }
})

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/:id/read', authenticateUser, async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { isRead: true },
            { new: true }
        )
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' })
        }
        res.json({ success: true, data: notification })
    } catch (error) {
        console.error('[Notification] Mark read error:', error)
        res.status(500).json({ success: false, message: 'Server Error' })
    }
})

// DELETE /api/notifications/all - Delete all notifications for user
router.delete('/all', authenticateUser, async (req, res) => {
    try {
        await Notification.deleteMany({ userId: req.user._id })
        res.json({ success: true, message: 'All notifications cleared' })
    } catch (error) {
        console.error('[Notification] Clear all error:', error)
        res.status(500).json({ success: false, message: 'Server Error' })
    }
})

export default router
