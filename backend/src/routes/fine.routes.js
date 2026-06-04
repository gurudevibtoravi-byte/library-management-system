const express = require('express');
const router = express.Router();
const Fine = require('../models/Fine');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// Get all fines (admin only)
router.get('/', authMiddleware, roleMiddleware(['admin', 'librarian']), async (req, res) => {
  try {
    const { page = 1, limit = 10, status, memberId } = req.query;
    let query = {};

    if (status) {
      query.status = status;
    }

    if (memberId) {
      query.memberId = memberId;
    }

    const skip = (page - 1) * limit;
    const fines = await Fine.find(query)
      .populate('memberId', 'name email')
      .populate('borrowingId')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Fine.countDocuments(query);
    const pages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      fines,
      total,
      pages,
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get member's fines
router.get('/member/fines', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    let query = { memberId: req.user.id };

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;
    const fines = await Fine.find(query)
      .populate('borrowingId')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Fine.countDocuments(query);
    const pages = Math.ceil(total / limit);

    const totalPending = await Fine.countDocuments({ 
      memberId: req.user.id, 
      status: 'pending' 
    });

    res.status(200).json({
      success: true,
      fines,
      total,
      pages,
      currentPage: page,
      totalPending
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get fine by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const fine = await Fine.findById(req.params.id)
      .populate('memberId', 'name email')
      .populate('borrowingId');

    if (!fine) {
      return res.status(404).json({
        success: false,
        message: 'Fine not found'
      });
    }

    // Check authorization
    if (req.user.id !== fine.memberId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      fine
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Pay fine
router.put('/:id/pay', authMiddleware, async (req, res) => {
  try {
    const { paymentMethod } = req.body;

    const fine = await Fine.findById(req.params.id);

    if (!fine) {
      return res.status(404).json({
        success: false,
        message: 'Fine not found'
      });
    }

    // Check authorization
    if (req.user.id !== fine.memberId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (fine.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Fine already paid'
      });
    }

    fine.status = 'paid';
    fine.paymentDate = Date.now();
    fine.paymentMethod = paymentMethod || 'cash';
    fine.finePaid = true;

    await fine.save();

    res.status(200).json({
      success: true,
      message: 'Fine paid successfully',
      fine
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Waive fine (admin only)
router.put('/:id/waive', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const { reason } = req.body;

    const fine = await Fine.findByIdAndUpdate(
      req.params.id,
      {
        status: 'waived',
        notes: reason || 'Fine waived by admin'
      },
      { new: true }
    );

    if (!fine) {
      return res.status(404).json({
        success: false,
        message: 'Fine not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Fine waived successfully',
      fine
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
