const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

router.post('/', authenticate, async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, notes } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items in order' });
    }

    const sellerId = items[0]?.product ? await Product.findById(items[0].product).then(p => p?.artisan) : null;
    if (!sellerId) return res.status(400).json({ error: 'Invalid product' });

    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product || !product.isActive) {
        return res.status(400).json({ error: `Product ${item.product} not available` });
      }
      
      const subtotal = product.price * item.quantity;
      orderItems.push({
        product: product._id,
        productName: product.name,
        productImage: product.images?.[0] || '',
        price: product.price,
        quantity: item.quantity,
        subtotal
      });
      totalAmount += subtotal;
    }

    const order = await Order.create({
      buyer: req.user.id,
      seller: sellerId,
      items: orderItems,
      totalAmount,
      shippingAddress,
      paymentMethod: paymentMethod || 'transfer',
      notes
    });

    await User.findByIdAndUpdate(req.user.id, { $push: { orders: order._id } });
    
    res.status(201).json(order);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/my-orders', authenticate, async (req, res) => {
  try {
    const orders = await Order.find({ buyer: req.user.id })
      .populate('seller', 'fullName shopName avatar')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/my-sales', authenticate, async (req, res) => {
  try {
    const orders = await Order.find({ seller: req.user.id })
      .populate('buyer', 'fullName avatar email')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('buyer', 'fullName email')
      .populate('seller', 'fullName shopName');
    
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    if (order.buyer._id.toString() !== req.user.id && 
        order.seller._id.toString() !== req.user.id && 
        req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    res.json(order);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    if (order.buyer.toString() !== req.user.id && 
        order.seller.toString() !== req.user.id && 
        req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    order.status = status;
    await order.save();
    
    res.json(order);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;