// Create the (single) account from the command line, since public sign-up is disabled.
// Usage: node scripts/create-user.js <username> <email> <password>
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const storage = require('../services/storage');

(async () => {
  const [username, email, password] = process.argv.slice(2);
  if (!username || !email || !password || password.length < 6) {
    console.error('Usage: node scripts/create-user.js <username> <email> <password (6+ chars)>');
    process.exit(1);
  }
  await connectDB();
  if (await storage.findUserByEmail(email)) {
    console.error(`An account for ${email} already exists.`);
    process.exit(1);
  }
  const user = await storage.createUser({ username, email, password: await bcrypt.hash(password, 10) });
  console.log(`Created ${user.username} (${user.email}) in ${storage.isMongoActive() ? 'MongoDB' : 'local JSON storage'}.`);
  await mongoose.disconnect();
  process.exit(0);
})().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
