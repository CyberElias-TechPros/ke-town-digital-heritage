const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');

router.get('/', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('cart.product', 'name price images category artisan artisanName stock');
    res.json(user.cart || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/add', authenticate, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const user = await User.findById(req.user.id);
    
    const existingItem = user.cart.find(item => 
      item.product.toString() === productId
    );
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      user.cart.push({ product: productId, quantity });
    }
    
    await user.save();
    
    const updatedUser = await User.findById(req.user.id)
      .populate('cart.product', 'name price images category artisan artisanName stock');
    res.json(updatedUser.cart);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/update/:productId', authenticate, async (req, res) => {
  try {
    const { quantity } = req.body;
    const user = await User.findById(req.user.id);
    
    const item = user.cart.find(item => 
      item.product.toString() === req.params.productId
    );
    
    if (!item) return res.status(404).json({ error: 'Item not found in cart' });
    
    if (quantity <= 0) {
      user.cart = user.cart.filter(item => 
        item.product.toString() !== req.params.productId
      );
    } else {
      item.quantity = quantity;
    }
    
    await user.save();
    
    const updatedUser = await User.findById(req.user.id)
      .populate('cart.product', 'name price images category artisan artisanName stock');
    res.json(updatedUser.cart);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/remove/:productId', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    user.cart = user.cart.filter(item => 
      item.product.toString() !== req.params.productId
    );
    
    await user.save();
    
    const updatedUser = await User.findById(req.user.id)
      .populate('cart.product', 'name price images category artisan artisanName stock');
    res.json(updatedUser.cart);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/clear', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.cart = [];
    await user.save();
    res.json([]);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;