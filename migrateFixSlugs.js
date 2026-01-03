import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '.env') })

import { DSAProblem } from './src/models/index.js'

async function fixSlugs() {
    try {
        await mongoose.connect(process.env.MONGODB_URI)
        console.log('✅ Connected to MongoDB')

        const problems = await DSAProblem.find({})
        console.log(`📊 Found ${problems.length} problems to update slugs`)

        let updatedCount = 0

        for (const problem of problems) {
            const currentSlug = problem.slug
            // Remove hyphens, lowercase, and trim
            const newSlug = currentSlug.replace(/-/g, '').toLowerCase().trim()

            if (currentSlug !== newSlug) {
                try {
                    await DSAProblem.updateOne(
                        { _id: problem._id },
                        { $set: { slug: newSlug } }
                    )
                    console.log(`✅ Updated slug: "${currentSlug}" → "${newSlug}"`)
                    updatedCount++
                } catch (error) {
                    console.error(`❌ Error updating ${problem.title}: ${error.message}`)
                }
            }
        }

        console.log(`\n🎉 Migration complete! Updated ${updatedCount} out of ${problems.length} slugs`)
    } catch (error) {
        console.error('❌ Error during migration:', error)
    } finally {
        await mongoose.connection.close()
        console.log('👋 Database connection closed')
    }
}

fixSlugs()
