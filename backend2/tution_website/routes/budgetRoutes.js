const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const adminAuth = require('../middleware/adminAuth');

// Get all budget transactions
router.get('/transactions', adminAuth, budgetController.getBudgetTransactions);

// Create a new budget transaction
router.post('/transactions', adminAuth, budgetController.saveBudgetTransaction);

// Update a budget transaction status
router.put('/transactions/:id/status', adminAuth, budgetController.updateBudgetTransactionStatus);

// Delete a budget transaction
router.delete('/transactions/:id', adminAuth, budgetController.deleteBudgetTransaction);

// Process a refund
router.post('/refund', adminAuth, budgetController.processRefund);

// Get budget statistics
router.get('/stats', adminAuth, budgetController.getBudgetStats);

module.exports = router; 