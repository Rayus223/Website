const Teacher = require('../models/TeacherApply');
const Parent = require('../models/Parent_apply');  // Add this import
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.signup = async (req, res) => {
    try {
        console.log('Signup controller received data:', req.body);

        const {
            fullName,
            email,
            phone,
            password,
            grade,
            subjects,
            address,
            latitude,
            longitude,
            agreementAccepted,
            cvUrl
        } = req.body;

        // Validate required fields
        if (!fullName || !email || !phone || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        // Check if email exists
        const existingTeacher = await Teacher.findOne({ email });
        if (existingTeacher) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Parse subjects with validation
        let parsedSubjects = [];
        try {
            if (subjects) {
                parsedSubjects = JSON.parse(subjects);
                // If grade is higher than 10, require at least one subject
                if (grade > 10 && (!Array.isArray(parsedSubjects) || parsedSubjects.length === 0)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Please select at least one subject for grades above 10'
                    });
                }
            }
        } catch (error) {
            console.error('Error parsing subjects:', error);
            return res.status(400).json({
                success: false,
                message: 'Invalid subjects format'
            });
        }

        // Ensure location is properly formatted for MongoDB
        let locationData;
        if (latitude && longitude) {
            locationData = {
                type: 'Point',
                coordinates: [parseFloat(longitude), parseFloat(latitude)]
            };
        } else {
            return res.status(400).json({
                success: false,
                message: 'Location coordinates are required'
            });
        }

        // Create teacher with proper error handling
        const teacher = new Teacher({
            fullName,
            email,
            phone,
            password: hashedPassword,
            grade: grade ? parseInt(grade) : undefined,
            subjects: parsedSubjects,
            address,
            location: locationData,
            agreementAccepted: agreementAccepted === 'true',
            cv: cvUrl,
            status: 'pending'
        });

        await teacher.save();

        // Generate token
        const token = jwt.sign(
            { id: teacher._id },
            process.env.JWT_SECRET,
            { expiresIn: '365d' }
        );

        res.status(200).json({
            success: true,
            message: 'Registration successful! Please wait for admin approval.',
            data: {
                teacher: {
                    id: teacher._id,
                    fullName: teacher.fullName,
                    email: teacher.email,
                    status: teacher.status
                },
                token
            }
        });

    } catch (error) {
        console.error('Signup Error:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: Object.values(error.errors).map(err => err.message).join(', ')
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error creating account',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
};

// ... rest of the controller code (login, checkRegistration, etc.) 

// Teacher login
exports.login = async (req, res) => {
    try {
        console.log('Login attempt for:', req.body.email);
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Find teacher
        const teacher = await Teacher.findOne({ email });
        if (!teacher) {
            console.log(`Login failed: No user found with email ${email}`);
            return res.status(400).json({
                success: false,
                message: 'Invalid credentials - user not found'
            });
        }

        // Log teacher details for debugging (remove in production)
        console.log(`Found teacher: ID=${teacher._id}, Status=${teacher.status}`);

        // Verify password
        const isMatch = await bcrypt.compare(password, teacher.password);
        if (!isMatch) {
            console.log(`Login failed: Password mismatch for ${email}`);
            return res.status(400).json({
                success: false,
                message: 'Invalid credentials - password incorrect'
            });
        }

        // Create token
        const token = jwt.sign(
            { id: teacher._id, role: teacher.role },
            process.env.JWT_SECRET,
            { expiresIn: '365d' }
        );

        console.log(`Login successful for ${email}`);
        res.json({
            success: true,
            token,
            teacher: {
                id: teacher._id,
                fullName: teacher.fullName,
                email: teacher.email,
                phone: teacher.phone,
                role: teacher.role,
                status: teacher.status
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error logging in',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
};

// Reset password request
exports.resetPasswordRequest = async (req, res) => {
    try {
        const { email } = req.body;
        const teacher = await Teacher.findOne({ email });

        if (!teacher) {
            return res.status(404).json({
                success: false,
                message: 'Email not found'
            });
        }

        // Generate reset token
        const resetToken = jwt.sign(
            { id: teacher._id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Import required modules
        const emailConfig = require('../config/email.config');
        
        // Detect development mode from request headers or env variable
        const isDev = req.headers['x-dev-mode'] === 'true' || process.env.NODE_ENV === 'development';
        console.log('Development mode detected:', isDev);
        
        // Create reset URL with proper domain based on environment
        const baseUrl = isDev ? emailConfig.devFrontendUrl : emailConfig.frontendUrl;
        const resetUrl = `${baseUrl}/Apply/teacher.html?token=${resetToken}&email=${encodeURIComponent(email)}`;
        
        console.log('Password reset link generated:', resetUrl);
        
        // Track whether email was sent successfully
        let emailSent = false;
        
        try {
            // Use SendGrid for email sending
            const sgMail = require('@sendgrid/mail');
            sgMail.setApiKey(emailConfig.sendgrid.apiKey);
            
            const msg = {
                to: email,
                from: {
                    email: emailConfig.sendgrid.fromEmail,
                    name: "Dear Sir Home Tuition"
                },
                subject: 'Password Reset Request - Dear Sir Home Tuition',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <h1 style="color: #185a9d;">Dear Sir Home Tuition</h1>
                            <h2 style="color: #43cea2;">Password Reset Request</h2>
                        </div>
                        <p style="font-size: 16px; line-height: 1.6;">Hello ${teacher.fullName},</p>
                        <p style="font-size: 16px; line-height: 1.6;">We received a request to reset your password. Please click the button below to create a new password:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetUrl}" style="background: linear-gradient(135deg, #43cea2, #185a9d); color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Reset My Password</a>
                        </div>
                        <p style="font-size: 16px; line-height: 1.6;">This link will expire in 1 hour for security reasons.</p>
                        <p style="font-size: 16px; line-height: 1.6;">If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 14px;">
                            <p>Dear Sir Home Tuition</p>
                            <p>This is an automated email, please do not reply.</p>
                        </div>
                    </div>
                `
            };
            
            await sgMail.send(msg);
            console.log('Password reset email sent to:', email);
            emailSent = true;
        } catch (emailError) {
            console.error('Error sending email:', emailError);
            console.log('Email configuration used:', {
                provider: 'SendGrid',
                apiKeyProvided: !!emailConfig.sendgrid.apiKey,
                fromEmail: emailConfig.sendgrid.fromEmail
            });
            
            // Fall back to just console logging the reset URL
            console.log('----------------------------------------');
            console.log('FALLBACK: Password Reset URL (copy this):');
            console.log(resetUrl);
            console.log('----------------------------------------');
        }

        // For development/demo purposes, also return the token and URL
        res.json({
            success: true,
            message: emailSent ? 
                'Password reset link has been sent to your email' : 
                'Password reset link generated (check console for URL)',
            // The following would be removed in production
            resetToken,
            resetUrl
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending reset link'
        });
    }
};

// Complete password reset with token
exports.completeReset = async (req, res) => {
    try {
        const { token, email, password } = req.body;
        
        if (!token || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Token, email and password are required'
            });
        }
        
        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }
        
        // Find the teacher by email
        const teacher = await Teacher.findOne({ email });
        if (!teacher) {
            return res.status(404).json({
                success: false,
                message: 'Teacher not found'
            });
        }
        
        // Verify token was issued for this teacher
        if (decoded.id.toString() !== teacher._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Token is not valid for this user'
            });
        }
        
        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Update the password
        teacher.password = hashedPassword;
        await teacher.save();
        
        res.json({
            success: true,
            message: 'Password has been reset successfully'
        });
    } catch (error) {
        console.error('Complete reset error:', error);
        res.status(500).json({
            success: false,
            message: 'Error resetting password'
        });
    }
};

// Add this function to your existing controller
exports.checkRegistration = async (req, res) => {
    try {
        const { email } = req.query;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        const teacher = await Teacher.findOne({ email });
        
        res.json({
            success: true,
            isRegistered: !!teacher
        });
    } catch (error) {
        console.error('Check registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking registration'
        });
    }
};

// Add this new method to your controller
exports.getProfile = async (req, res) => {
    try {
        const teacherId = req.user.id;
        
        const teacher = await Teacher.findById(teacherId).select('-password');
        
        if (!teacher) {
            return res.status(404).json({
                success: false,
                message: 'Teacher not found'
            });
        }

        res.json({
            success: true,
            teacher: {
                fullName: teacher.fullName,
                email: teacher.email,
                phone: teacher.phone,
                address: teacher.address,
                location: teacher.location,
                grade: teacher.grade,
                subjects: teacher.subjects,
                cv: teacher.cv,
                certificates: teacher.certificates,
                status: teacher.status,
                agreementAccepted: teacher.agreementAccepted
            }
        });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching profile'
        });
    }
};



exports.acceptTeacherApplication = async (req, res) => {
    try {
        const { teacherId, vacancyId } = req.params;
        const { parentId } = req.body;  // Add parentId in request

        // Update teacher status
        const teacher = await Teacher.findByIdAndUpdate(
            teacherId,
            { status: 'accepted' },
            { new: true }
        );

        if (!teacher) {
            return res.status(404).json({
                success: false,
                message: 'Teacher not found'
            });
        }

        // Update parent application status
        if (parentId) {
            const parent = await Parent.findByIdAndUpdate(
                parentId,
                { 
                    status: 'done',
                    'vacancyDetails.acceptedTeacher': teacherId,
                    'vacancyDetails.vacancyId': vacancyId
                },
                { new: true }
            );
            if (!parent) {
                console.warn('Parent application not found:', parentId);
            }
        }

        res.json({
            success: true,
            message: 'Teacher accepted successfully',
            data: teacher
        });

    } catch (error) {
        console.error('Error accepting teacher:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Add this function to handle teacher rejection
exports.rejectTeacherApplication = async (req, res) => {
    try {
        const { teacherId, vacancyId } = req.params;
        const { parentId } = req.body;

        // Update teacher status
        const teacher = await Teacher.findByIdAndUpdate(
            teacherId,
            { status: 'rejected' },
            { new: true }
        );

        if (!teacher) {
            return res.status(404).json({
                success: false,
                message: 'Teacher not found'
            });
        }

        // Update parent application rejection count
        if (parentId) {
            const parent = await Parent.findById(parentId);
            if (parent) {
                parent.vacancyDetails.rejectedCount = (parent.vacancyDetails.rejectedCount || 0) + 1;
                
                // If 5 rejections, update status to not_done
                if (parent.vacancyDetails.rejectedCount >= 5) {
                    parent.status = 'not_done';
                }

                await parent.save();
            }
        }
        res.json({
            success: true,
            message: 'Teacher rejected successfully',
            data: teacher
        });

    } catch (error) {
        console.error('Error rejecting teacher:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.updateVacancyStatus = async (req, res) => {
    try {
        const { parentId } = req.params;
        const { status } = req.body;

        const parent = await Parent.findByIdAndUpdate(
            parentId,
            { 
                status,
                ...(status === 'pending' && {
                    'vacancyDetails.createdAt': new Date()
                })
            },
            { new: true }
        );

        if (!parent) {
            return res.status(404).json({
                success: false,
                message: 'Parent application not found'
            });
        }

        res.json({
            success: true,
            message: 'Status updated successfully',
            data: parent
        });

    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

