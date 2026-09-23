require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB, getMongoStatus } = require('./config/db');
const { TZ, todayStr } = require('./utils/dates');

// Route imports
const authRoutes = require('./routes/authRoutes');
const trackerRoutes = require('./routes/trackerRoutes');
const contentRoutes = require('./routes/contentRoutes');
const prospectRoutes = require('./routes/prospectRoutes');
const coachRoutes = require('./routes/coachRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const { products, projects, learning } = require('./routes/resourceRoutes');

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
app.use('/api/prospects', prospectRoutes);
app.use('/api/products', products);
app.use('/api/projects', projects);
app.use('/api/learning', learning);
app.use('/api/review', reviewRoutes);
app.use('/api/coach', coachRoutes);

// Health & DB Status Endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    today: todayStr(),
    timezone: TZ,
    database: getMongoStatus(),
    appVersion: '3.0.0'
  });
});

// Clean URLs for each page (old tab names redirect to their replacements)
const PAGES = ['today', 'clinics', 'content', 'products', 'focus', 'review', 'history', 'coach', 'login'];
PAGES.forEach(page => {
  app.get('/' + page, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', page + '.html'));
  });
});
app.get(['/calendar', '/calendar.html'], (req, res) => res.redirect('/content.html'));
app.get(['/outreach', '/outreach.html'], (req, res) => res.redirect('/clinics.html'));

// Unknown API routes get JSON, everything else the index redirect
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  Builder OS running on http://localhost:${PORT}  (timezone ${TZ})`);
  console.log(`  - Today:     http://localhost:${PORT}/today`);
  console.log(`  - Clinics:   http://localhost:${PORT}/clinics`);
  console.log(`  - Content:   http://localhost:${PORT}/content`);
  console.log(`  - Products:  http://localhost:${PORT}/products`);
  console.log(`  - Focus:     http://localhost:${PORT}/focus`);
  console.log(`  - Review:    http://localhost:${PORT}/review`);
  console.log(`======================================================\n`);
});
