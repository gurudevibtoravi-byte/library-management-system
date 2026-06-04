const mongoose = require('mongoose');

const FineSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  borrowingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Borrowing',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    enum: ['late_return', 'book_damage', 'lost_book'],
    default: 'late_return'
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'waived'],
    default: 'pending'
  },
  daysOverdue: Number,
  paymentDate: Date,
  paymentMethod: String,
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Fine', FineSchema);
