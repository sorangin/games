document.addEventListener('DOMContentLoaded', () => {

    // --- Game Card Image Hover Effect ---
    const gameCards = document.querySelectorAll('.game-card');

    gameCards.forEach(card => {
        const img = card.querySelector('.game-image'); // Target the specific class
        const staticSrc = img?.dataset.staticSrc; // Optional chaining for safety
        const gifSrc = img?.dataset.gifSrc;

        // Only add listeners if img and sources exist
        if (img && staticSrc && gifSrc) {
            // Preload GIF to prevent flickering on first hover
            const gifImage = new Image();
            gifImage.src = gifSrc;

            card.addEventListener('mouseenter', () => {
                img.src = gifSrc; // Change image source to the GIF
            });

            card.addEventListener('mouseleave', () => {
                img.src = staticSrc; // Change back to static image
            });
        } else {
            // Optional: Log if sources are missing for debugging
            // console.warn('Game card image or data sources missing for:', card);
        }
    });


    // --- Update Footer Year ---
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }


    // --- Back to Top Button Logic ---
    const backToTopButton = document.getElementById('back-to-top');

    if (backToTopButton) {
        const showButtonThreshold = 300; // Pixels scrolled down before button appears

        window.addEventListener('scroll', () => {
            if (window.scrollY > showButtonThreshold) {
                backToTopButton.classList.add('show');
            } else {
                backToTopButton.classList.remove('show');
            }
        });

        backToTopButton.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth' // Smooth scrolling animation
            });
        });
    }


    // --- Smooth Scrolling for Internal Links (like CTA button) ---
    const internalLinks = document.querySelectorAll('a[href^="#"]');

    internalLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault(); // Prevent default jump
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                // Calculate position, considering potential sticky header height
                const headerOffset = document.querySelector('.site-header')?.offsetHeight || 0; // Get header height or 0
                const elementPosition = targetElement.getBoundingClientRect().top + window.scrollY;
                const offsetPosition = elementPosition - headerOffset - 20; // Add a little extra space

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });


    // --- Optional: Add subtle animation to cards on scroll ---
    // Uses Intersection Observer API for better performance
    const cardObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = `cardFadeInUp 0.6s ${entry.target.dataset.delay || '0s'} ease-out forwards`;
                observer.unobserve(entry.target); // Observe only once
            }
        });
    }, { threshold: 0.1 }); // Trigger when 10% of the card is visible

    // Add staggering delay
    document.querySelectorAll('.game-card').forEach((card, index) => {
        card.style.opacity = '0'; // Start hidden
        card.style.transform = 'translateY(30px)';
        card.dataset.delay = `${index * 0.08}s`; // Stagger animation
        cardObserver.observe(card);
    });

    // Add keyframes for the animation in CSS or here
    const styleSheet = document.styleSheets[0]; // Get the first stylesheet
    styleSheet.insertRule(`
        @keyframes cardFadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `, styleSheet.cssRules.length);

}); // End DOMContentLoaded
