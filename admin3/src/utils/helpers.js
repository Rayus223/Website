/**
 * Utility functions for the admin dashboard
 */

/**
 * Ensures that all required teacher data is present for budget transactions.
 * Will attempt to extract and validate essential fields from the provided data.
 * 
 * @param {Object} data - The data object containing teacher and vacancy information
 * @param {Array} vacancies - The list of vacancies to search in if data is incomplete
 * @returns {Object} - A complete object with all required teacher data
 * @throws {Error} - If essential data cannot be found or is invalid
 */
const ensureTeacherData = (data, vacancies = []) => {
    // Log the input data
    console.log('Validating teacher data:', data);
    
    // Check if we have the basic required field
    if (!data || !data.applicationId) {
        throw new Error('Missing application ID');
    }
    
    // Initialize result with the input data
    let result = { ...data };
    
    // If we're missing essential fields, try to find them
    if (!result.teacherId || !result.teacherName || !result.vacancyId) {
        console.log('Missing essential teacher or vacancy data, attempting to find it');
        
        // Find the application in vacancies to get teacher and vacancy data
        let foundData = null;
        
        for (const vacancy of vacancies) {
            if (!vacancy.applications) continue;
            
            const application = vacancy.applications.find(app => app._id === data.applicationId);
            if (application && application.teacher) {
                foundData = {
                    applicationId: data.applicationId,
                    teacherId: application.teacher._id,
                    teacherName: application.teacher.fullName,
                    vacancyId: vacancy._id,
                    vacancyTitle: vacancy.title
                };
                break;
            }
        }
        
        if (!foundData) {
            throw new Error('Could not find application details');
        }
        
        // Update our result with the found data
        result = { ...result, ...foundData };
    }
    
    // If we're missing the vacancy title but have the ID, try to find it
    if (!result.vacancyTitle && result.vacancyId) {
        const vacancy = vacancies.find(v => v._id === result.vacancyId);
        if (vacancy) {
            result.vacancyTitle = vacancy.title;
        } else {
            result.vacancyTitle = 'Unknown Vacancy';
            console.warn(`Could not find vacancy title for ID: ${result.vacancyId}`);
        }
    }
    
    // Ensure we have a teacher name (fallback to ID-based name if needed)
    if (!result.teacherName && result.teacherId) {
        result.teacherName = `Teacher-${result.teacherId.substring(0, 6)}`;
    }
    
    // Validate MongoDB ObjectId format for IDs
    if (result.teacherId && !isValidMongoId(result.teacherId)) {
        throw new Error(`Invalid teacher ID format: ${result.teacherId}`);
    }
    
    if (result.vacancyId && !isValidMongoId(result.vacancyId)) {
        throw new Error(`Invalid vacancy ID format: ${result.vacancyId}`);
    }
    
    if (result.applicationId && !isValidMongoId(result.applicationId)) {
        throw new Error(`Invalid application ID format: ${result.applicationId}`);
    }
    
    console.log('Validated teacher data:', result);
    return result;
};

/**
 * Validates if a string is a valid MongoDB ObjectId
 * @param {String} id - The ID to validate
 * @returns {Boolean} - Whether the ID is valid
 */
const isValidMongoId = (id) => {
    return id && /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Formats a date string to a readable format
 * @param {String|Date} dateString - The date to format
 * @returns {String} - Formatted date string
 */
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Export all utility functions
export {
    ensureTeacherData,
    isValidMongoId,
    formatDate
};
