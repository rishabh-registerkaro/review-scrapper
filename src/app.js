import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import scraperRoutes from './routes/scraperRoutes.js';

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
  message: {
    success: false,
    error: 'Too many requests, please try again later.'
  }
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(compression());
app.use(cors());
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`📝 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api', scraperRoutes);

// Root endpoint with documentation
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Trustpilot Scraper API - Development Mode',
    version: '1.0.0',
    endpoints: {
      status: 'GET /api/status',
      health: 'GET /api/health', 
      scrape: 'POST /api/scrape',
      testScrape: 'GET /api/scrape-test'
    },
    usage: {
      scrape: {
        method: 'POST',
        url: '/api/scrape',
        body: { url: 'https://www.trustpilot.com/review/company-name' },
        example: 'curl -X POST http://localhost:3000/api/scrape -H "Content-Type: application/json" -d \'{"url": "https://www.trustpilot.com/review/safeledger.ae"}\''
      }
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('❌ Application error:', error);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

// Start server
app.listen(PORT, HOST, () => {
  console.log('🚀 Trustpilot Scraper API Started!');
  console.log(`📍 Running on: http://${HOST}:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📖 Documentation: http://${HOST}:${PORT}`);
  console.log('\n📋 Available endpoints:');
  console.log(`   GET  http://${HOST}:${PORT}/api/health`);
  console.log(`   GET  http://${HOST}:${PORT}/api/status`);
  console.log(`   POST http://${HOST}:${PORT}/api/scrape`);
  console.log(`   GET  http://${HOST}:${PORT}/api/scrape-test`);
});
