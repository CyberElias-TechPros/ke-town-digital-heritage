const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const Donation = require('../models/Donation');
const Project = require('../models/Project');

// Initialize Paystack payment
router.post('/initialize', async (req, res) => {
  try {
    const { donorName, donorEmail, amount, projectId, message, isAnonymous } = req.body;

    if (!donorName || !donorEmail || !amount) {
      return res.status(400).json({ error: 'Name, email, and amount are required.' });
    }

    if (amount < 100) {
      return res.status(400).json({ error: 'Minimum donation is ₦100.' });
    }

    // Generate unique reference
    const reference = `KEKingdom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create donation record
    const donation = await Donation.create({
      donorName,
      donorEmail,
      amount,
      projectId,
      message,
      isAnonymous,
      paystackReference: reference,
      status: 'pending'
    });

    // In production, you would call Paystack API here
    // For now, we'll simulate the response
    const paystackResponse = {
      status: true,
      message: 'Authorization URL created',
      data: {
        authorization_url: `https://checkout.paystack.com/${reference}`,
        access_code: `access_${reference}`,
        reference: reference
      }
    };

    // Update donation with access code
    donation.paystackAccessCode = paystackResponse.data.access_code;
    await donation.save();

    res.json({
      message: 'Payment initialized successfully',
      donation: {
        id: donation._id,
        reference: donation.paystackReference,
        amount: donation.amount,
        authorization_url: paystackResponse.data.authorization_url
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify Paystack payment (webhook or callback)
router.post('/verify', async (req, res) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({ error: 'Reference is required.' });
    }

    const donation = await Donation.findOne({ paystackReference: reference });

    if (!donation) {
      return res.status(404).json({ error: 'Donation not found.' });
    }

    // In production, verify with Paystack API
    // For now, simulate successful verification
    donation.status = 'success';
    await donation.save();

    // Update project raised amount if projectId exists
    if (donation.projectId) {
      const Project = require('../models/Project');
      await Project.findByIdAndUpdate(
        donation.projectId,
        { $inc: { raisedAmount: donation.amount } }
      );
    }

    res.json({
      message: 'Payment verified successfully',
      donation: {
        id: donation._id,
        reference: donation.paystackReference,
        amount: donation.amount,
        status: donation.status
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get donation statistics (public)
router.get('/stats', async (req, res) => {
  try {
    const totalDonations = await Donation.countDocuments({ status: 'success' });
    const totalAmount = await Donation.sum('amount', { where: { status: 'success' } }) || 0;

    res.json({
      totalDonations,
      totalAmount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recent donations (public, anonymous hidden)
router.get('/recent', async (req, res) => {
  try {
    const donations = await Donation.find({ status: 'success' })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('donorName amount message isAnonymous createdAt');

    const publicDonations = donations.map(d => ({
      donorName: d.isAnonymous ? 'Anonymous' : d.donorName,
      amount: d.amount,
      message: d.message,
      date: d.createdAt
    }));

    res.json(publicDonations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get all donations
router.get('/admin/all', authenticate, requireAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;

    const donations = await Donation.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('projectId', 'title');

    const total = await Donation.countDocuments(filter);

    res.json({
      donations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get donation statistics
router.get('/admin/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const totalDonations = await Donation.countDocuments();
    const successfulDonations = await Donation.countDocuments({ status: 'success' });
    const pendingDonations = await Donation.countDocuments({ status: 'pending' });
    const failedDonations = await Donation.countDocuments({ status: 'failed' });

    const totalAmount = await Donation.sum('amount', { where: { status: 'success' } }) || 0;

    // Monthly stats for successful donations
    const { QueryTypes } = require('sequelize');
    const sequelize = Donation.sequelize;
    const [monthlyRows] = await sequelize.query(
      `SELECT YEAR(createdAt) AS year, MONTH(createdAt) AS month, COUNT(*) AS count, SUM(amount) AS total
       FROM donations
       WHERE status = 'success'
       GROUP BY year, month
       ORDER BY year DESC, month DESC
       LIMIT 12`,
      { type: QueryTypes.SELECT }
    );
    const monthlyStats = monthlyRows;

    res.json({
      totalDonations,
      successfulDonations,
      pendingDonations,
      failedDonations,
      totalAmount,
      monthlyStats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
