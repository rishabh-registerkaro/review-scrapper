import express from 'express';
import scraperController from '../controllers/scraperController.js';

const router = express.Router();

// Health check endpoint
router.get('/health', scraperController.healthCheck.bind(scraperController));

// Status endpoint
router.get('/status', scraperController.status.bind(scraperController));

// Main scraping endpoint
router.post('/scrape', scraperController.scrapeReviews.bind(scraperController));

// Quick test endpoint (uses SafeLedger by default)
router.get('/scrape-test', async (req, res) => {
  req.body = {
    url: 'https://www.trustpilot.com/review/safeledger.ae'
  };
  await scraperController.scrapeReviews(req, res);
});

export default router;
