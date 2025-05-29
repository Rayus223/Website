//refine the code 

// Override settings for troubleshooting
window.OVERRIDE_LOCATION_CLASS = true; // Enable for manual location/class values

// Enable sample data for testing if API doesn't return location/class data
window.USE_SAMPLE_DATA = false; // Set to false in production

// Add this to your existing script.js file
document.addEventListener('DOMContentLoaded', function() {
  const navbar = document.querySelector('.navbar');
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');
  const body = document.body;

  // Mobile menu toggle
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('active');
    
    // Toggle body scroll
    if (navLinks.classList.contains('active')) {
      body.style.overflow = 'hidden'; // Prevent scrolling when menu is open
      
      // Force a repaint to trigger the CSS animation for menu items
      navLinks.querySelectorAll('li').forEach(item => {
        item.style.animation = 'none';
        void item.offsetWidth; // Trigger reflow
        item.style.animation = null;
      });
      
    } else {
      body.style.overflow = ''; // Re-enable scrolling when menu is closed
    }
    
    // Log to console for debugging
    console.log('Hamburger clicked, navLinks classes:', navLinks.className);
  });

  // Close menu when clicking links
  document.querySelectorAll('.nav-links a, .nav-links .nav-cta').forEach(n => 
    n.addEventListener('click', () => {
      hamburger.classList.remove('active');
      navLinks.classList.remove('active');
      body.style.overflow = ''; // Re-enable scrolling
    })
  );
  
  // Close menu when clicking outside
  document.addEventListener('click', function(event) {
    const isClickInsideNav = navLinks.contains(event.target);
    const isClickOnHamburger = hamburger.contains(event.target);
    
    if (!isClickInsideNav && !isClickOnHamburger && navLinks.classList.contains('active')) {
      navLinks.classList.remove('active');
      hamburger.classList.remove('active');
      body.style.overflow = ''; // Re-enable scrolling
    }
  });
});


// for loading of 3d model

document.addEventListener('DOMContentLoaded', function() {
  const iframe = document.querySelector('.sketchfab-embed-wrapper iframe');
  
  iframe.addEventListener('load', function() {
    iframe.classList.add('loaded');
  });
});






// for vacancy home tab section 3

let currentSlide = 0;
let totalSlides = 0;
let touchStartX = 0;
let touchEndX = 0;

function createVacancyCard(vacancy) {
  // Debug the vacancy object to see what fields are available
  console.log('Vacancy data:', vacancy);
  
  const card = document.createElement('div');
  card.className = 'vacancy-card';
  
  // Extract content from description - it may contain location and class info
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = vacancy.description || '';
  const descriptionText = tempDiv.textContent || tempDiv.innerText || '';
  
  console.log('Raw description:', vacancy.description);
  console.log('Extracted description text:', descriptionText);
  
  // First check if the API provides location and class directly
  let locationValue = vacancy.location || '';
  let classValue = vacancy.class || '';
  
  // If no direct fields, try to extract from description
  if (!locationValue) {
    console.log('No location field, trying to extract from description');
    // Look for location information in the description using multiple patterns
    const locationPatterns = [
      /location:\s*([^,.;]+)/i,
      /area:\s*([^,.;]+)/i,
      /place:\s*([^,.;]+)/i,
      /in\s+([^,.;]+\s+(?:area|region|city|district))/i,
      /at\s+([^,.;]+(?:Mumbai|Delhi|Bangalore|Kolkata|Chennai|Hyderabad|Pune|Ahmedabad|Jaipur))/i,
      /(Mumbai|Delhi|Bangalore|Kolkata|Chennai|Hyderabad|Pune|Ahmedabad|Jaipur)(?:[^a-zA-Z]|$)/i
    ];
    
    // Test each location pattern individually and log results
    console.log('Testing location patterns:');
    for (const pattern of locationPatterns) {
      const match = descriptionText.match(pattern);
      console.log(`Pattern ${pattern}: ${match ? 'MATCH: ' + match[0] : 'no match'}`);
      if (match && match[1]) {
        locationValue = match[1].trim();
        console.log(`Found location: "${locationValue}" using pattern: ${pattern}`);
        break;
      }
    }
  } else {
    console.log('Using location from API:', locationValue);
  }
  
  // If no direct class field, try to extract from description
  if (!classValue) {
    console.log('No class field, trying to extract from description');
    // Look for class information in the description using multiple patterns
    const classPatterns = [
      /class:\s*([^,.;]+)/i,
      /grade:\s*([^,.;]+)/i,
      /standard:\s*([^,.;]+)/i,
      /for\s+(?:class|grade|standard)?\s*([0-9]+(?:th|st|nd|rd)?(?:\s*-\s*[0-9]+(?:th|st|nd|rd)?)?)/i,
      /for\s+([0-9]+(?:th|st|nd|rd)?(?:\s*-\s*[0-9]+(?:th|st|nd|rd)?)?)\s+(?:class|grade|standard)/i
    ];
    
    // Test each class pattern individually and log results
    console.log('Testing class patterns:');
    for (const pattern of classPatterns) {
      const match = descriptionText.match(pattern);
      console.log(`Pattern ${pattern}: ${match ? 'MATCH: ' + match[0] : 'no match'}`);
      if (match && match[1]) {
        classValue = match[1].trim();
        console.log(`Found class: "${classValue}" using pattern: ${pattern}`);
        break;
      }
    }
  } else {
    console.log('Using class from API:', classValue);
  }
  
  // Use manual override if enabled and values still not found
  if (window.OVERRIDE_LOCATION_CLASS && (!locationValue || !classValue)) {
    console.log('Using manual override for location and/or class');
    if (vacancy.title.includes('Math')) {
      if (!locationValue) locationValue = 'Mumbai, Maharashtra';
      if (!classValue) classValue = '10th Standard';
    } else if (vacancy.title.includes('Science')) {
      if (!locationValue) locationValue = 'Delhi NCR';
      if (!classValue) classValue = '8th-9th Grade';
    } else if (vacancy.title.includes('English')) {
      if (!locationValue) locationValue = 'Bangalore, Karnataka';
      if (!classValue) classValue = '6th-7th Standard';
    }
  }
  
  // Final fallback
  if (!locationValue) locationValue = 'Location not specified';
  if (!classValue) classValue = 'Not specified';
  
  card.innerHTML = `
    <div class="vacancy-header">
      <h3 class="vacancy-title">${vacancy.title || 'No Title'}</h3>
      <span class="subject-tag">${vacancy.subject || 'Subject N/A'}</span>
    </div>
    <div class="vacancy-details">
      <div class="detail-item">
        <i class="fas fa-map-marker-alt"></i>
        <span>${locationValue}</span>
      </div>
      <div class="detail-item">
        <i class="fas fa-graduation-cap"></i>
        <span>Class: ${classValue}</span>
      </div>
      <div class="detail-item">
        <i class="fas fa-money-bill-wave"></i> 
        <span>Salary: ${vacancy.salary || 'Not specified'}</span>
      </div>
    </div>
    <button class="apply-button" onclick="window.location.href='Apply/teacher.html'">
      <i class="fas fa-paper-plane"></i> Apply Now
    </button>
  `;
  
  return card;
}

function slideVacancies(direction) {
  const slider = document.querySelector('.vacancies-slider');
  const cards = document.querySelectorAll('.vacancy-card');
  
  if (!slider || !cards.length) return;

  // Updated card width to match the new size
  const cardWidth = 320; // Larger card width (280px + 40px margin)
  const viewportWidth = slider.parentElement.offsetWidth;
  const isMobile = window.innerWidth <= 768;
  
  // Set cards per view based on screen size
  const cardsPerView = isMobile ? 1 : 
                      window.innerWidth >= 1200 ? 3 : 
                      Math.floor(viewportWidth / cardWidth);
                      
  totalSlides = Math.max(1, Math.ceil(cards.length / cardsPerView));

  if (direction === 'right' && currentSlide < totalSlides - 1) {
    currentSlide++;
  } else if (direction === 'left' && currentSlide > 0) {
    currentSlide--;
  }

  // Calculate sliding distance
  const slideAmount = isMobile ? 
    currentSlide * -100 : // Percentage-based for mobile
    currentSlide * -(cardsPerView * cardWidth); // Pixel-based for desktop
  
  // Apply the translation
  slider.style.transform = isMobile ? 
    `translateX(${slideAmount}%)` : 
    `translateX(${slideAmount}px)`;
    
  updateNavButtons();
}

function updateNavButtons() {
  const prevButton = document.querySelector('.slider-nav.prev');
  const nextButton = document.querySelector('.slider-nav.next');

  if (prevButton && nextButton) {
    prevButton.classList.toggle('hidden', currentSlide === 0);
    nextButton.classList.toggle('hidden', currentSlide === totalSlides - 1);
  }
}



async function loadVacancies() {
  try {
    // Use a configurable API base URL with fallback to localhost
    const apiBaseUrl = window.API_BASE_URL || 'http://localhost:5000';
    console.log('Using API base URL:', apiBaseUrl);
    
    // Add cache-busting query parameter
    const cacheBuster = `?_=${Date.now()}`;
    
    let vacancies = [];
    
    // Use test data if flag is set, otherwise fetch from API
    if (window.USE_SAMPLE_DATA) {
      console.log('Using sample vacancy data for testing');
      vacancies = getTestVacancies();
    } else {
      try {
        console.log('Fetching vacancies from API...');
        const response = await fetch(`${apiBaseUrl}/api/vacancies/featured${cacheBuster}`);
        
        console.log('API Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`Network response was not ok (${response.status}): ${response.statusText}`);
        }
        
        const responseText = await response.text();
        console.log('Raw API response text:', responseText);
        
        // Try to parse the response as JSON
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (jsonError) {
          console.error('Error parsing JSON response:', jsonError);
          throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
        }
        
        console.log('API Response Data:', data);
        
        if (!data.success) {
          throw new Error(data.message || 'Failed to load vacancies');
        }
        
        // Ensure data.data is an array
        if (!Array.isArray(data.data)) {
          console.error('API did not return an array of vacancies:', data.data);
          throw new Error('API response format error: Expected an array of vacancies');
        }
        
        vacancies = data.data;
      } catch (apiError) {
        console.error('API error, falling back to test data:', apiError);
        // Fall back to test data if the API call fails
        vacancies = getTestVacancies();
      }
      
      console.log('Vacancies data sample:', vacancies.length > 0 ? vacancies[0] : 'No vacancies');
      console.log('Keys available in first vacancy:', vacancies.length > 0 ? Object.keys(vacancies[0]) : 'No vacancies');
    }

    const vacanciesList = document.querySelector('.vacancies-slider');
    
    if (!vacanciesList) {
      console.error('Vacancies slider element not found');
      return;
    }

    if (vacancies.length === 0) {
      vacanciesList.innerHTML = '<p class="no-vacancies">No featured vacancies available at the moment.</p>';
      return;
    }

    // Clear existing content
    vacanciesList.innerHTML = '';

    // Create and append vacancy cards
    vacancies.forEach(vacancy => {
      const card = createVacancyCard(vacancy);
      vacanciesList.appendChild(card);
    });

    // Initialize slider
    const isMobile = window.innerWidth <= 768;
    const cardsPerView = isMobile ? 1 : 3;
    totalSlides = Math.ceil(vacancies.length / cardsPerView);
    currentSlide = 0;
    updateNavButtons();

  } catch (error) {
    console.error('Error loading vacancies:', error);
    const vacanciesList = document.querySelector('.vacancies-slider');
    if (vacanciesList) {
      vacanciesList.innerHTML = 
        `<p class="error-message">Error loading vacancies: ${error.message}</p>`;
    }
  }
}

// Initialize touch events for mobile swipe
function initTouchEvents() {
  const slider = document.querySelector('.vacancies-slider');
  if (!slider) return;
  
  slider.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  });
  
  slider.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].clientX;
    handleSwipe();
  });
}

function handleSwipe() {
  const swipeThreshold = 50;
  const swipeDistance = touchEndX - touchStartX;
  
  if (Math.abs(swipeDistance) > swipeThreshold) {
    if (swipeDistance > 0) {
      slideVacancies('left');
    } else {
      slideVacancies('right');
    }
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadVacancies();
  initTouchEvents();
  addViewMoreLink();
  
  // Add CSS for consistent vacancy card sizing
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .vacancies-container {
      position: relative;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px 0;
      overflow: hidden;
    }

    .vacancies-slider {
      display: flex;
      transition: transform 0.5s ease;
      gap: 0;
      padding: 10px 0;
    }

    .slider-nav {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #1e4d92;
      color: white;
      border: none;
      cursor: pointer;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      transition: background 0.3s ease;
    }

    .slider-nav:hover {
      background: #16396d;
    }

    .slider-nav.prev {
      left: 10px;
    }

    .slider-nav.next {
      right: 10px;
    }

    .slider-nav.hidden {
      opacity: 0;
      pointer-events: none;
    }

    .vacancy-card {
      display: flex;
      flex-direction: column;
      height: 320px;
      min-width: 280px;
      max-width: 380px;
      margin: 0 20px;
      padding: 24px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      flex: 0 0 auto;
    }
    
    .vacancy-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    }
    
    .vacancy-header {
      margin-bottom: 18px;
    }
    
    .vacancy-title {
      font-size: 20px;
      margin-bottom: 8px;
      color: #1e4d92;
    }
    
    .subject-tag {
      display: inline-block;
      background: #f0f7ff;
      color: #1e4d92;
      padding: 4px 12px;
      border-radius: 15px;
      font-size: 14px;
      font-weight: 500;
    }
    
    .vacancy-details {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    
    .detail-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 16px;
    }
    
    .detail-item i {
      color: #1e4d92;
      width: 18px;
      font-size: 18px;
    }
    
    .apply-button {
      margin-top: 20px;
      background: #1e4d92;
      color: white;
      border: none;
      padding: 12px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: background 0.3s ease;
    }
    
    .apply-button:hover {
      background: #16396d;
    }

    @media (max-width: 768px) {
      .vacancy-card {
        width: 90%;
        min-width: 0;
        margin: 0 5%;
        height: 280px;
        padding: 20px;
      }
      
      .vacancy-title {
        font-size: 18px;
      }
      
      .detail-item {
        font-size: 14px;
      }
      
      .slider-nav {
        width: 35px;
        height: 35px;
      }
    }
    
    @media (min-width: 1200px) {
      .vacancy-card {
        min-width: 320px;
        height: 340px;
      }
      
      .vacancy-title {
        font-size: 22px;
      }
      
      .apply-button {
        padding: 14px;
      }
    }
  `;
  document.head.appendChild(styleElement);
});

// Reset on window resize
window.addEventListener('resize', () => {
  currentSlide = 0;
  const slider = document.querySelector('.vacancies-slider');
  if (slider) {
    slider.style.transform = 'translateX(0)';
    updateNavButtons();
  }
});

// Handle vacancy application
async function handleVacancyApply(button) {
  const vacancyId = button.dataset.vacancyId;
  const token = localStorage.getItem('token');
  
  if (!token) {
    window.location.href = 'Apply/teacher.html';
    return;
  }

  try {
    const response = await fetch(`http://localhost:5000/api/teacher-apply/apply-vacancy/${vacancyId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.success) {
      alert('Application submitted successfully!');
      button.disabled = true;
      button.textContent = 'Applied';
    } else {
      alert(data.message || 'Failed to submit application');
    }

  } catch (error) {
    console.error('Error applying:', error);
    alert('Error submitting application. Please try again.');
  }
}

// Services Section Animation
const servicesObserverCallback = (entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      // Add visible class to heading
      const heading = entry.target.querySelector('h2');
      if (heading) heading.classList.add('fade-up-visible');
      
      // Add visible class to service card with delay
      const serviceCard = entry.target.querySelector('.service-card');
      if (serviceCard) {
        setTimeout(() => {
          serviceCard.classList.add('fade-up-visible');
        }, 200); // 200ms delay after heading
      }
    }
  });
};

// Create services observer
const servicesObserver = new IntersectionObserver(servicesObserverCallback, {
  threshold: 0.2,
  rootMargin: '0px'
});

// Observe services section
document.addEventListener('DOMContentLoaded', function() {
  const servicesSection = document.querySelector('.main-services');
  if (servicesSection) servicesObserver.observe(servicesSection);
});




// Modify the section 4 observer
document.addEventListener('DOMContentLoaded', function() {
  const section4Observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Remove existing visible classes first
        entry.target.classList.remove('visible');
        const items = entry.target.querySelectorAll('.qualification-item');
        items.forEach(item => item.classList.remove('visible'));
        
        // Force a reflow
        void entry.target.offsetWidth;
        
        // Add visible classes again to restart animations
        entry.target.classList.add('visible');
        items.forEach(item => item.classList.add('visible'));
      } else {
        // Remove visible classes when section is out of view
        entry.target.classList.remove('visible');
        const items = entry.target.querySelectorAll('.qualification-item');
        items.forEach(item => item.classList.remove('visible'));
      }
    });
  }, {
    threshold: 0.2,
    rootMargin: '0px'
  });

  // Observe section 4
  const section4 = document.querySelector('.what-we-have');
  if (section4) section4Observer.observe(section4);
});

// Add Trust Section Animation Observer
document.addEventListener('DOMContentLoaded', function() {
  const trustObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Remove existing visible classes first
        entry.target.classList.remove('visible');
        const testimonials = entry.target.querySelectorAll('.testimonial-card');
        testimonials.forEach(card => card.classList.remove('visible'));
        
        // Force a reflow
        void entry.target.offsetWidth;
        
        // Add visible classes again to restart animations
        entry.target.classList.add('visible');
        testimonials.forEach(card => card.classList.add('visible'));
      } else {
        // Remove visible classes when section is out of view
        entry.target.classList.remove('visible');
        const testimonials = entry.target.querySelectorAll('.testimonial-card');
        testimonials.forEach(card => card.classList.remove('visible'));
      }
    });
  }, {
    threshold: 0.2,
    rootMargin: '0px'
  });

  // Observe trust section
  const trustSection = document.querySelector('.our-trust');
  if (trustSection) trustObserver.observe(trustSection);
});

// Add function to force spacing between hero elements
document.addEventListener('DOMContentLoaded', function() {
  // Force spacing between elements
  const dearText = document.querySelector('.dear-text');
  const heroSubtitle = document.querySelector('.hero-subtitle');
  const trustedText = document.querySelector('.trusted-text');
  const heroButtons = document.querySelector('.hero-buttons');
  
  if (dearText) {
    dearText.style.marginBottom = '3rem';
  }
  
  if (heroSubtitle) {
    heroSubtitle.style.marginBottom = '4rem';
  }
  
  if (trustedText) {
    trustedText.style.marginBottom = '5rem';
  }
  
  if (heroButtons) {
    heroButtons.style.marginTop = '2rem';
  }
});

// Add function to create the View More link
function addViewMoreLink() {
  // Find the container with class that contains 'vacancies'
  const containers = document.querySelectorAll('section');
  let vacanciesSection = null;
  
  // Look for section containing vacancies
  for (const section of containers) {
    if (section.querySelector('.vacancies-slider') || 
        section.textContent.toLowerCase().includes('vacanc') || 
        section.className.toLowerCase().includes('vacanc')) {
      vacanciesSection = section;
      break;
    }
  }
  
  if (!vacanciesSection) {
    console.error('Could not find vacancies section');
    return;
  }
  
  // Find the slider container
  const sliderContainer = vacanciesSection.querySelector('.vacancies-slider')?.parentElement;
  if (!sliderContainer) {
    console.error('Could not find slider container');
    return;
  }
  
  // Create view more container
  const viewMoreContainer = document.createElement('div');
  viewMoreContainer.className = 'view-more-container';
  
  // Create the View More link
  const viewMoreLink = document.createElement('a');
  viewMoreLink.href = 'all-vacancies.html';
  viewMoreLink.className = 'view-more-link';
  viewMoreLink.innerHTML = 'View All Vacancies <i class="fas fa-chevron-down"></i>';
  
  // Add the link to the container
  viewMoreContainer.appendChild(viewMoreLink);
  
  // Insert the container after the slider container
  sliderContainer.parentNode.insertBefore(viewMoreContainer, sliderContainer.nextSibling);
  
  // Add CSS for the view more link container
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .view-more-container {
      display: flex;
      justify-content: center;
      margin-top: 30px;
      margin-bottom: 40px;
    }
    
    .view-more-link {
      color: #1e4d92;
      text-decoration: none;
      font-weight: 500;
      font-size: 18px;
      padding: 10px 20px;
      border: 2px solid #1e4d92;
      border-radius: 30px;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.3s ease;
    }
    
    .view-more-link:hover {
      background-color: #1e4d92;
      color: white;
    }
    
    .view-more-link i {
      font-size: 14px;
      transition: transform 0.3s ease;
    }
    
    .view-more-link:hover i {
      transform: translateY(3px);
    }
  `;
  document.head.appendChild(styleElement);
}
