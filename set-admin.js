// Quick script to set admin role
// Run: node set-admin.js

const mongoose = require('mongoose');

// MongoDB connection string (update if different)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/getplaced';

async function setAdminRole() {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get the User model
        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

        // Update the user
        const result = await User.updateOne(
            { email: 'dhanjayarya01@gmail.com' },
            { $set: { role: 'admin' } }
        );

        console.log('\n📝 Update Result:', result);

        if (result.matchedCount === 0) {
            console.log('❌ User not found with email: dhanjayarya01@gmail.com');
        } else if (result.modifiedCount === 1) {
            console.log('✅ Successfully set role to admin!');
        } else {
            console.log('ℹ️  User already has admin role');
        }

        // Verify the update
        const user = await User.findOne({ email: 'dhanjayarya01@gmail.com' });
        console.log('\n👤 Updated User:');
        console.log({
            email: user.email,
            name: user.name,
            role: user.role
        });

        await mongoose.disconnect();
        console.log('\n✅ Done! You can now access /admin');
        console.log('🔄 Refresh your browser at http://localhost:3000/admin');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

setAdminRole();
