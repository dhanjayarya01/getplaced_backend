import mongoose from 'mongoose'

const connectDB = async () => {
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      retryReads: true,
      compressors: ['zlib'],
      zlibCompressionLevel: 6,
    };

    // options is not needed now but for memo
    try {

        const conn = await mongoose.connect(process.env.MONGODB_URI, options)

        console.log(`😊MongoDB Connected: ${conn.connection.host}`)

        mongoose.connection.on('error', (err) => {
            console.error(`❌ MongoDB connection error: ${err}`)
        })

        mongoose.connection.on('disconnected', () => {
            console.log('⚠️ MongoDB disconnected')
        })

    } catch (error) {
        console.error(`❌ Error connecting to MongoDB: ${error.message}`)
        process.exit(1)
    }
}

export default connectDB
