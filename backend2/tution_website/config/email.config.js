require('dotenv').config();

module.exports = {
    // Nodemailer configuration (Gmail)
    fromEmail: '091pandeyanish@gmail.com',
    toEmail: 'dearsir.tuition@gmail.com',
    password: process.env.EMAIL_PASSWORD,
    service: 'gmail',
    
    // SendGrid configuration (preferred)
    sendgrid: {
        apiKey: process.env.SENDGRID_API_KEY,
        fromEmail: 'hi@dearsirhometuition.com', // This should be verified in SendGrid
    },
    
    // Application URLs
    frontendUrl: 'https://dearsirhometuition.com',
    devFrontendUrl: 'http://127.0.0.1:5500/Website/frontend3'  // Use this for local development
};