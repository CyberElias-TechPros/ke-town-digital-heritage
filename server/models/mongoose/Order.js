const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: String,
    price: Number,
    quantity: { type: Number, default: 1 },
    image: String
  }],
  shippingAddress: {
    fullName: String,
    phone: String,
    address: String,
    city: String,
    state: String,
    landmark: String
  },
  deliveryMethod: {
    type: { type: String, enum: ['standard', 'express', 'pickup'], default: 'standard' },
    fee: { type: Number, default: 500 },
    estimatedDays: Number
  },
  payment: {
    method: { type: String, enum: ['card', 'transfer', 'ussd', 'cod'], default: 'transfer' },
    reference: String,
    status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    amount: Number,
    paidAt: Date,
    transactionId: String
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refund_requested', 'refunded'],
    default: 'pending'
  },
  timeline: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    note: String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  subtotal: { type: Number, required: true },
  shippingFee: { type: Number, default: 0 },
  total: { type: Number, required: true },
  notes: String,
  trackingNumber: String,
  cancelledAt: Date,
  cancellationReason: String,
  refundedAt: Date,
  refundAmount: Number
}, {
  timestamps: true
});

orderSchema.index({ buyer: 1, createdAt: -1 });
orderSchema.index({ 'items.seller': 1 });
orderSchema.index({ status: 1 });

orderSchema.virtual('orderNumber').get(function() {
  return `ORD-${this._id.toString().slice(-8).toUpperCase()}`;
});

orderSchema.set('toJSON', { virtuals: true });
orderSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Order', orderSchema);