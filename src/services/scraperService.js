import PuppeteerConfig from '../utils/puppeteerConfig.js';

class ScraperService {
  constructor() {
    this.browser = null;
    this.timeout = parseInt(process.env.DEFAULT_TIMEOUT) || 30000;
    this.maxPages = parseInt(process.env.MAX_PAGES) || 5;
  }

  async initBrowser() {
    if (!this.browser) {
      this.browser = await PuppeteerConfig.createBrowser();
    }
    return this.browser;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('🔒 Browser closed');
    }
  }

  async scrapeTrustpilotReviews(url) {
    let page;
    let allReviews = [];
    let currentPage = 1;
    
    try {
      console.log(`🚀 Starting scraping for: ${url}`);
      
      await this.initBrowser();
      page = await PuppeteerConfig.createPage(this.browser);
      
      // Navigate to the first page
      console.log('📄 Navigating to page...');
      await page.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: this.timeout 
      });
      
      // Wait for reviews to load
      await this.waitForReviews(page);
      
      // Get company information
      const companyInfo = await this.extractCompanyInfo(page);
      console.log(`📊 Company: ${companyInfo.name}`);
      
      // Get total reviews count
      const totalReviews = await this.getTotalReviewsCount(page);
      console.log(`📝 Total reviews found: ${totalReviews}`);
      
      // Scrape all pages
      while (currentPage <= this.maxPages) {
        console.log(`📖 Scraping page ${currentPage}...`);
        
        // Wait for reviews to be present
        await this.waitForReviews(page);
        
        // Extract reviews from current page
        const pageReviews = await this.extractReviewsFromPage(page, currentPage);
        
        if (pageReviews.length === 0) {
          console.log('❌ No more reviews found. Stopping...');
          break;
        }
        
        allReviews = allReviews.concat(pageReviews);
        console.log(`✅ Scraped ${pageReviews.length} reviews from page ${currentPage}. Total: ${allReviews.length}`);
        
        // Try to navigate to next page
        const hasNextPage = await this.navigateToNextPage(page);
        if (!hasNextPage) {
          console.log('📄 No more pages available.');
          break;
        }
        
        currentPage++;
        
        // Small delay between pages
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(`🎉 Scraping completed! Total reviews scraped: ${allReviews.length}`);

      return {
        success: true,
        company: companyInfo.name,
        url: url,
        scrapedAt: new Date().toISOString(),
        totalReviews: totalReviews,
        reviews: allReviews
      };

    } catch (error) {
      console.error('❌ Scraping error:', error.message);
      throw new Error(`Scraping failed: ${error.message}`);
    } finally {
      if (page) {
        await page.close();
        console.log('📄 Page closed');
      }
    }
  }

  async waitForReviews(page) {
    try {
      console.log('⏳ Waiting for reviews to load...');
      await page.waitForSelector('[data-service-review-card-paper]', { 
        timeout: 15000 
      });
      console.log('✅ Reviews loaded');
    } catch (error) {
      throw new Error('Reviews not found on page - page may not have loaded correctly');
    }
  }

  async extractCompanyInfo(page) {
    return await page.evaluate(() => {
      const nameElement = document.querySelector('h1[data-company-name-typography="true"]') ||
                          document.querySelector('.title-section h1') ||
                          document.querySelector('h1');
      
      return {
        name: nameElement ? nameElement.textContent.trim() : 'Unknown Company'
      };
    });
  }

  async getTotalReviewsCount(page) {
    return await page.evaluate(() => {
      // Try multiple selectors for total reviews count
      const selectors = [
        'p[class*="typography_body-l__KUYFJ typography_appearance-default__AAY17"]',
        '[data-reviews-count-typography="true"]',
        'p[data-rating-typography="true"] + p',
        '.summary-section p'
      ];
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          const text = element.textContent.trim();
          const match = text.match(/(\d+(?:,\d+)*)\s*reviews?/i);
          if (match) {
            return parseInt(match[1].replace(/,/g, ''));
          }
        }
      }
      
      // Fallback: count visible review cards
      const reviewCards = document.querySelectorAll('[data-service-review-card-paper]');
      return reviewCards.length;
    });
  }

//   async extractReviewsFromPage(page, pageNumber) {
//     return await page.evaluate((pageNum) => {
//       const reviews = [];
//       const reviewCards = document.querySelectorAll('[data-service-review-card-paper]');
      
//       console.log(`Found ${reviewCards.length} review cards on page ${pageNum}`);
      
//       reviewCards.forEach((card, index) => {
//         try {
//           // Reviewer name
//           const nameElement = card.querySelector('[data-consumer-name-typography="true"]') ||
//                              card.querySelector('span[data-consumer-name-typography]');
//           const reviewerName = nameElement ? nameElement.textContent.trim() : 'Anonymous';
          
//           // Reviewer image
//           const imgElement = card.querySelector('img[data-consumer-avatar-image="true"]');
//           const reviewerImage = imgElement ? imgElement.src : '';
          
//           // Rating
//           const ratingElement = card.querySelector('div[data-service-review-rating] div[class*="star-rating"] img');
//           let rating = 0;
//           if (ratingElement && ratingElement.alt) {
//             const match = ratingElement.alt.match(/(\d+)/);
//             if (match) rating = parseInt(match[1]);
//           }
          
//           // Review title
//           const titleElement = card.querySelector('h2[data-service-review-title-typography="true"]');
//           const title = titleElement ? titleElement.textContent.trim() : '';
          
//           // Review content
//           const contentElement = card.querySelector('p[data-service-review-text-typography="true"]');
//           const content = contentElement ? contentElement.textContent.trim() : '';
          
//           // Review date
//           const dateElement = card.querySelector('time[datetime]');
//           let reviewDate = '';
//           let reviewDateFormatted = '';
//           if (dateElement) {
//             reviewDate = dateElement.getAttribute('datetime') || '';
//             reviewDateFormatted = dateElement.textContent.trim();
//           }
          
//           // Date of experience
//           const expDateElement = card.querySelector('[data-service-review-date-of-experience] time');
//           const dateOfExperience = expDateElement ? expDateElement.textContent.trim() : '';
          
//           // Reviewer location
//           const locationElement = card.querySelector('[data-consumer-country-typography="true"]');
//           const reviewerLocation = locationElement ? locationElement.textContent.trim() : '';
          
//           // Reviewer total reviews
//           const reviewCountElement = card.querySelector('[data-consumer-reviews-count-typography="true"]');
//           const reviewerTotalReviews = reviewCountElement ? reviewCountElement.textContent.trim() : '1 review';
          
//           // Company reply
//           const replyElement = card.querySelector('[data-service-review-business-reply-content]');
//           const companyReply = replyElement ? replyElement.textContent.trim() : '';
          
//           // Helpful votes
//           const helpfulElement = card.querySelector('[data-service-review-helpful-count]');
//           const helpfulVotes = helpfulElement ? parseInt(helpfulElement.textContent.match(/\d+/)?.[0] || '0') : 0;
          
//           // Verification status
//           const verifiedElement = card.querySelector('[data-service-review-verification-badge]');
//           const isVerified = !!verifiedElement;
          
//           // Review images
//           const imageElements = card.querySelectorAll('[data-service-review-image] img');
//           const reviewImages = Array.from(imageElements).map(img => img.src);
          
//           const review = {
//             reviewerName,
//             reviewerImage,
//             rating,
//             title,
//             content,
//             reviewDate: reviewDate ? new Date(reviewDate).toISOString() : '',
//             reviewDateFormatted,
//             dateOfExperience,
//             reviewImages,
//             isVerified,
//             companyReply,
//             reviewId: `review-${(pageNum - 1) * 20 + index}`,
//             reviewerLocation,
//             reviewerTotalReviews,
//             helpfulVotes,
//             scrapedAt: new Date().toISOString()
//           };
          
//           reviews.push(review);
          
//         } catch (error) {
//           console.error(`Error extracting review ${index}:`, error);
//         }
//       });
      
//       return reviews;
//     }, pageNumber);
//   }


async extractReviewsFromPage(page, pageNumber) {
    return await page.evaluate((pageNum) => {
      const reviews = [];
      const reviewCards = document.querySelectorAll('[data-service-review-card-paper]');
      
      console.log(`Found ${reviewCards.length} review cards on page ${pageNum}`);
      
      reviewCards.forEach((card, index) => {
        try {
          // Reviewer name
          const nameElement = card.querySelector('[data-consumer-name-typography="true"]') ||
                             card.querySelector('span[data-consumer-name-typography]');
          const reviewerName = nameElement ? nameElement.textContent.trim() : 'Anonymous';
          
          // Reviewer image
          const imgElement = card.querySelector('img[data-consumer-avatar-image="true"]');
          const reviewerImage = imgElement ? imgElement.src : '';
          
          // UPDATED RATING EXTRACTION - Multiple approaches
          let rating = 0;
          
          // Method 1: Direct data-service-review-rating attribute
          const ratingElement = card.querySelector('[data-service-review-rating]');
          if (ratingElement) {
            const ratingValue = ratingElement.getAttribute('data-service-review-rating');
            if (ratingValue) {
              const parsedRating = parseInt(ratingValue);
              if (parsedRating >= 1 && parsedRating <= 5) {
                rating = parsedRating;
              }
            }
          }
          
          // Method 2: Fallback - check card itself for rating attribute
          if (rating === 0) {
            const cardRating = card.getAttribute('data-service-review-rating');
            if (cardRating) {
              const parsedRating = parseInt(cardRating);
              if (parsedRating >= 1 && parsedRating <= 5) {
                rating = parsedRating;
              }
            }
          }
          
          // Method 3: Alternative rating selectors
          if (rating === 0) {
            const altRatingSelectors = [
              'div[data-service-review-rating]',
              '[data-rating]',
              '.star-rating',
              'img[alt*="Rated"]'
            ];
            
            for (const selector of altRatingSelectors) {
              const element = card.querySelector(selector);
              if (element) {
                const ratingAttr = element.getAttribute('data-service-review-rating') ||
                                  element.getAttribute('data-rating');
                if (ratingAttr) {
                  const parsedRating = parseInt(ratingAttr);
                  if (parsedRating >= 1 && parsedRating <= 5) {
                    rating = parsedRating;
                    break;
                  }
                }
                
                // Check alt text as fallback
                if (rating === 0 && element.alt) {
                  const altMatch = element.alt.match(/(\d+)/);
                  if (altMatch) {
                    const parsedRating = parseInt(altMatch[1]);
                    if (parsedRating >= 1 && parsedRating <= 5) {
                      rating = parsedRating;
                      break;
                    }
                  }
                }
              }
            }
          }
          
          console.log(`Review ${index}: Found rating = ${rating} for ${reviewerName}`);
          
          // Review title
          const titleElement = card.querySelector('h2[data-service-review-title-typography="true"]');
          const title = titleElement ? titleElement.textContent.trim() : '';
          
          // Review content
          const contentElement = card.querySelector('p[data-service-review-text-typography="true"]');
          const content = contentElement ? contentElement.textContent.trim() : '';
          
          // Review date
          const dateElement = card.querySelector('time[datetime]');
          let reviewDate = '';
          let reviewDateFormatted = '';
          if (dateElement) {
            reviewDate = dateElement.getAttribute('datetime') || '';
            reviewDateFormatted = dateElement.textContent.trim();
          }
          
          // Date of experience
          const expDateElement = card.querySelector('[data-service-review-date-of-experience] time');
          const dateOfExperience = expDateElement ? expDateElement.textContent.trim() : '';
          
          // Reviewer location
          const locationElement = card.querySelector('[data-consumer-country-typography="true"]');
          const reviewerLocation = locationElement ? locationElement.textContent.trim() : '';
          
          // Reviewer total reviews
          const reviewCountElement = card.querySelector('[data-consumer-reviews-count-typography="true"]');
          const reviewerTotalReviews = reviewCountElement ? reviewCountElement.textContent.trim() : '1 review';
          
          // Company reply
          const replyElement = card.querySelector('[data-service-review-business-reply-content]');
          const companyReply = replyElement ? replyElement.textContent.trim() : '';
          
          // Helpful votes
          const helpfulElement = card.querySelector('[data-service-review-helpful-count]');
          const helpfulVotes = helpfulElement ? parseInt(helpfulElement.textContent.match(/\d+/)?.[0] || '0') : 0;
          
          // Verification status
          const verifiedElement = card.querySelector('[data-service-review-verification-badge]');
          const isVerified = !!verifiedElement;
          
          // Review images
          const imageElements = card.querySelectorAll('[data-service-review-image] img');
          const reviewImages = Array.from(imageElements).map(img => img.src);
          
          const review = {
            reviewerName,
            reviewerImage,
            rating, // Now this should extract the correct rating (1-5)
            title,
            content,
            reviewDate: reviewDate ? new Date(reviewDate).toISOString() : '',
            reviewDateFormatted,
            dateOfExperience,
            reviewImages,
            isVerified,
            companyReply,
            reviewId: `review-${(pageNum - 1) * 20 + index}`,
            reviewerLocation,
            reviewerTotalReviews,
            helpfulVotes,
            scrapedAt: new Date().toISOString()
          };
          
          reviews.push(review);
          
        } catch (error) {
          console.error(`Error extracting review ${index}:`, error);
        }
      });
      
      return reviews;
    }, pageNumber);
  }
  

  
  async navigateToNextPage(page) {
    try {
      console.log('🔍 Looking for next page button...');
      
      // Wait a moment for any dynamic content
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try to find the next button
      const nextButton = await page.$('a[data-pagination-button-next-link="true"]') ||
                        await page.$('a[name="pagination-button-next"]') ||
                        await page.$('.pagination-container a[aria-label*="Next"]');
      
      if (!nextButton) {
        console.log('❌ Next button not found');
        return false;
      }
      
      // Check if the button is disabled
      const isDisabled = await page.evaluate(btn => {
        return btn.getAttribute('aria-disabled') === 'true' || 
               btn.hasAttribute('disabled') || 
               btn.classList.contains('disabled');
      }, nextButton);
      
      if (isDisabled) {
        console.log('❌ Next button is disabled');
        return false;
      }
      
      console.log('✅ Clicking next page button...');
      
      // Click and wait for navigation
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
        nextButton.click()
      ]);
      
      console.log('✅ Navigated to next page');
      return true;
      
    } catch (error) {
      console.log(`❌ Navigation failed: ${error.message}`);
      return false;
    }
  }
}

const scraperService = new ScraperService();
export default scraperService;
