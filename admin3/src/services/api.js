import axios from 'axios';
import { message } from 'antd';
import ErrorHandler from '../utils/handlers/errorHandler';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Export the api instance for direct use
export const api = axios.create({
  baseURL: API_BASE_URL, // Fixed typo here (removed quotes)
  timeout: 30000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Adding authorization header with token:', token.substring(0, 15) + '...');
    } else {
      console.warn('No admin token found in localStorage');
      // If we're not on the login page and there's no token, redirect to login
      if (!window.location.pathname.includes('/login')) {
        console.warn('No authentication token found. Redirecting to login...');
        setTimeout(() => {
          window.location.href = '/login';
        }, 500);
      }
    }
    config.headers['Content-Type'] = 'application/json';
    
    // Log outgoing requests
    console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`, 
                config.data ? JSON.stringify(config.data).substring(0, 100) + '...' : '');
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} from ${response.config.url.substring(0, 30)}...`);
    return response.data;
  },
  (error) => {
    console.error('API Error:', error);
    
    if (error.response) {
      console.error(`API Error ${error.response.status}: ${error.response.statusText}`);
      console.error('Error details:', error.response.data);
      
      // Handle 401 Unauthorized errors
      if (error.response.status === 401) {
        console.warn('Authentication error detected. Current token:', 
                    localStorage.getItem('adminToken')?.substring(0, 15) + '...');
        
        // Clear invalid token
        localStorage.removeItem('adminToken');
        
        // Redirect to login page
        if (!window.location.pathname.includes('/login')) {
          message.error('Your session has expired. Please log in again.');
          setTimeout(() => {
            window.location.href = '/login';
          }, 1000);
        }
      }
    } else if (error.request) {
      console.error('No response received:', error.request);
      message.error('Network error. Please check your connection.');
    } else {
      console.error('Error setting up request:', error.message);
      message.error('An error occurred. Please try again.');
    }
    
    return Promise.reject(error);
  }
);

const apiService = {
  // Dashboard Statistics
  getDashboardStats: async () => {
    try {
      console.log('Starting dashboard stats fetch...');
      
      // Perform API calls in parallel
      const [studentsResponse, parentsResponse, teachersResponse] = await Promise.all([
        api.get('/api/student-apply/all'),
        api.get('/api/parent-apply/all'),
        api.get('/api/teacher-apply/all')
      ]);
      
      // Handle different response structures
      const students = Array.isArray(studentsResponse) ? studentsResponse : 
                      (studentsResponse.data ? studentsResponse.data : []);
      
      const parents = Array.isArray(parentsResponse) ? parentsResponse : 
                     (parentsResponse.data ? parentsResponse.data : []);
      
      const teachers = Array.isArray(teachersResponse) ? teachersResponse : 
                      (teachersResponse.data ? teachersResponse.data : []);
      
      console.log('Students data:', students.length);
      console.log('Parents data:', parents.length);
      console.log('Teachers data:', teachers.length);

      // Construct and return stats object
      return {
        students: students.length,
        parents: parents.length,
        teachers: {
          total: teachers.length,
          pending: teachers.filter(t => t.status === 'pending').length,
          approved: teachers.filter(t => t.status === 'approved').length,
          rejected: teachers.filter(t => t.status === 'rejected').length
        }
      };
    } catch (error) {
      console.error('Error in getDashboardStats:', error);
      // Return default values instead of throwing
      return {
        students: 0,
        parents: 0,
        teachers: {
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0
        }
      };
    }
  },

  // Teachers
  getAllTeachers: async () => {
    try {
      const directSignups = await api.get('/api/teacher-apply/all'); // Added /api

      const vacancies = await api.get('/api/vacancies'); // Added /api
      const applicants = new Map();

      if (Array.isArray(vacancies)) {
        vacancies.forEach(vacancy => {
          if (vacancy.applications) {
            vacancy.applications.forEach(app => {
              if (app.teacher && !applicants.has(app.teacher._id)) {
                applicants.set(app.teacher._id, {
                  _id: app.teacher._id,
                  fullName: app.teacher.fullName,
                  email: app.teacher.email,
                  phone: app.teacher.phone,
                  status: app.status,
                  cv: app.teacher.cv,
                  subjects: app.teacher.subjects || [],
                  fees: app.teacher.fees,
                  appliedAt: app.appliedAt,
                  isVacancyApplication: true
                });
              }
            });
          }
        });
      }

      const allTeachers = [
        ...(directSignups?.data || []).map(teacher => ({ ...teacher, isDirectSignup: true })),
        ...Array.from(applicants.values())
      ];

      console.log('All teachers:', allTeachers);
      return allTeachers;
    } catch (error) {
      console.error('Error fetching all teachers:', error);
      throw error;
    }
  },

  getTeacherCV: async (teacherId) => {
    const response = await api.get(`/api/teacher-apply/${teacherId}/cv`); // Added /api
    return response.data;
  },

  updateTeacherStatus: async (teacherId, status) => {
    try {
      console.log('Debug - API Service Input:', { teacherId, status });

      if (!teacherId) {
        throw new Error('Teacher ID is required');
      }

      const response = await api.put(`/api/teacher-apply/${teacherId}/status`, { status }); // Added /api
      return response;
    } catch (error) {
      console.error('Error in updateTeacherStatus:', error);
      throw error;
    }
  },

  // Students
  getAllStudents: async () => {
    try {
      const response = await api.get('/api/student-apply/all'); // Added /api
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteStudent: async (id) => {
    try {
      const response = await api.delete(`/api/student-apply/delete/${id}`); // Added /api
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Parents
  getAllParents: async () => {
    const response = await api.get('/api/parent-apply/all'); // Added /api
    return response.data;
  },

  deleteParent: async (id) => {
    const response = await api.delete(`/api/parent-apply/delete/${id}`); // Added /api
    return response.data;
  },

  // Auth
  login: async (credentials) => {
    try {
      console.log('Login attempt with username:', credentials.username);

      if (!credentials.username || !credentials.password) {
        throw new Error('Username and password are required');
      }

      const response = await api.post('/api/admin/login', credentials); // Added /api
      console.log('Login response:', response);

      if (!response.success) {
        throw new Error(response.message || 'Login failed');
      }

      if (!response.token) {
        throw new Error('No token received from server');
      }

      // Save token and admin info to localStorage
      localStorage.setItem('adminToken', response.token);
      
      // Also save admin info for reference
      if (response.admin) {
        localStorage.setItem('adminInfo', JSON.stringify({
          id: response.admin._id,
          username: response.admin.username,
          role: 'admin'
        }));
      }

      // Let's parse the token to log what's in it (for debugging)
      try {
        const tokenParts = response.token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log('Token payload:', payload);
          
          // Ensure the token has the required role field
          if (!payload.role || payload.role !== 'admin') {
            console.warn('Warning: Token does not have admin role:', payload);
          }
        }
      } catch (e) {
        console.error('Error parsing token:', e);
      }

      console.log('Login successful, token stored in localStorage');
      return {
        success: true,
        token: response.token,
        admin: response.admin
      };
    } catch (error) {
      console.error('Login error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      if (error.response?.status === 401) {
        throw new Error('Invalid username or password');
      } else if (error.response?.status === 400) {
        throw new Error('Please provide both username and password');
      } else {
        throw new Error(
          error.response?.data?.message || 
          error.message || 
          'Login failed. Please try again.'
        );
      }
    }
  },

  logout: () => {
    localStorage.removeItem('adminToken');
    window.location.href = '/login';
  },

  // Vacancies
  getAllVacancies: async () => {
    try {
      console.log('Fetching all vacancies...');
      const response = await api.get('/api/vacancies');
      console.log('All vacancies response:', response);
      
      // Handle the case where response might not have success field
      if (response && response.data) {
        const vacanciesData = Array.isArray(response.data) ? response.data : 
                             (response.success === false ? [] : response);
        
        return vacanciesData.map(vacancy => ({
          ...vacancy,
          featured: vacancy.featured || false
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching all vacancies:', error);
      message.error('Failed to fetch vacancies');
      // Return empty array instead of throwing
      return [];
    }
  },

  createVacancy: async (data) => {
    try {
      console.log('Creating vacancy with data:', data);
      const response = await api.post('/api/vacancies', {
        title: data.title,
        subject: data.subject,
        class: data.class,
        time: data.time,
        location: data.location,
        gender: data.gender || 'any',
        description: data.description,
        salary: data.salary,
        status: 'open',
        featured: data.featured || false,
        parentId: data.parentId
      });
      return response;
    } catch (error) {
      console.error('Error creating vacancy:', error);
      throw error;
    }
  },

  updateVacancy: async (id, data) => {
    try {
      // If only featured status is being updated, don't change other fields
      if (Object.keys(data).length === 1 && 'featured' in data) {
        const response = await api.put(`/api/vacancies/${id}`, { featured: data.featured });
        return response;
      }

      // Otherwise, do a full update
      const response = await api.put(`/api/vacancies/${id}`, {
        title: data.title,
        subject: data.subject,
        class: data.class,
        time: data.time,
        location: data.location,
        gender: data.gender || 'any',
        description: data.description,
        salary: data.salary,
        featured: data.featured
      });
      return response;
    } catch (error) {
      console.error('Error updating vacancy:', error);
      throw error;
    }
  },

  deleteVacancy: async (id) => {
    try {
      const isConfirmed = window.confirm('Are you sure you want to delete this vacancy?');
      
      if (!isConfirmed) {
        return null;
      }
      
      const response = await api.delete(`/api/vacancies/${id}`); // Added /api
      return response;
    } catch (error) {
      console.error('Error deleting vacancy:', error);
      throw error;
    }
  },

  updateVacancyStatus: async (id, status) => {
    try {
      console.log('Sending status update:', { id, status });
      const response = await api.patch(`/api/vacancies/${id}/status`, { 
        status: status.toLowerCase() 
      }); // Added /api
      
      console.log('Status update response:', response);
      
      if (!response || response.success === false) {
        throw new Error(response?.message || 'Failed to update status');
      }
      
      return response;
    } catch (error) {
      console.error('Error updating vacancy status:', error);
      throw error;
    }
  },

  getVacancyApplicants: async (vacancyId) => {
    try {
      console.log('Fetching applicants for vacancy:', vacancyId);
      const response = await api.get(`/api/vacancies/${vacancyId}/applicants`); // Added /api
      console.log('Applicants response:', response);
      return response || [];
    } catch (error) {
      console.error('Error fetching vacancy applicants:', error);
      throw error;
    }
  },

  getTeachersByStatus: async (status, locationParams = null) => {
    try {
      let url = `/api/teacher-apply/status/${status}`;
      let queryParams = {};

      if (locationParams) {
        queryParams = {
          latitude: locationParams.latitude,
          longitude: locationParams.longitude,
          radiusKm: locationParams.radiusKm
        };
        console.log(`Fetching teachers with status ${status} and location filter:`, queryParams);
      } else {
        console.log(`Fetching all teachers with status ${status}`);
      }

      // Pass queryParams directly to axios config
      const response = await api.get(url, { params: queryParams });
      console.log(`Teachers with ${status} status response:`, response);
      return response; // Assuming backend sends { success: true, data: [...] }
    } catch (error) {
      console.error('Error fetching teachers by status:', error);
      throw error;
    }
  },

  updateVacancyFeatured: async (id, featured) => {
    try {
      console.log('Updating vacancy featured status:', { id, featured });
      const response = await api.put(`/api/vacancies/${id}`, { featured }); // Added /api
      return response;
    } catch (error) {
      console.error('Error updating vacancy featured status:', error);
      throw error;
    }
  },

  getFeaturedVacancies: async () => {
    try {
      console.log('Fetching featured vacancies...');
      const response = await api.get('/api/vacancies/featured'); // Added /api
      console.log('Featured vacancies response:', response);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching featured vacancies:', error);
      throw error;
    }
  },

  // Simplified updateApplicationStatus to update just the status
  updateApplicationStatus: async (applicationId, status, vacancyId = null) => {
    try {
      console.log('Updating application status:', { applicationId, status, vacancyId });
      
      if (!applicationId) {
        throw new Error('Application ID is required');
      }
      
      // Skip API call for synthetic applications (IDs that start with 'synthetic-')
      if (applicationId.toString().startsWith('synthetic-')) {
        console.log('Skipping API call for synthetic application:', applicationId);
        return { success: true, message: 'Synthetic application update simulated' };
      }
      
      // If vacancyId is not provided, try to find it
      if (!vacancyId) {
        // Find the vacancy for this application in localStorage if possible
        const applications = JSON.parse(localStorage.getItem('applications') || '[]');
        const application = applications.find(app => app._id === applicationId);
        
        if (application && application.vacancyId) {
          vacancyId = application.vacancyId;
          console.log('Found vacancy ID in localStorage:', vacancyId);
        } else {
          // Try to extract from URL or document from scratch
          console.warn('Application not found in localStorage, vacancyId not available');
          // This is a fallback that may not work in all cases
        }
      }
      
      // Different endpoint based on whether we have the vacancy ID or not
      let response;
      if (vacancyId) {
        console.log(`Making PUT request to /api/vacancies/${vacancyId}/applications/${applicationId}/status`);
        response = await api.put(
          `/api/vacancies/${vacancyId}/applications/${applicationId}/status`, 
          { status }
        );
      } else {
        console.log(`Making PUT request to /api/applications/${applicationId}/status`);
        response = await api.put(`/api/applications/${applicationId}/status`, { status });
      }
      
      if (!response || response.success === false) {
        throw new Error(response?.message || 'Failed to update application status');
      }
      
      return response;
    } catch (error) {
      console.error('Error updating application status:', error);
      if (error.response) {
        throw new Error(error.response.data?.message || `Server returned ${error.response.status}`);
      }
      throw new Error(error.message || 'Failed to update application status');
    }
  },

  updateVacancyApplicationStatus: async (vacancyId, applicationId, status) => {
    try {
      console.log('Updating application status with vacancy ID:', { vacancyId, applicationId, status });
      
      if (!vacancyId) {
        throw new Error('Vacancy ID is required');
      }
      
      if (!applicationId) {
        throw new Error('Application ID is required');
      }
      
      const response = await api.put(
        `/api/vacancies/${vacancyId}/applications/${applicationId}/status`, 
        { status }
      );
      
      if (!response || response.success === false) {
        throw new Error(response?.message || 'Failed to update application status');
      }
      
      return response;
    } catch (error) {
      console.error('Error updating application status:', error);
      if (error.response) {
        throw new Error(error.response.data?.message || `Server returned ${error.response.status}`);
      }
      throw new Error(error.message || 'Failed to update application status');
    }
  },

  updateTeacherActiveStatus: async (teacherId, isActive) => {
    try {
      console.log('Updating teacher active status:', { teacherId, isActive });

      const response = await api.put(`/api/teacher-apply/${teacherId}/status`, { 
        isActive
      });
      
      console.log('Update response:', response);

      if (!response || response.success === false) {
        throw new Error(response?.message || 'Failed to update teacher status');
      }
      
      return response;
    } catch (error) {
      console.error('Error updating teacher active status:', error);
      console.error('Error details:', error.response?.data);
      throw error;
    }
  },

  // Budget Management
  getBudgetTransactions: async () => {
    try {
      // Check if we have a token before making the request
      const token = localStorage.getItem('adminToken');
      if (!token) {
        console.error('No authentication token found for budget transaction request');
        return {
          success: false,
          data: [],
          message: 'Authentication required. Please log in again.'
        };
      }

      console.log('Fetching budget transactions with token:', token.substring(0, 15) + '...');
      
      // First fetch teachers to ensure we have their data
      console.log('Fetching teachers first to merge with budget data...');
      const teachersData = await api.get('/api/teacher-apply/all');
      const teachers = Array.isArray(teachersData) ? teachersData : 
                     (teachersData.data ? teachersData.data : []);
      
      console.log(`Fetched ${teachers.length} teachers for data enrichment`);
      
      // Now fetch budget transactions
      const response = await api.get('/api/budget/transactions');
      
      // Check if response is valid and has data
      if (!response) {
        throw new Error('No response received from server');
      }
      
      // Determine the transactions array from the response
      const transactions = Array.isArray(response.data) ? response.data : 
                           (response.data && Array.isArray(response.data.data)) ? response.data.data : [];
      
      console.log(`Received ${transactions.length} budget transactions, enriching with teacher data`);
      
      // Enrich transactions with teacher data
      const enrichedTransactions = transactions.map(transaction => {
        // Find matching teacher
        const teacher = teachers.find(t => String(t._id) === String(transaction.teacherId));
        
        if (teacher) {
          // Merge teacher data with transaction
          return {
            ...transaction,
            phone: teacher.phone || '',
            teacherFullName: teacher.fullName || teacher.name || '',
            _teacherData: { ...teacher }
          };
        }
        
        return transaction;
      });
      
      console.log(`Enriched ${enrichedTransactions.length} transactions with teacher data`);
      
      // Return the data array directly if it exists, otherwise return empty array
      return {
        success: true,
        data: enrichedTransactions
      };
    } catch (error) {
      console.error('Error fetching budget transactions:', error);
      
      // If it's an authentication error, handle it specifically
      if (error.response && error.response.status === 401) {
        // This will be caught by the interceptor, but we'll also handle it here
        return {
          success: false,
          data: [],
          message: 'Your session has expired. Please log in again.'
        };
      }
      
      return {
        success: false,
        data: [],
        message: error.message || 'Failed to fetch budget data'
      };
    }
  },

  createBudgetTransaction: async (transactionData) => {
    try {
      // Ensure we have a token
      const token = localStorage.getItem('adminToken');
      if (!token) {
        console.error('No admin token found for budget transaction');
        message.error('Authentication required. Please log in again.');
        
        // Redirect to login after a short delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
        
        return {
          success: false,
          message: 'Authentication required'
        };
      }
      
      console.log('Creating budget transaction:', transactionData);
      
      // Convert amountLeft to remainingAmount if it exists
      const { amountLeft, ...restData } = transactionData;
      
      // Make the API call
      const response = await api.post('/api/budget/transactions', {
        ...restData,
        // Convert amountLeft to remainingAmount to match backend
        remainingAmount: amountLeft !== undefined ? amountLeft : transactionData.remainingAmount || 0,
        // Ensure these fields are explicitly set
        status: transactionData.status || 'paid',
        dueDate: transactionData.dueDate || null,
        date: transactionData.date || new Date().toISOString()
      });
      
      if (!response || response.success === false) {
        throw new Error(response?.message || 'Failed to create budget transaction');
      }
      
      console.log('Budget transaction created successfully:', response);
      return response;
    } catch (error) {
      console.error('Error creating budget transaction:', error);
      
      // Handle authentication errors
      if (error.response && error.response.status === 401) {
        message.error('Your session has expired. Please log in again.');
        
        // Clear token and redirect
        localStorage.removeItem('adminToken');
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
        
        return {
          success: false,
          message: 'Authentication failed'
        };
      }
      
      // Handle other errors
      if (error.response) {
        message.error(error.response.data?.message || `Server error: ${error.response.status}`);
        return {
          success: false,
          message: error.response.data?.message || `Server returned ${error.response.status}`
        };
      }
      
      message.error(error.message || 'Failed to create budget transaction');
      return {
        success: false,
        message: error.message || 'Failed to create budget transaction'
      };
    }
  },

  saveBudgetTransaction: async (transactionData) => {
    try {
        console.log('Saving budget transaction:', transactionData);
        const response = await api.post('/api/budget/transactions', {
            ...transactionData,
            // Ensure these fields are explicitly set for partial payments
            status: transactionData.status || 'paid',
            // Convert amountLeft to remainingAmount to match backend expectation
            remainingAmount: transactionData.amountLeft || 0,
            dueDate: transactionData.dueDate || null
        });
        
        if (!response || response.success === false) {
            throw new Error(response?.message || 'Failed to save transaction');
        }
        
        return response;
    } catch (error) {
        console.error('Error saving budget transaction:', error);
        throw error;
    }
  },
  
  // Process refund and update vacancy status
  processRefund: async (refundData) => {
    try {
        // Validate essential fields
        const { teacherId, vacancyId, amount, originalPaymentId } = refundData;
        if (!teacherId || !vacancyId || !amount) {
          console.error('Missing essential refund data:', { teacherId, vacancyId, amount });
          throw new Error('Missing required fields for refund: teacherId, vacancyId, and amount');
        }
        
        // Ensure teacherName, vacancyTitle, and reason have values
        const dataToSend = {
          ...refundData,
          teacherName: refundData.teacherName || 'Unknown Teacher',
          vacancyTitle: refundData.vacancyTitle || 'Unknown Vacancy',
          reason: refundData.reason || 'Administrative refund'
        };
        
        // Add isAdminOverride if originalPaymentId is missing
        if (!originalPaymentId && !dataToSend.isAdminOverride) {
          dataToSend.isAdminOverride = true;
          console.log('Setting isAdminOverride=true because originalPaymentId is missing');
        }
        
        console.log('Processing refund with data:', JSON.stringify(dataToSend, null, 2));
        
        try {
          const response = await api.post('/api/budget/refund', dataToSend);
          
          console.log('Refund API raw response:', response);
          
          if (!response || response.success === false) {
              throw new Error(response?.message || 'Failed to process refund');
          }
          
          return response;
        } catch (axiosError) {
          console.error('Axios error in processRefund:', axiosError);
          if (axiosError.response) {
            // Server responded with an error
            console.error('Response data:', axiosError.response.data);
            console.error('Response status:', axiosError.response.status);
            throw new Error(axiosError.response.data?.message || 
                          `Server error: ${axiosError.response.status}`);
          } else if (axiosError.request) {
            // Request made but no response received
            console.error('No response received:', axiosError.request);
            throw new Error('No response received from server');
          } else {
            // Error setting up the request
            throw axiosError;
          }
        }
    } catch (error) {
        console.error('Error processing refund:', error);
        throw error;
    }
  },

  getBudgetStats: async () => {
    try {
      const response = await api.get('/api/budget/stats');
      return response;
    } catch (error) {
      console.error('Error fetching budget statistics:', error);
      throw error;
    }
  },

  // Add new function to update budget transaction status
  updateBudgetTransactionStatus: async (transactionId, status) => {
    try {
        console.log(`Updating budget transaction ${transactionId} status to ${status}`);
        const response = await api.put(`/api/budget/transactions/${transactionId}/status`, { status });
        
        if (!response || response.success === false) {
             throw new Error(response?.message || 'Failed to update transaction status');
        }

        console.log('Transaction status updated successfully:', response);
        return response;
    } catch (error) {
        console.error('Error updating budget transaction status:', error);
        // Handle specific errors like 401 or 404 if needed
        if (error.response) {
            message.error(error.response.data?.message || `Server error: ${error.response.status}`);
        } else {
            message.error(error.message || 'Failed to update transaction status');
        }
        throw error; // Re-throw error to be caught by calling function
    }
  },

  // Delete a budget transaction (used for expenses)
  deleteBudgetTransaction: async (transactionId) => {
    try {
        console.log(`Deleting budget transaction ${transactionId}`);
        const response = await api.delete(`/api/budget/transactions/${transactionId}`);
        
        if (!response || response.success === false) {
             throw new Error(response?.message || 'Failed to delete transaction');
        }

        console.log('Transaction deleted successfully:', response);
        return response;
    } catch (error) {
        console.error('Error deleting budget transaction:', error);
        if (error.response) {
            message.error(error.response.data?.message || `Server error: ${error.response.status}`);
        } else {
            message.error(error.message || 'Failed to delete transaction');
        }
        throw error;
    }
  },

  // Update processPayment to explicitly set the status
  processPayment: async (paymentData) => {
    try {
        console.log('Processing payment with data:', paymentData); // Debug log

        // Prepare budget transaction data
        const budgetTransaction = {
            teacherId: paymentData.teacherId,
            teacherName: paymentData.teacherName,
            vacancyId: paymentData.vacancyId,
            vacancyTitle: paymentData.vacancyTitle,
            amount: paymentData.amount,
            amountLeft: paymentData.amountLeft || 0,
            dueDate: paymentData.dueDate,
            date: paymentData.date,
            status: paymentData.status || (paymentData.isPartial ? 'partial' : 'paid'),
            type: 'payment'
        };

        console.log('Saving budget transaction:', budgetTransaction); // Debug log
        
        // Save budget transaction
        const budgetResponse = await api.post('/api/budget/transactions', budgetTransaction);

        if (!budgetResponse.success) {
            console.error('Budget transaction failed:', budgetResponse); // Debug log
            throw new Error('Failed to save payment record');
        }

        // Prepare application status update
        const applicationUpdate = {
            status: 'accepted',
            paymentDetails: {
                paymentStatus: paymentData.status || (paymentData.isPartial ? 'partial' : 'paid'),
                amountPaid: paymentData.amount,
                amountLeft: paymentData.amountLeft || 0,
                dueDate: paymentData.dueDate
            }
        };

        console.log('Updating application status:', applicationUpdate); // Debug log

        // Update application status
        const statusResponse = await api.put(
            `/api/vacancies/${paymentData.vacancyId}/applications/${paymentData.applicationId}/status`,
            applicationUpdate
        );

        if (!statusResponse.success) {
            console.error('Status update failed:', statusResponse); // Debug log
            throw new Error('Failed to update application status');
        }

        return { 
            success: true, 
            data: { 
                budget: {
                    ...budgetResponse.data,
                    status: paymentData.status || (paymentData.isPartial ? 'partial' : 'paid')
                }, 
                status: statusResponse.data 
            } 
        };
    } catch (error) {
        console.error('Payment processing error:', error);
        throw error;
    }
  },

  // --- Scheduled Calls API --- 

  getScheduledCalls: async (includeCompleted = false) => {
    try {
      const response = await api.get(`/api/scheduled-calls?completed=${includeCompleted}`);
      return response.data; // Assuming backend sends { success: true, data: [...] }
    } catch (error) {
      console.error('API Error fetching scheduled calls:', error.response?.data || error.message);
      message.error(error.response?.data?.message || 'Failed to fetch scheduled calls');
      throw error; 
    }
  },

  createScheduledCall: async (callData) => {
    try {
      const response = await api.post('/api/scheduled-calls', callData);
      return response.data; // Assuming backend sends { success: true, data: {...} }
    } catch (error) {
      console.error('API Error creating scheduled call:', error.response?.data || error.message);
      message.error(error.response?.data?.message || 'Failed to schedule call');
      throw error;
    }
  },

  updateScheduledCall: async (id, updateData) => {
    try {
      const response = await api.put(`/api/scheduled-calls/${id}`, updateData);
      return response.data; // Assuming backend sends { success: true, data: {...} }
    } catch (error) {
      console.error('API Error updating scheduled call:', error.response?.data || error.message);
      message.error(error.response?.data?.message || 'Failed to update call');
      throw error;
    }
  },

  deleteScheduledCall: async (id) => {
    try {
      const response = await api.delete(`/api/scheduled-calls/${id}`);
      return response.data; // Assuming backend sends { success: true, data: {} }
    } catch (error) {
      console.error('API Error deleting scheduled call:', error.response?.data || error.message);
      message.error(error.response?.data?.message || 'Failed to delete call');
      throw error;
    }
  },

  // --- NEW: Mark applications as viewed --- 
  markApplicationsAsViewed: async (vacancyId) => {
    if (!vacancyId) {
      console.error("markApplicationsAsViewed: vacancyId is required");
      throw new Error("Vacancy ID is required");
    }
    console.log(`Calling API to mark applications as viewed for vacancy: ${vacancyId}`);
    return await api.patch(`/api/vacancies/${vacancyId}/applications/mark-viewed`);
  },

  // --- NEW: Manually add applicant to vacancy ---
  addApplicantManually: async (vacancyId, applicantData) => {
    try {
      if (!vacancyId) {
        throw new Error("Vacancy ID is required");
      }

      if (!applicantData.fullName || !applicantData.phone) {
        throw new Error("Applicant name and phone are required");
      }

      console.log(`Adding manual applicant to vacancy ${vacancyId}:`, applicantData);
      
      const response = await api.post(
        `/api/vacancies/${vacancyId}/admin-add-applicant`,
        applicantData
      );
      
      if (!response || response.success === false) {
        throw new Error(response?.message || 'Failed to add applicant');
      }
      
      return response;
    } catch (error) {
      console.error('Error adding applicant:', error);
      if (error.response) {
        throw new Error(error.response.data?.message || `Server returned ${error.response.status}`);
      }
      throw new Error(error.message || 'Failed to add applicant');
    }
  },
};

export default apiService;
