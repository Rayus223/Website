require('dotenv').config();

module.exports = {
    // Nodemailer configuration (Gmail)
    fromEmail: '091pandeyanish@gmail.com',
    toEmail: 'dearsir.tuition@gmail.com',
    password: process.env.EMAIL_PASSWORD,
    service: 'gmail',
    
    // SendGrid configuration (preferred)
    sendgrid: {
        apiKey: process.env.SENDGRID_API_KEY || 'your-sendgrid-api-key',
        fromEmail: 'hi@dearsirhometuition.com', // This should be verified in SendGrid
    },
    
    // Application URLs
    frontendUrl: 'https://dearsirhometuition.com',
    devFrontendUrl: 'http://localhost:3000'  // Use this for local development
};