const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  title: { type: String, maxlength: 100 },
  comment: { type: String, maxlength: 500 },
  images: [String],
  isVerifiedPurchase: { type: Boolean, default: false },
  helpful: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  sellerResponse: {
    message: { type: String, maxlength: 500 },
    respondedAt: { type: Date }
  }
}, { timestamps: true });

ReviewSchema.index({ product: 1 });
ReviewSchema.index({ buyer: 1 });
ReviewSchema.index({ product: 1, buyer: 1 }, { unique: true });

// Virtual for average rating
ReviewSchema.statics.getAverageRating = async function(productId) {
  const result = await this.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    { $group: { _id: '$product', avgRating: { $avg: '$rating' }, count: { $sum: 1 } }
  ]);
  return result[0] ? { avgRating: result[0].avgRating.toFixed(1), count: result[0].count } : { avgRating: 0, count: 0 };
};

module.exports = mongoose.model('Review', ReviewSchema);