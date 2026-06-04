const express = require('express');
const router = express.Router();
const Borrowing = require('../models/Borrowing');
const Book = require('../models/Book');
const { authMiddleware } = require('../middleware/auth');

// Borrow book
router.post('/borrow', authMiddleware, async (req, res) => {
  try {
    const { bookId, dueDate } = req.body;

    // Check if book exists
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    // Check availability
    if (book.availableCopies <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Book not available'
      });
    }

    // Create borrowing record
    const borrowing = new Borrowing({
      memberId: req.user.id,
      bookId,
      dueDate,
      status: 'borrowed'
    });

    await borrowing.save();

    // Update book availability
    book.availableCopies -= 1;
    book.borrowedCopies += 1;
    await book.save();

    res.status(201).json({
      success: true,
      borrowing
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Return book
router.post('/return', authMiddleware, async (req, res) => {
  try {
    const { borrowingId } = req.body;

    const borrowing = await Borrowing.findById(borrowingId);
    if (!borrowing) {
      return res.status(404).json({
        success: false,
        message: 'Borrowing record not found'
      });
    }

    // Check if already returned
    if (borrowing.status === 'returned') {
      return res.status(400).json({
        success: false,
        message: 'Book already returned'
      });
    }

    borrowing.returnDate = Date.now();
    borrowing.status = 'returned';

    // Calculate fine if overdue
    const today = new Date();
    if (today > borrowing.dueDate) {
      const daysOverdue = Math.floor((today - borrowing.dueDate) / (1000 * 60 * 60 * 24));
      borrowing.fineAmount = daysOverdue * 10; // $10 per day
    }

    await borrowing.save();

    // Update book availability
    const book = await Book.findById(borrowing.bookId);
    book.availableCopies += 1;
    book.borrowedCopies -= 1;
    await book.save();

    res.status(200).json({
      success: true,
      message: 'Book returned successfully',
      borrowing
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get borrowing history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    let query = { memberId: req.user.id };

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;
    const borrowings = await Borrowing.find(query)
      .populate('bookId', 'title author')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Borrowing.countDocuments(query);
    const pages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      borrowings,
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

// Get active borrowings
router.get('/active', authMiddleware, async (req, res) => {
  try {
    const borrowings = await Borrowing.find({
      memberId: req.user.id,
      status: 'borrowed'
    })
      .populate('bookId', 'title author')
      .sort({ dueDate: 1 });

    res.status(200).json({
      success: true,
      borrowings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
