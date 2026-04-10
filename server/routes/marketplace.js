const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const Product = require('../models/Product');

// Get all products (active listings)
router.get('/', async (req, res) => {
  try {
    const filter = { status: 'active' };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.featured) filter.isFeatured = true;
    if (req.query.search) {
      filter.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
      ];
    }
    if (req.query.condition) filter.condition = req.query.condition;
    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) filter.price.$gte = parseInt(req.query.minPrice);
      if (req.query.maxPrice) filter.price.$lte = parseInt(req.query.maxPrice);
    }
    
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    
    const products = await Product.find(filter)
      .populate('seller', 'fullName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Product.countDocuments(filter);
    
    res.json({ products, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller', 'fullName avatar bio isSeller shopName shopVerified');
    
    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    // Increment view count
    product.views += 1;
    await product.save();
    
    res.json(product);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create listing (authenticated)
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, category, condition, price, negotiable, images, video, brand, model, location, contact, tags, quantity } = req.body;
    
    const product = await Product.create({
      seller: req.user.id,
      title,
      description,
      category,
      condition,
      price,
      negotiable,
      images: images || [],
      video,
      brand,
      model,
      location,
      contact,
      tags,
      quantity: quantity || 1
    });
    
    const populated = await Product.findById(product._id)
      .populate('seller', 'fullName avatar');
    res.status(201).json(populated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Update listing
router.put('/:id', authenticate, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.seller.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('seller', 'fullName avatar');
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Delete listing
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.seller.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    // Soft delete - archive instead
    product.status = 'archived';
    await product.save();
    
    res.json({ message: 'Product archived' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Like/unlike product
router.post('/:id/like', authenticate, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    const likeIndex = product.likes.indexOf(req.user.id);
    if (likeIndex > -1) {
      product.likes.splice(likeIndex, 1);
    } else {
      product.likes.push(req.user.id);
    }
    await product.save();
    
    res.json({ liked: likeIndex === -1, likeCount: product.likes.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get seller's products
router.get('/seller/my', authenticate, async (req, res) => {
  try {
    const products = await Product.find({ seller: req.user.id })
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;