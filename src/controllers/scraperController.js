import scraperService from '../services/scraperService.js';

class ScraperController {
  async scrapeReviews(req, res) {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({
          success: false,
          error: 'URL is required'
        });
      }
      
      // Validate Trustpilot URL
      if (!url.includes('trustpilot.com/review/')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Trustpilot URL. URL must contain "trustpilot.com/review/"'
        });
      }
      
      console.log(`🎯 API Request - Starting scraping for: ${url}`);
      
      const result = await scraperService.scrapeTrustpilotReviews(url);
      
      console.log(`🎉 API Success - Scraped ${result.reviews.length} reviews`);
      
      res.json(result);
      
    } catch (error) {
      console.error('❌ Controller error:', error.message);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async healthCheck(req, res) {
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  }

  async status(req, res) {
    res.json({
      success: true,
      service: 'Trustpilot Scraper API',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  }
}

const scraperController = new ScraperController();
export default scraperController;
