import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '.env') })

import { DSAProblem } from './src/models/index.js'

// Helper function to convert to Title Case
function toTitleCase(str) {
    return str.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    })
}

async function restoreTitles() {
    try {
        await mongoose.connect(process.env.MONGODB_URI)
        console.log('✅ Connected to MongoDB')

        const problems = await DSAProblem.find({})
        console.log(`📊 Found ${problems.length} problems to restore`)

        let updatedCount = 0

        for (const problem of problems) {
            const currentTitle = problem.title
            const properTitle = toTitleCase(currentTitle)

            if (currentTitle !== properTitle) {
                await DSAProblem.updateOne(
                    { _id: problem._id },
                    { $set: { title: properTitle } }
                )
                console.log(`✅ Restored: "${currentTitle}" → "${properTitle}"`)
                updatedCount++
            }
        }

        console.log(`\n🎉 Migration complete! Restored ${updatedCount} out of ${problems.length} titles`)
    } catch (error) {
        console.error('❌ Error during migration:', error)
    } finally {
        await mongoose.connection.close()
        console.log('👋 Database connection closed')
    }
}

restoreTitles()
