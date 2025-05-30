/**
 * Performance utility functions for React components
 */

// Debounce function for limiting how often a function can be called
export const debounce = (func, delay = 300) => {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
};

// Throttle function to limit function calls to once per specified time
export const throttle = (func, limit = 300) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Memoize expensive calculations
export const memoize = (fn) => {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

// Function to handle table data processing
export const processTableData = memoize((data, filters = {}, sorter = {}) => {
  // Apply filters
  let filteredData = data;
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      filteredData = filteredData.filter(item => {
        const itemValue = item[key];
        if (Array.isArray(value)) {
          // Handle array filter values (e.g., multiple select)
          return value.includes(itemValue);
        }
        // Handle string/regex filters
        return String(itemValue).toLowerCase().includes(String(value).toLowerCase());
      });
    }
  });
  
  // Apply sorting
  if (sorter.field) {
    filteredData = [...filteredData].sort((a, b) => {
      const aValue = a[sorter.field];
      const bValue = b[sorter.field];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sorter.order === 'ascend' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }
      
      // Numeric sorting
      return sorter.order === 'ascend' 
        ? aValue - bValue 
        : bValue - aValue;
    });
  }
  
  return filteredData;
});

// Batch state updates to reduce render cycles
export class BatchedUpdates {
  constructor(setState, delay = 50) {
    this.setState = setState;
    this.delay = delay;
    this.pendingUpdates = {};
    this.timeoutId = null;
  }
  
  update(key, value) {
    this.pendingUpdates[key] = value;
    
    if (!this.timeoutId) {
      this.timeoutId = setTimeout(() => {
        this.setState(prev => ({
          ...prev,
          ...this.pendingUpdates
        }));
        this.pendingUpdates = {};
        this.timeoutId = null;
      }, this.delay);
    }
  }
  
  cancel() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
      this.pendingUpdates = {};
    }
  }
}

// Usage examples:
// const debouncedSearch = debounce((value) => setSearchTerm(value), 500);
// const handleScroll = throttle(() => loadMoreData(), 200);
// const expensiveCalculation = memoize((data) => complexFunction(data)); 