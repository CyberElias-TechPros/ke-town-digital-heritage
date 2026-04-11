const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');
const Order = require('../models/Order');
const Campaign = require('../models/Campaign');

// Paystack initialization (simulated - in production, use actual Paystack API)
router.post('/initialize', authenticate, async (req, res) => {
  try {
    const { amount, email, type, reference, productId, campaignId } = req.body;
    
    // In production, replace with actual Paystack API call:
    // const paystack = require('paystack')(process.env.PAYSTACK_SECRET);
    // const response = await paystack.transaction.initialize({
    //   amount: amount * 100, // kobo
    //   email,
    //   reference,
    //   metadata: { type, productId, campaignId }
    // });
    
    // Simulated response for demo
    const referenceId = reference || `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    res.json({
      success: true,
      reference: referenceId,
      authorizationUrl: `https://paystack.com/pay/${referenceId}`, // In production, use actual authorization URL
      message: 'Payment initialized'
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Verify payment
router.post('/verify', authenticate, async (req, res) => {
  try {
    const { reference, type, productId, campaignId, amount } = req.body;
    
    // In production, verify with Paystack API:
    // const paystack = require('paystack')(process.env.PAYSTACK_SECRET);
    // const response = await paystack.transaction.verify(reference);
    
    // Simulated successful verification
    if (type === 'order' && productId) {
      // Create order - handled by orders route
      res.json({ success: true, type: 'order', message: 'Payment verified' });
    } else if (type === 'campaign' && campaignId) {
      const campaign = await Campaign.findById(campaignId);
      if (campaign) {
        campaign.donors.push({
          user: req.user.id,
          amount,
          isAnonymous: false,
          createdAt: new Date()
        });
        campaign.raisedAmount += amount;
        
        if (campaign.raisedAmount >= campaign.targetAmount) {
          campaign.status = 'completed';
        }
        
        await campaign.save();
      }
      res.json({ success: true, type: 'campaign', message: 'Donation recorded' });
    } else if (type === 'donation') {
      res.json({ success: true, type: 'donation', message: 'Donation recorded' });
    } else {
      res.status(400).json({ error: 'Invalid payment type' });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Webhook for Paystack (in production, this would be a protected endpoint)
router.post('/webhook', async (req, res) => {
  try {
    const { event, data } = req.body;
    
    if (event === 'charge.success') {
      const { reference, amount, metadata } = data;
      const amountKobo = amount || 0;
      const amountNaira = amountKobo / 100;
      
      // Process based on metadata.type
      if (metadata?.type === 'order' && metadata?.productId) {
        // Handle order payment
      } else if (metadata?.type === 'campaign' && metadata?.campaignId) {
        // Handle campaign donation
      }
    }
    
    res.json({ received: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Bank account verification
router.post('/verify/account', async (req, res) => {
  try {
    const { accountNumber, bankCode } = req.body;
    
    // In production, use Paystack bank verification:
    // const paystack = require('paystack')(process.env.PAYSTACK_SECRET);
    // const response = await paystack.verification.verifyAccount({
    //   account_number: accountNumber,
    //   bank_code: bankCode
    // });
    
    // Simulated response
    res.json({
      success: true,
      account: {
        accountNumber,
        bankCode,
        accountName: 'Demo Account Name',
        validated: true
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Transfer to beneficiary
router.post('/transfer', authenticate, async (req, res) => {
  try {
    // Only admin/seller can initiate transfers
    if (req.user.role !== 'admin' && !req.user.isSeller) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const { bankCode, accountNumber, amount, accountName, description } = req.body;
    
    // In production, use Paystack transfer:
    // const paystack = require('paystack')(process.env.PAYSTACK_SECRET);
    // const transfer = await paystack.transfer.recipient({
    //   type: 'nuban',
    //   name: accountName,
    //   account_number: accountNumber,
    //   bank_code: bankCode
    // });
    // await paystack.transfer.initiate({
    //   source: 'balance',
    //   amount: amount * 100,
    //   recipient: transfer.recipient_code,
    //   reason: description
    // });
    
    res.json({
      success: true,
      message: 'Transfer initiated',
      reference: `trf_${Date.now()}`
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;