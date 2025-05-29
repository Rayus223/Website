/**
 * Vacancy Sharing Functionality
 * 
 * This script provides functions for sharing vacancies and generating shareable links
 */

// Function to create a shareable vacancy URL
function createShareableVacancyUrl(vacancyId) {
    const baseUrl = window.location.origin;
    return `${baseUrl}/frontend1/Apply/vacancy.html?id=${vacancyId}`;
}

// Function to share a vacancy via the Web Share API
async function shareVacancy(vacancy) {
    const shareUrl = createShareableVacancyUrl(vacancy._id);
    const shareTitle = `${vacancy.title} - Teaching Opportunity at Dear Sir Home Tuition`;
    const shareText = `Check out this teaching opportunity: ${vacancy.title} (${vacancy.subject})`;
    
    try {
        if (navigator.share) {
            await navigator.share({
                title: shareTitle,
                text: shareText,
                url: shareUrl
            });
            console.log('Vacancy shared successfully');
            return true;
        } else {
            // Fallback for browsers that don't support Web Share API
            navigator.clipboard.writeText(shareUrl);
            // If Swal is available, use it for notification
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Link Copied!',
                    text: 'Share this link with others',
                    icon: 'success',
                    confirmButtonColor: '#1e4d92',
                    timer: 2000
                });
            } else {
                alert('Link copied to clipboard: ' + shareUrl);
            }
            return true;
        }
    } catch (error) {
        console.error('Error sharing vacancy:', error);
        return false;
    }
}

// Function to generate sharing buttons for a vacancy
function createSharingButtons(container, vacancy) {
    const shareButtons = document.createElement('div');
    shareButtons.className = 'sharing-buttons';
    
    // Main share button
    const mainShareBtn = document.createElement('button');
    mainShareBtn.className = 'share-btn';
    mainShareBtn.innerHTML = '<i class="fas fa-share-alt"></i> Share';
    mainShareBtn.addEventListener('click', () => shareVacancy(vacancy));
    
    // Create social sharing buttons if needed
    const facebookBtn = document.createElement('a');
    facebookBtn.className = 'social-share-btn facebook';
    facebookBtn.innerHTML = '<i class="fab fa-facebook-f"></i>';
    facebookBtn.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(createShareableVacancyUrl(vacancy._id))}`;
    facebookBtn.target = '_blank';
    facebookBtn.rel = 'noopener noreferrer';
    
    const twitterBtn = document.createElement('a');
    twitterBtn.className = 'social-share-btn twitter';
    twitterBtn.innerHTML = '<i class="fab fa-twitter"></i>';
    twitterBtn.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out this teaching opportunity: ${vacancy.title} at Dear Sir Home Tuition`)}&url=${encodeURIComponent(createShareableVacancyUrl(vacancy._id))}`;
    twitterBtn.target = '_blank';
    twitterBtn.rel = 'noopener noreferrer';
    
    const whatsappBtn = document.createElement('a');
    whatsappBtn.className = 'social-share-btn whatsapp';
    whatsappBtn.innerHTML = '<i class="fab fa-whatsapp"></i>';
    whatsappBtn.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out this teaching opportunity: ${vacancy.title} at Dear Sir Home Tuition ${createShareableVacancyUrl(vacancy._id)}`)}`;
    whatsappBtn.target = '_blank';
    whatsappBtn.rel = 'noopener noreferrer';
    
    // Append buttons to container
    shareButtons.appendChild(mainShareBtn);
    shareButtons.appendChild(facebookBtn);
    shareButtons.appendChild(twitterBtn);
    shareButtons.appendChild(whatsappBtn);
    
    // Append sharing buttons to provided container
    container.appendChild(shareButtons);
}

// Add sharing buttons to vacancy cards
function addSharingToVacancyCards() {
    const vacancyCards = document.querySelectorAll('.vacancy-card');
    
    vacancyCards.forEach(card => {
        // Get vacancy data from card dataset
        const vacancyData = card.dataset.vacancy;
        if (vacancyData) {
            try {
                const vacancy = JSON.parse(vacancyData);
                const actionsSection = card.querySelector('.vacancy-actions') || 
                                       card.querySelector('.card-footer');
                
                if (actionsSection && vacancy._id) {
                    // Create a share button
                    const shareBtn = document.createElement('button');
                    shareBtn.className = 'share-vacancy-btn';
                    shareBtn.innerHTML = '<i class="fas fa-share-alt"></i>';
                    shareBtn.title = 'Share this vacancy';
                    shareBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        shareVacancy(vacancy);
                    });
                    
                    actionsSection.appendChild(shareBtn);
                }
            } catch (error) {
                console.error('Error adding share button to vacancy card:', error);
            }
        }
    });
}

// Export functions for use in other scripts
export { 
    shareVacancy, 
    createShareableVacancyUrl, 
    createSharingButtons,
    addSharingToVacancyCards
};

// Initialize sharing functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on a page with vacancy cards and add sharing buttons
    const hasVacancyCards = document.querySelectorAll('.vacancy-card').length > 0;
    if (hasVacancyCards) {
        addSharingToVacancyCards();
    }
}); 