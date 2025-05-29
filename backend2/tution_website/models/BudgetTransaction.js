const mongoose = require('mongoose');

const budgetTransactionSchema = new mongoose.Schema({
    teacherId: {
        type: mongoose.Schema.Types.Mixed,
        ref: 'Teacher',
        required: function() {
            return this.type !== 'expense';
        }
    },
    teacherName: {
        type: String,
        required: function() {
            return this.type !== 'expense';
        }
    },
    vacancyId: {
        type: mongoose.Schema.Types.Mixed,
        ref: 'Vacancy',
        required: function() {
            return this.type !== 'expense';
        }
    },
    vacancyTitle: {
        type: String,
        required: true
    },
    applicationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Application',
        required: false
    },
    amount: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['paid', 'partial', 'refunded'],
        required: true
    },
    type: {
        type: String,
        enum: ['payment', 'refund', 'expense'],
        required: true
    },
    // Fields for partial payments
    remainingAmount: {
        type: Number,
        default: 0,
        required: function() {
            return this.status === 'partial';
        }
    },
    dueDate: {
        type: Date,
        required: function() {
            return this.status === 'partial';
        }
    },
    reason: {
        type: String,
        required: function() {
            return this.type === 'refund';
        }
    },
    originalPaymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BudgetTransaction',
        required: function() {
            return this.type === 'refund' && !this.isAdminOverride;
        }
    },
    isAdminOverride: {
        type: Boolean,
        default: false
    },
    // Field for expense description
    description: {
        type: String,
        required: function() {
            return this.type === 'expense';
        }
    }
}, {
    timestamps: true
});

// Add indexes for better query performance
budgetTransactionSchema.index({ teacherId: 1, type: 1 });
budgetTransactionSchema.index({ vacancyId: 1, type: 1 });
budgetTransactionSchema.index({ date: -1 });
budgetTransactionSchema.index({ applicationId: 1 });
budgetTransactionSchema.index({ type: 1 });

module.exports = mongoose.model('BudgetTransaction', budgetTransactionSchema); 
