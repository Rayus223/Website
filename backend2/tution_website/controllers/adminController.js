const Admin = require('../models/Admin');
const Teacher = require('../models/TeacherApply');
const Vacancy = require('../models/Vacancy');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {
            expiresIn: '1d'
        });

        res.json({ success: true, token });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        // Use models from the request's database connection
        const TeacherModel = req.dbConnection.model('TeacherApply');
        const VacancyModel = req.dbConnection.model('Vacancy');
        
        const [totalApplications, activeVacancies, approvedTeachers] = await Promise.all([
            TeacherModel.countDocuments({ status: 'pending' }),
            VacancyModel.countDocuments({ status: 'open' }),
            TeacherModel.countDocuments({ status: 'approved' })
        ]);

        res.json({
            totalApplications,
            activeVacancies,
            approvedTeachers
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Error fetching dashboard stats' });
    }
};

exports.getApplications = async (req, res) => {
    try {
        // Use models from the request's database connection
        const TeacherModel = req.dbConnection.model('TeacherApply');
        
        const applications = await TeacherModel.find()
            .sort({ createdAt: -1 });
        res.json({ applications });
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({ message: 'Error fetching applications' });
    }
};

exports.updateApplicationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        // Use models from the request's database connection
        const TeacherModel = req.dbConnection.model('TeacherApply');

        const application = await TeacherModel.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        res.json({ success: true, application });
    } catch (error) {
        console.error('Error updating application:', error);
        res.status(500).json({ message: 'Error updating application' });
    }
};

exports.getVacancies = async (req, res) => {
    try {

     const VacancyModel = req.dbConnection.model('Vacancy');
    
    const vacancies = await VacancyModel.find()
                .sort({ createdAt: -1 })
                .limit(150); 
    
    res.json({ vacancies });
  } catch (error) {
      console.error('Error fetching vacancies:', error);
     res.status(500).json({ message: 'Error fetching vacancies' });
    }
    };

exports.createVacancy = async (req, res) => {
    try {
        // Use models from the request's database connection
        const VacancyModel = req.dbConnection.model('Vacancy');
        
        const vacancy = new VacancyModel(req.body);
        await vacancy.save();
        res.json({ success: true, vacancy });
    } catch (error) {
        console.error('Error creating vacancy:', error);
        res.status(500).json({ message: 'Error creating vacancy' });
    }
};

exports.updateVacancy = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Use models from the request's database connection
        const VacancyModel = req.dbConnection.model('Vacancy');
        
        const vacancy = await VacancyModel.findByIdAndUpdate(
            id,
            req.body,
            { new: true }
        );
        res.json({ success: true, vacancy });
    } catch (error) {
        console.error('Error updating vacancy:', error);
        res.status(500).json({ message: 'Error updating vacancy' });
    }
};

exports.deleteVacancy = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Use models from the request's database connection
        const VacancyModel = req.dbConnection.model('Vacancy');
        
        await VacancyModel.findByIdAndDelete(id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting vacancy:', error);
        res.status(500).json({ message: 'Error deleting vacancy' });
    }
};

exports.getTeachers = async (req, res) => {
    try {
        // Use models from the request's database connection
        const TeacherModel = req.dbConnection.model('TeacherApply');
        
        const teachers = await TeacherModel.find({ status: 'approved' })
            .sort({ createdAt: -1 });
        res.json({ teachers });
    } catch (error) {
        console.error('Error fetching teachers:', error);
        res.status(500).json({ message: 'Error fetching teachers' });
    }
};
