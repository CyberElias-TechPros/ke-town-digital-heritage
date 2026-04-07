const mongoose = require('mongoose');
const User = require('./models/User');

const ATLAS_URI = 'mongodb://cybereliastk_db_user:3bBKj4DtLRh7DNd8@ac-okkbkq6-shard-00-00.rz1xdmd.mongodb.net:27017,ac-okkbkq6-shard-00-01.rz1xdmd.mongodb.net:27017,ac-okkbkq6-shard-00-02.rz1xdmd.mongodb.net:27017/keKingdom?ssl=true&replicaSet=atlas-ljgzbm-shard-0&authSource=admin&appName=CEA';
const LOCAL_URI = 'mongodb://localhost:27017/keKingdom';

async function makeAdmin() {
  const email = 'ellis@techpros.com.ng';
  
  // Try Atlas first
  let conn;
  try {
    await mongoose.connect(ATLAS_URI);
    conn = 'Atlas';
    console.log('Connected to Atlas');
  } catch {
    try {
      await mongoose.connect(LOCAL_URI);
      conn = 'Localhost';
      console.log('Connected to Localhost');
    } catch (err) {
      console.log('❌ Could not connect to any database');
      process.exit(1);
    }
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      process.exit(1);
    }

    user.role = 'admin';
    await user.save();
    console.log(`✅ Updated ${email} to admin role`);
    console.log(`   Name: ${user.fullName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
  } catch (err) {
    console.log('❌ Error:', err.message);
  }

  await mongoose.disconnect();
  process.exit(0);
}

makeAdmin();