const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');

// Get reviews for a product
router.get('/product/:productId', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    const reviews = await Review.find({ product: req.params.productId })
      .populate('buyer', 'fullName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Review.countDocuments({ product: req.params.productId });
    const stats = await Review.getAverageRating(req.params.productId);
    
    res.json({ reviews, total, page: parseInt(page), pages: Math.ceil(total / limit), stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get my reviews
router.get('/my', authenticate, async (req, res) => {
  try {
    const reviews = await Review.find({ buyer: req.user.id })
      .populate('product', 'name images')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a review
router.post('/', authenticate, async (req, res) => {
  try {
    const { productId, rating, title, comment, images } = req.body;
    
    // Check if verified purchase
    const order = await Order.findOne({ 
      buyer: req.user.id, 
      'items.product': productId,
      status: { $in: ['delivered', 'completed'] }
    });
    
    const isVerifiedPurchase = !!order;
    
    // Check for duplicate review
    const existing = await Review.findOne({ product: productId, buyer: req.user.id });
    if (existing) {
      return res.status(400).json({ error: 'Already reviewed this product' });
    }
    
    const review = await Review.create({
      product: productId,
      buyer: req.user.id,
      rating,
      title,
      comment,
      images,
      isVerifiedPurchase
    });
    
    // Update product rating
    const stats = await Review.getAverageRating(productId);
    await Product.findByIdAndUpdate(productId, {
      rating: parseFloat(stats.avgRating),
      reviewCount: stats.count
    });
    
    const populated = await Review.findById(review._id)
      .populate('buyer', 'fullName avatar');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Seller response to review
router.post('/:id/response', authenticate, async (req, res) => {
  try {
    const { message } = req.body;
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    // Check if seller owns product
    const product = await Product.findById(review.product);
    if (product.artisan.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only seller can respond' });
    }
    
    review.sellerResponse = {
      message,
      respondedAt: new Date()
    };
    
    await review.save();
    res.json(review);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Mark review as helpful
router.post('/:id/helpful', authenticate, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    if (!review.helpful.includes(req.user.id)) {
      review.helpful.push(req.user.id);
      await review.save();
    }
    
    res.json({ helpfulCount: review.helpful.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;