const express = require('express');
const router = express.Router();
const Book = require('../models/Book');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// Get all books
router.get('/', async (req, res) => {
  try {
    const { search, category, page = 1, limit = 10 } = req.query;
    let query = {};

    if (search) {
      query = {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { author: { $regex: search, $options: 'i' } },
          { isbn: { $regex: search, $options: 'i' } }
        ]
      };
    }

    if (category) {
      query.category = category;
    }

    const skip = (page - 1) * limit;
    const books = await Book.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Book.countDocuments(query);
    const pages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      books,
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

// Get book by ID
router.get('/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    res.status(200).json({
      success: true,
      book
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create book (admin only)
router.post('/', authMiddleware, roleMiddleware(['admin', 'librarian']), async (req, res) => {
  try {
    const { title, author, isbn, description, category, publisher, publishDate, totalCopies } = req.body;

    let book = new Book({
      title,
      author,
      isbn,
      description,
      category,
      publisher,
      publishDate,
      totalCopies,
      availableCopies: totalCopies
    });

    await book.save();

    res.status(201).json({
      success: true,
      book
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update book (admin only)
router.put('/:id', authMiddleware, roleMiddleware(['admin', 'librarian']), async (req, res) => {
  try {
    let book = await Book.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    res.status(200).json({
      success: true,
      book
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete book (admin only)
router.delete('/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Book deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
