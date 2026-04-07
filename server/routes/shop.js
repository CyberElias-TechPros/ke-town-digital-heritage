const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');
const Product = require('../models/Product');

router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      isSeller: user.isSeller,
      shopName: user.shopName,
      shopDescription: user.shopDescription,
      shopBanner: user.shopBanner,
      shopVerified: user.shopVerified,
      sellerRating: user.sellerRating,
      totalSales: user.totalSales,
      totalProducts: user.totalProducts
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/become-seller', authenticate, async (req, res) => {
  try {
    const { shopName, shopDescription } = req.body;
    
    if (!shopName || shopName.length < 3) {
      return res.status(400).json({ error: 'Shop name must be at least 3 characters' });
    }

    const existingShop = await User.findOne({ shopName });
    if (existingShop) {
      return res.status(400).json({ error: 'Shop name already taken' });
    }

    const user = await User.findByIdAndUpdate(req.user.id, {
      isSeller: true,
      shopName,
      shopDescription: shopDescription || '',
      shopVerified: false,
      sellerRating: 0,
      totalSales: 0
    }, { new: true });

    res.json({ 
      isSeller: user.isSeller,
      shopName: user.shopName,
      shopDescription: user.shopDescription,
      shopVerified: user.shopVerified
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/update-shop', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user.isSeller) {
      return res.status(403).json({ error: 'You are not a seller' });
    }

    const { shopName, shopDescription, shopBanner } = req.body;

    if (shopName && shopName !== user.shopName) {
      const existingShop = await User.findOne({ shopName });
      if (existingShop) {
        return res.status(400).json({ error: 'Shop name already taken' });
      }
    }

    const updated = await User.findByIdAndUpdate(req.user.id, {
      shopName: shopName || user.shopName,
      shopDescription: shopDescription !== undefined ? shopDescription : user.shopDescription,
      shopBanner: shopBanner || user.shopBanner
    }, { new: true });

    res.json({
      shopName: updated.shopName,
      shopDescription: updated.shopDescription,
      shopBanner: updated.shopBanner
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/my-products', authenticate, async (req, res) => {
  try {
    const products = await Product.find({ artisan: req.user.id })
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/close-shop', authenticate, async (req, res) => {
  try {
    await Product.updateMany({ artisan: req.user.id }, { isActive: false });
    
    const user = await User.findByIdAndUpdate(req.user.id, {
      isSeller: false,
      shopName: null,
      shopDescription: null,
      shopBanner: null,
      shopVerified: false
    }, { new: true });

    res.json({ message: 'Shop closed successfully' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;