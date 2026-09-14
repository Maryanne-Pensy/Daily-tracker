require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB, getMongoStatus } = require('./config/db');

// Route imports
const authRoutes = require('./routes/authRoutes');
const trackerRoutes = require('./routes/trackerRoutes');
const contentRoutes = require('./routes/contentRoutes');
const outreachRoutes = require('./routes/outreachRoutes');
const coachRoutes = require('./routes/coachRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tracker', trackerRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/outreach', outreachRoutes);
app.use('/api/coach', coachRoutes);

// Health & DB Status Endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    database: getMongoStatus(),
    appVersion: '2.0.0'
  });
});

// Clean URL friendly routes for each tab
app.get('/today', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'today.html'));
});

app.get('/calendar', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'calendar.html'));
});

app.get('/outreach', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'outreach.html'));
});

app.get('/coach', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'coach.html'));
});

app.get('/history', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'history.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Catch-all to index
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  Daily Tracker Server running on http://localhost:${PORT}`);
  console.log(`  - Today's Sheet:    http://localhost:${PORT}/today`);
  console.log(`  - Content Calendar: http://localhost:${PORT}/calendar`);
  console.log(`  - Outreach Board:   http://localhost:${PORT}/outreach`);
  console.log(`  - Harsh AI Coach:   http://localhost:${PORT}/coach`);
  console.log(`  - History:          http://localhost:${PORT}/history`);
  console.log(`======================================================\n`);
});
