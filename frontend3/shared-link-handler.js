/**
 * Shared Link Handler
 * This script detects if a user is accessing the site through a shared vacancy link
 * and redirects them to the proper shared vacancy view.
 */

// Execute when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    handleSharedVacancyLinks();
});

/**
 * Checks if the current URL contains a vacancy ID parameter and redirects to the
 * shared vacancy view if it does.
 */
function handleSharedVacancyLinks() {
    // Get the current URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check for vacancy parameter (support both 'vacancy' and 'id' parameters)
    const vacancyId = urlParams.get('vacancy') || urlParams.get('id');
    
    // If vacancy ID is present and we're not already on the vacancy page
    if (vacancyId && !window.location.pathname.includes('vacancy.html')) {
        // Construct the vacancy URL using the existing vacancy.html page
        const vacancyUrl = `/frontend1/Apply/vacancy.html?id=${vacancyId}`;
        
        // Redirect to the vacancy page
        console.log('Redirecting to vacancy view for ID:', vacancyId);
        window.location.href = vacancyUrl;
    }
}

/**
 * Function that can be called from other scripts to redirect to a vacancy
 * @param {string} vacancyId - The ID of the vacancy to view
 */
function redirectToSharedVacancy(vacancyId) {
    if (vacancyId) {
        window.location.href = `/frontend1/Apply/vacancy.html?id=${vacancyId}`;
    } else {
        console.error('No vacancy ID provided for redirection');
    }
}

// Export the redirect function for use in other scripts
export { redirectToSharedVacancy };

// Add the handler script to the global window object for access in non-module scripts
window.redirectToSharedVacancy = redirectToSharedVacancy; 