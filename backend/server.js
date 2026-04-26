const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Connected Successfully');
    // Initialize Telegram bot after DB is ready
    // const { initBot } = require('./services/telegramService');
    // initBot();
  })
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// Threshold evaluation middleware — runs after POST /api/readings
const thresholdMiddleware = require('./middleware/thresholdEvaluator');

// Routes
app.use('/api/readings', require('./routes/readings'));
app.use('/api/appliances', require('./routes/appliances'));
app.use('/api/cost', require('./routes/cost'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/loads', require('./routes/loads'));
app.use('/api/relays', require('./routes/relays'));
app.use('/api/safety', require('./routes/safety'));
// app.use('/api/telegram', require('./routes/telegram'));
app.use('/api/ai', require('./routes/ai'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Energy Monitoring Backend is running',
    timestamp: new Date().toISOString(),
    features: ['relays', 'safety', 'telegram', 'ai']
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '⚡ IoT Energy Monitoring API',
    version: '2.0.0',
    endpoints: {
      health: '/api/health',
      readings: '/api/readings',
      appliances: '/api/appliances',
      cost: '/api/cost',
      dashboard: '/api/dashboard',
      relays: '/api/relays',
      safety: '/api/safety',
      // telegram: '/api/telegram',
      ai: '/api/ai'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT,'0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}`);
});
