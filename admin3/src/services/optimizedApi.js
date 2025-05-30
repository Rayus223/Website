import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://api.dearsirhometuition.com';

// Create axios instance with defaults
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Add request interceptor for auth
api.interceptors.request.use(config => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response cache
const cache = new Map();
const CACHE_TIME = 60000; // 1 minute

// Optimized API service
const optimizedApiService = {
  // Get teachers with pagination
  getTeachers: async ({ page = 1, limit = 10, filters = {} }) => {
    const cacheKey = `teachers-${page}-${limit}-${JSON.stringify(filters)}`;
    
    // Check cache
    const cachedData = cache.get(cacheKey);
    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TIME)) {
      return cachedData.data;
    }
    
    try {
      const response = await api.get('/api/teachers', {
        params: { page, limit, ...filters }
      });
      
      // Store in cache
      cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching teachers:', error);
      throw error;
    }
  },
  
  // Get vacancies with pagination
  getVacancies: async ({ page = 1, limit = 10, status = 'open', filters = {} }) => {
    const cacheKey = `vacancies-${page}-${limit}-${status}-${JSON.stringify(filters)}`;
    
    // Check cache
    const cachedData = cache.get(cacheKey);
    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TIME)) {
      return cachedData.data;
    }
    
    try {
      const response = await api.get('/api/vacancies', {
        params: { page, limit, status, ...filters }
      });
      
      // Store in cache
      cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching vacancies:', error);
      throw error;
    }
  },
  
  // Get budget transactions with pagination
  getBudgetTransactions: async ({ page = 1, limit = 20, type = 'all' }) => {
    const cacheKey = `budget-${page}-${limit}-${type}`;
    
    // Check cache
    const cachedData = cache.get(cacheKey);
    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TIME)) {
      return cachedData.data;
    }
    
    try {
      const response = await api.get('/api/budget', {
        params: { page, limit, type }
      });
      
      // Store in cache
      cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching budget data:', error);
      // Try to return cached data even if expired
      const oldCachedData = cache.get(cacheKey);
      if (oldCachedData) {
        return oldCachedData.data;
      }
      throw error;
    }
  },
  
  // Clear specific cache entry
  clearCache: (key) => {
    if (key) {
      cache.delete(key);
    } else {
      cache.clear(); // Clear all cache
    }
  },
  
  // Create vacancy
  createVacancy: async (vacancyData) => {
    try {
      const response = await api.post('/api/vacancies', vacancyData);
      // Clear vacancies cache
      Array.from(cache.keys())
        .filter(key => key.startsWith('vacancies-'))
        .forEach(key => cache.delete(key));
      
      return response.data;
    } catch (error) {
      console.error('Error creating vacancy:', error);
      throw error;
    }
  },
  
  // Other methods from your original API service
  // with similar caching and optimization
};

export default optimizedApiService; 