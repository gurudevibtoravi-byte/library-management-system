const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// Get all members (admin only)
router.get('/', authMiddleware, roleMiddleware(['admin', 'librarian']), async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    let query = { role: 'member' };

    if (search) {
      query = {
        ...query,
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const skip = (page - 1) * limit;
    const members = await User.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);
    const pages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      members,
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

// Get member profile
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const member = await User.findById(req.params.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Check if user is viewing their own profile or is admin
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      member
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update member profile
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, phone, address, city, state, zipCode } = req.body;

    // Check if user is updating their own profile or is admin
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const member = await User.findByIdAndUpdate(
      req.params.id,
      {
        name,
        phone,
        address,
        city,
        state,
        zipCode,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    res.status(200).json({
      success: true,
      member
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Deactivate member (admin only)
router.put('/:id/deactivate', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const member = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false, updatedAt: Date.now() },
      { new: true }
    );

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Member deactivated successfully',
      member
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Activate member (admin only)
router.put('/:id/activate', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const member = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true, updatedAt: Date.now() },
      { new: true }
    );

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Member activated successfully',
      member
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
