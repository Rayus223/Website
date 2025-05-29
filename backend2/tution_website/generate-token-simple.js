// Simple token generator script
require('dotenv').config();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Teacher = require('./models/TeacherApply');

// Set the JWT secret manually if not in environment variables
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'dev_jwt_secret_for_testing_purposes';
  console.log('Using default JWT_SECRET');
} else {
  console.log('Using JWT_SECRET from environment');
}

// Connect to database
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tution_website')
  .then(async () => {
    try {
      // Find a teacher
      const teacher = await Teacher.findOne({}).select('_id email fullName');
      
      if (!teacher) {
        console.log('No teachers found in database.');
        process.exit(1);
      }
      
      // Create a token
      const token = jwt.sign(
        { 
          id: teacher._id, 
          email: teacher.email,
          role: 'teacher'
        },
        process.env.JWT_SECRET,
        { expiresIn: '365d' }
      );
      
      console.log(token);
      
      mongoose.disconnect();
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });