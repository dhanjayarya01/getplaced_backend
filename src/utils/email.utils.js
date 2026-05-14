import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
dotenv.config()

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN,
        accessToken: process.env.ACCESS_TOKEN
    }
})

/**
 * Send an email to a user.
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - HTML email body
 */
export const sendCustomEmail = async (to, subject, html) => {
    if (!process.env.EMAIL_USER || !process.env.REFRESH_TOKEN) {
        console.warn('[Email] ⚠️ OAuth2 credentials not set — skipping email to', to)
        return false
    }

    try {
        await transporter.sendMail({
            from: `"GetPlaced" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
            to,
            subject,
            html,
        })
        console.log(`[Email] ✉️ Sent custom email to ${to}`)
        return true
    } catch (error) {
        console.error(`[Email] ❌ Failed to send email to ${to}:`, error.message)
        return false
    }
}
