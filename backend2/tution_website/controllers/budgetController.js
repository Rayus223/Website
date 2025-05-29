const BudgetTransaction = require('../models/BudgetTransaction');
const mongoose = require('mongoose');
const Teacher = require('../models/TeacherApply'); // Corrected path back to TeacherApply
const Vacancy = require('../models/Vacancy'); // Add Vacancy model import

// Get all budget transactions
exports.getBudgetTransactions = async (req, res) => {
    try {
        // First, get all transactions without populating
        const transactions = await BudgetTransaction.find().sort({ date: -1 });
        
        // Create formatted transactions with appropriate handling for expenses
        const formattedTransactions = await Promise.all(transactions.map(async t => {
            const transactionObject = t.toObject();
            
            // Special handling for expense transactions
            if (transactionObject.type === 'expense') {
                return {
                    ...transactionObject,
                    teacherName: 'Expense',
                    teacherPhone: null
                };
            }
            
            // For non-expense transactions, try to populate teacher info if possible
            if (transactionObject.teacherId && 
                typeof transactionObject.teacherId !== 'string' && 
                mongoose.Types.ObjectId.isValid(transactionObject.teacherId)) {
                
                try {
                    const teacher = await Teacher.findById(transactionObject.teacherId)
                        .select('phone fullName')
                        .lean();
                    
                    if (teacher) {
                        return {
                            ...transactionObject,
                            teacherName: teacher.fullName || transactionObject.teacherName || 'Unknown Teacher',
                            teacherPhone: teacher.phone || null
                        };
                    }
                } catch (err) {
                    console.error('Error finding teacher:', err);
                    // Continue with default handling if teacher lookup fails
                }
            }
            
            // Default handling without populated data
            return {
                ...transactionObject,
                teacherName: transactionObject.teacherName || 'Unknown Teacher',
                teacherPhone: null
            };
        }));

        res.status(200).json({
            success: true,
            data: formattedTransactions
        });
    } catch (error) {
        console.error('Error fetching budget transactions:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch budget transactions' 
        });
    }
};

// Save a new budget transaction
exports.saveBudgetTransaction = async (req, res) => {
    try {
        const {
            teacherId,
            teacherName,
            vacancyId,
            vacancyTitle,
            applicationId,
            amount,
            type,
            status,
            remainingAmount,
            dueDate,
            reason,
            originalPaymentId,
            isAdminOverride,
            description
        } = req.body;

        // Special validation for expense type
        if (type === 'expense') {
            if (!description) {
                return res.status(400).json({
                    success: false,
                    message: 'Description is required for expense transactions'
                });
            }
            
            if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid amount is required for expense transactions'
                });
            }
            
            // For expenses, create and save the transaction with minimal required fields
            const transaction = new BudgetTransaction({
                teacherId: 'expense', // Use a placeholder value
                teacherName: 'Expense', // Use a placeholder value
                vacancyId: 'expense', // Use a placeholder value
                vacancyTitle: description || 'Expense',
                amount: parseFloat(amount),
                type: 'expense',
                status: 'paid',
                description,
                date: req.body.date ? new Date(req.body.date) : new Date()
            });

            await transaction.save();

            return res.status(201).json({
                success: true,
                message: 'Expense recorded successfully',
                data: transaction
            });
        }

        // For payment and refund types, perform standard validation
        if (!teacherId || !teacherName || !vacancyId || !vacancyTitle || !amount || !type) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Validate type for non-expense transactions
        if (type !== 'payment' && type !== 'refund') {
            return res.status(400).json({
                success: false,
                message: 'Invalid transaction type. Must be "payment" or "refund"'
            });
        }

        // Additional validation for partial payments
        if (status === 'partial') {
            if (remainingAmount === undefined || remainingAmount <= 0 || !dueDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Partial payments require remainingAmount and dueDate'
                });
            }
        }

        // Additional validation for refunds
        if (type === 'refund') {
            if (!reason) {
                return res.status(400).json({
                    success: false,
                    message: 'Refunds require a reason'
                });
            }

            // Skip original payment validation for admin overrides
            if (!isAdminOverride) {
                // Require originalPaymentId for non-admin-override refunds
                if (!originalPaymentId) {
                    return res.status(400).json({
                        success: false,
                        message: 'Refunds require original payment ID'
                    });
                }

                // Check if original payment exists
                const originalPayment = await BudgetTransaction.findById(originalPaymentId);
                if (!originalPayment || originalPayment.type !== 'payment') {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid original payment'
                    });
                }

                // Check if refund already exists for this payment
                try {
                    let query = { 
                        type: 'refund' 
                    };
                    
                    // Check by originalPaymentId if available
                    if (originalPaymentId) {
                        try {
                            query.originalPaymentId = new mongoose.Types.ObjectId(originalPaymentId);
                        } catch (err) {
                            console.error('Error converting originalPaymentId to ObjectId:', err);
                            // If conversion fails, use the string value
                            query.originalPaymentId = originalPaymentId;
                        }
                    } else {
                        // Otherwise check by teacherId and vacancyId
                        if (typeof teacherId === 'string') {
                            query.teacherId = new mongoose.Types.ObjectId(teacherId);
                        } else {
                            query.teacherId = teacherId;
                        }
                        
                        if (typeof vacancyId === 'string') {
                            query.vacancyId = new mongoose.Types.ObjectId(vacancyId);
                        } else {
                            query.vacancyId = vacancyId;
                        }
                    }
                    
                    console.log('Checking for existing refund with query:', query);
                    const existingRefund = await BudgetTransaction.findOne(query);

                    if (existingRefund) {
                        return res.status(400).json({
                            success: false,
                            message: 'A refund has already been processed for this payment'
                        });
                    }
                } catch (queryError) {
                    console.error('Error checking for existing refund:', queryError);
                }

                // Validate refund amount
                if (amount > originalPayment.amount) {
                    return res.status(400).json({
                        success: false,
                        message: 'Refund amount cannot exceed original payment amount'
                    });
                }
            } else {
                console.log('Processing admin override refund, skipping payment validation');
            }
        }

        // Create and save the transaction
        const transaction = new BudgetTransaction({
            teacherId,
            teacherName,
            vacancyId,
            vacancyTitle,
            applicationId: applicationId || undefined,
            amount,
            type,
            status: status || (type === 'payment' ? 'paid' : 'refunded'),
            remainingAmount: status === 'partial' ? remainingAmount : 0,
            dueDate: status === 'partial' ? new Date(dueDate) : undefined,
            reason,
            originalPaymentId: type === 'refund' && !isAdminOverride ? originalPaymentId : undefined,
            isAdminOverride: isAdminOverride || false,
            date: req.body.date ? new Date(req.body.date) : new Date()
        });

        await transaction.save();

        res.status(201).json({
            success: true,
            message: type === 'refund' 
                ? 'Refund recorded successfully' 
                : (status === 'partial' ? 'Partial payment recorded successfully' : 'Payment recorded successfully'),
            data: transaction
        });

    } catch (error) {
        console.error('Error saving budget transaction:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save budget transaction'
        });
    }
};

// Get transaction statistics
exports.getBudgetStats = async (req, res) => {
    try {
        const [payments, refunds, expenses, pendingPayments] = await Promise.all([
            BudgetTransaction.aggregate([
                { $match: { type: 'payment' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            BudgetTransaction.aggregate([
                { $match: { type: 'refund' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            BudgetTransaction.aggregate([
                { $match: { type: 'expense' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            BudgetTransaction.aggregate([
                { $match: { type: 'payment', status: 'partial' } },
                { $group: { _id: null, total: { $sum: '$remainingAmount' } } }
            ])
        ]);

        const totalPayments = payments[0]?.total || 0;
        const totalRefunds = refunds[0]?.total || 0;
        const totalExpenses = expenses[0]?.total || 0;
        const pendingAmount = pendingPayments[0]?.total || 0;
        const netAmount = totalPayments - totalRefunds - totalExpenses;

        res.status(200).json({
            success: true,
            data: {
                totalPayments,
                totalRefunds,
                totalExpenses,
                pendingAmount,
                netAmount
            }
        });
    } catch (error) {
        console.error('Error fetching budget statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch budget statistics'
        });
    }
};

// Update budget transaction status
exports.updateBudgetTransactionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status || status !== 'paid') { // Only allow updating to 'paid' for now
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid status provided. Only "paid" is allowed.' 
            });
        }

        const transaction = await BudgetTransaction.findById(id);

        if (!transaction) {
            return res.status(404).json({ 
                success: false, 
                message: 'Budget transaction not found' 
            });
        }

        // Only update if current status is partial
        if (transaction.status !== 'partial') {
             return res.status(400).json({ 
                success: false, 
                message: 'Transaction status is not partial, cannot mark as paid.'
            });
        }

        // Update status and remaining amount
        transaction.status = 'paid';
        transaction.remainingAmount = 0;
        transaction.dueDate = undefined; // Clear due date when paid

        await transaction.save();

        res.status(200).json({
            success: true,
            message: 'Transaction status updated to paid',
            data: transaction
        });

    } catch (error) {
        console.error('Error updating budget transaction status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update budget transaction status'
        });
    }
};

// Process refund and update vacancy status
exports.processRefund = async (req, res) => {
    try {
        const {
            teacherId,
            teacherName,
            vacancyId,
            vacancyTitle,
            applicationId,
            amount,
            reason,
            originalPaymentId,
            isAdminOverride
        } = req.body;

        console.log('Processing refund with data:', { 
            teacherId, vacancyId, applicationId, amount, originalPaymentId, isAdminOverride
        });

        // Validate essential fields
        if (!teacherId || !vacancyId || !amount) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields for refund: teacherId, vacancyId, and amount are mandatory'
            });
        }

        // Look up missing fields if necessary
        let actualTeacherName = teacherName;
        let actualVacancyTitle = vacancyTitle;
        let actualReason = reason;

        // If teacherName is missing, try to fetch it
        if (!actualTeacherName) {
            try {
                const Teacher = require('../models/Teacher');
                const teacher = await Teacher.findById(teacherId);
                if (teacher) {
                    actualTeacherName = teacher.fullName || `Teacher ${teacherId}`;
                    console.log(`Found teacher name: ${actualTeacherName}`);
                } else {
                    actualTeacherName = `Teacher ${teacherId}`;
                    console.log(`Teacher not found, using placeholder: ${actualTeacherName}`);
                }
            } catch (lookupError) {
                console.error('Error looking up teacher:', lookupError);
                actualTeacherName = `Teacher ${teacherId}`;
            }
        }

        // If vacancyTitle is missing, try to fetch it
        if (!actualVacancyTitle) {
            try {
                const Vacancy = require('../models/Vacancy');
                const vacancy = await Vacancy.findById(vacancyId);
                if (vacancy) {
                    actualVacancyTitle = vacancy.title || `Vacancy ${vacancyId}`;
                    console.log(`Found vacancy title: ${actualVacancyTitle}`);
                } else {
                    actualVacancyTitle = `Vacancy ${vacancyId}`;
                    console.log(`Vacancy not found, using placeholder: ${actualVacancyTitle}`);
                }
            } catch (lookupError) {
                console.error('Error looking up vacancy:', lookupError);
                actualVacancyTitle = `Vacancy ${vacancyId}`;
            }
        }

        // If reason is missing, use a default
        if (!actualReason) {
            actualReason = "Administrative refund";
            console.log('No reason provided, using default reason');
        }

        // Determine if this is an admin override refund
        const actualIsAdminOverride = Boolean(isAdminOverride);
        console.log('Is admin override refund:', actualIsAdminOverride);

        // Skip original payment validation for admin overrides
        if (!actualIsAdminOverride && !originalPaymentId) {
            return res.status(400).json({
                success: false,
                message: 'Refunds require original payment ID unless isAdminOverride is set to true'
            });
        }

        // Check if refund already exists
        try {
            const query = { 
                type: 'refund'
            };
            
            // Convert IDs to ObjectId safely if they're strings
            if (typeof teacherId === 'string') {
                query.teacherId = new mongoose.Types.ObjectId(teacherId);
            } else {
                query.teacherId = teacherId;
            }
            
            if (typeof vacancyId === 'string') {
                query.vacancyId = new mongoose.Types.ObjectId(vacancyId);
            } else {
                query.vacancyId = vacancyId;
            }
            
            console.log('Checking for existing refund with query:', query);
            const existingRefund = await BudgetTransaction.findOne(query);

            if (existingRefund) {
                // If it has already been processed, update the application status anyway
                // This ensures the MongoDB status is correctly updated
                console.log('A refund has already been processed for this teacher and vacancy. Will attempt to update application status anyway.');
                await updateApplicationStatus(teacherId, vacancyId, applicationId);
                
                return res.status(400).json({
                    success: false,
                    message: 'A refund has already been processed for this teacher and vacancy'
                });
            }
        } catch (queryError) {
            console.error('Error checking for existing refund:', queryError);
            // Continue processing even if the check fails
        }

        // Create and save the refund transaction
        const transactionData = {
            teacherId,
            teacherName: actualTeacherName,
            vacancyId,
            vacancyTitle: actualVacancyTitle,
            amount,
            type: 'refund',
            status: 'refunded',
            reason: actualReason,
            isAdminOverride: actualIsAdminOverride,
            date: req.body.date ? new Date(req.body.date) : new Date()
        };
        
        // Only add applicationId if it exists and isn't a synthetic ID
        if (applicationId) {
            // Check if it's a string that starts with 'synthetic-'
            if (typeof applicationId === 'string' && applicationId.startsWith('synthetic-')) {
                console.log('Skipping synthetic applicationId:', applicationId);
            } else {
                transactionData.applicationId = applicationId;
            }
        }
        
        // Only add originalPaymentId if it's not an admin override and exists
        if (!actualIsAdminOverride && originalPaymentId) {
            transactionData.originalPaymentId = originalPaymentId;
        }

        console.log('Creating refund transaction with data:', transactionData);
        const transaction = new BudgetTransaction(transactionData);

        await transaction.save();

        // Update application status and vacancy
        await updateApplicationStatus(teacherId, vacancyId, applicationId);

        res.status(201).json({
            success: true,
            message: 'Refund processed successfully and vacancy status updated',
            data: transaction
        });

    } catch (error) {
        console.error('Error processing refund:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process refund',
            error: error.message
        });
    }
};

// Helper function to update application status during refund process
async function updateApplicationStatus(teacherId, vacancyId, applicationId) {
    try {
        // Convert IDs to ObjectId if needed
        const vacancyObjectId = typeof vacancyId === 'string' 
            ? new mongoose.Types.ObjectId(vacancyId) 
            : vacancyId;
        const teacherObjectId = typeof teacherId === 'string' 
            ? new mongoose.Types.ObjectId(teacherId) 
            : teacherId;
            
        console.log(`Looking for vacancy with ID: ${vacancyObjectId}`);
        const vacancy = await Vacancy.findById(vacancyObjectId);
        
        if (!vacancy) {
            console.log(`Vacancy not found with ID: ${vacancyId}`);
            throw new Error('Vacancy not found');
        }
    
        console.log(`Found vacancy: ${vacancy.title}`);
        
        let updateSuccess = false;
        
        // 1. Try updating by applicationId if provided
        if (applicationId) {
            try {
                console.log(`Attempting to update application with ID: ${applicationId}`);
                const result = await Vacancy.updateOne(
                    { _id: vacancyObjectId, 'applications._id': applicationId },
                    { $set: { 'applications.$.status': 'rejected' } }
                );
                
                if (result.modifiedCount > 0) {
                    console.log(`Successfully updated application ${applicationId} to rejected`);
                    updateSuccess = true;
                } else {
                    console.log(`No application found with ID: ${applicationId}`);
                }
            } catch (appError) {
                console.error('Error updating application by ID:', appError);
            }
        }
        
        // 2. If applicationId approach failed or wasn't attempted, try by teacherId
        if (!updateSuccess) {
            try {
                console.log(`Trying multiple query patterns for teacher ID: ${teacherObjectId}`);
                
                // Try different ways the teacher ID might be stored
                const queries = [
                    // Pattern 1: Direct teacher ID match
                    { 
                        updateQuery: { 
                            _id: vacancyObjectId, 
                            'applications.teacher': teacherObjectId 
                        }
                    },
                    // Pattern 2: Teacher ID stored inside teacher object
                    { 
                        updateQuery: { 
                            _id: vacancyObjectId, 
                            'applications.teacher._id': teacherObjectId 
                        }
                    },
                    // Pattern 3: Using teacherId field
                    { 
                        updateQuery: { 
                            _id: vacancyObjectId, 
                            'applications.teacherId': teacherObjectId
                        }
                    },
                    // Pattern 4: String match (in case ObjectId comparison fails)
                    { 
                        updateQuery: { 
                            _id: vacancyObjectId,
                            'applications.teacher': teacherId.toString()
                        }
                    }
                ];
                
                // Try each pattern until one works
                for (const pattern of queries) {
                    console.log('Trying query pattern:', JSON.stringify(pattern.updateQuery));
                    const result = await Vacancy.updateOne(
                        pattern.updateQuery,
                        { $set: { 'applications.$.status': 'rejected' } }
                    );
                    
                    if (result.modifiedCount > 0) {
                        console.log(`Successfully updated application for teacher ${teacherId} to rejected using pattern: ${JSON.stringify(pattern.updateQuery)}`);
                        updateSuccess = true;
                        break;
                    }
                }
            } catch (teacherAppError) {
                console.error('Error updating application by teacher ID variants:', teacherAppError);
            }
        }
        
        // 3. If all update attempts failed, try fetching the full vacancy and searching
        if (!updateSuccess) {
            try {
                console.log('Trying to find application by fetching and examining the full vacancy...');
                const fullVacancy = await Vacancy.findById(vacancyObjectId)
                    .populate('applications.teacher');
                    
                if (fullVacancy && fullVacancy.applications && fullVacancy.applications.length > 0) {
                    console.log(`Found ${fullVacancy.applications.length} applications in vacancy`);
                    
                    // Log the structure of the first application to understand data model
                    console.log('First application structure:', JSON.stringify(fullVacancy.applications[0], null, 2));
                    
                    // Find application with matching teacher
                    let matchingApp = null;
                    for (const app of fullVacancy.applications) {
                        // Try all possible ways the teacher ID might be referenced
                        const appTeacherId = app.teacherId 
                            || (app.teacher?._id ? app.teacher._id.toString() : null)
                            || (app.teacher ? app.teacher.toString() : null);
                            
                        console.log(`Checking application, found teacherId: ${appTeacherId}`);
                        
                        if (appTeacherId && 
                            (appTeacherId === teacherId.toString() || 
                             appTeacherId === teacherObjectId.toString())) {
                            matchingApp = app;
                            console.log(`Found matching application with ID: ${app._id}`);
                            break;
                        }
                    }
                    
                    if (matchingApp) {
                        // Update directly using applicationId
                        const result = await Vacancy.updateOne(
                            { _id: vacancyObjectId, 'applications._id': matchingApp._id },
                            { $set: { 'applications.$.status': 'rejected' } }
                        );
                        
                        if (result.modifiedCount > 0) {
                            console.log(`Updated application ${matchingApp._id} to rejected`);
                            updateSuccess = true;
                        } else {
                            console.log(`Failed to update application ${matchingApp._id}`);
                        }
                    } else {
                        console.log(`Could not find application for teacher ${teacherId} in vacancy ${vacancyId}`);
                    }
                }
            } catch (fullVacancyError) {
                console.error('Error while examining full vacancy:', fullVacancyError);
            }
        }
        
        // 4. If absolutely all approaches failed, try as a direct DB update
        if (!updateSuccess) {
            try {
                console.log('Attempting last-resort direct database update');
                
                // Use MongoDB directly for a more flexible query
                const db = mongoose.connection.db;
                const vacanciesCollection = db.collection('vacancies');
                
                // Try a direct update with string comparison
                const result = await vacanciesCollection.updateOne(
                    { 
                        _id: vacancyObjectId,
                        'applications.teacher._id': { $regex: teacherId.toString() }
                    },
                    { $set: { 'applications.$.status': 'rejected' } }
                );
                
                if (result.modifiedCount > 0) {
                    console.log('Updated application status using direct MongoDB query');
                    updateSuccess = true;
                } else {
                    console.log('Direct MongoDB query failed to update application status');
                }
            } catch (directDbError) {
                console.error('Error with direct MongoDB update:', directDbError);
            }
        }
        
        // Check for remaining accepted applications
        try {
            const vacancyWithApps = await Vacancy.findById(vacancyObjectId);
            const hasOtherAcceptedApplications = vacancyWithApps.applications?.some(
                app => app.status === 'accepted'
            );
            
            console.log(`Vacancy has other accepted applications: ${hasOtherAcceptedApplications}`);

            // Only reopen the vacancy if there are no other accepted applications
            if (!hasOtherAcceptedApplications) {
                await Vacancy.findByIdAndUpdate(
                    vacancyObjectId,
                    { status: 'open' },
                    { new: true }
                );
                console.log(`Vacancy ${vacancyId} reopened successfully after refund`);
            }
        } catch (statusCheckError) {
            console.error('Error checking for other accepted applications:', statusCheckError);
        }
        
        return updateSuccess;
    } catch (error) {
        console.error('Error in updateApplicationStatus helper:', error);
        return false;
    }
}

// Delete a budget transaction
exports.deleteBudgetTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Transaction ID is required'
            });
        }
        
        // Find the transaction first
        const transaction = await BudgetTransaction.findById(id);
        
        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }
        
        // For now, only allow deleting expense transactions
        if (transaction.type !== 'expense') {
            return res.status(403).json({
                success: false,
                message: 'Only expense transactions can be deleted'
            });
        }
        
        // Delete the transaction
        await BudgetTransaction.findByIdAndDelete(id);
        
        res.status(200).json({
            success: true,
            message: 'Transaction deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting budget transaction:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete budget transaction'
        });
    }
}; 
