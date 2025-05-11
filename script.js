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
                // Double check image exists before changing source
                if (img) img.src = gifSrc;
            });

            card.addEventListener('mouseleave', () => {
                 // Double check image exists before changing source
                if (img) img.src = staticSrc;
            });
        } else {
            // Optional: Log if sources are missing for debugging
             if (!img) console.warn('Game card image element missing for:', card);
             if (!staticSrc || !gifSrc) console.warn('Game card data-static-src or data-gif-src missing for:', card.querySelector('h3')?.textContent || 'Unknown Card');
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
        }, { passive: true }); // Improve scroll performance

        backToTopButton.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth' // Smooth scrolling animation
            });
        });
    }


    // --- Smooth Scrolling for Internal Links ---
    // (Note: Since the hero section is removed, this might not be strictly needed
    // unless you add other internal links later, but it doesn't hurt to keep)
    const internalLinks = document.querySelectorAll('a[href^="#"]');

    internalLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            // Check if it's more than just "#"
            if (targetId && targetId.length > 1) {
                const targetElement = document.querySelector(targetId);

                if (targetElement) {
                    e.preventDefault(); // Prevent default jump only if target exists
                    // Calculate position, considering potential sticky header height
                    const header = document.querySelector('.site-header');
                    const headerOffset = header ? header.offsetHeight : 0; // Get header height or 0
                    const elementPosition = targetElement.getBoundingClientRect().top + window.scrollY;
                    const offsetPosition = elementPosition - headerOffset - 20; // Add a little extra space

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });


    // --- Add subtle animation to cards on scroll ---
    // Uses Intersection Observer API for better performance
    if ('IntersectionObserver' in window) { // Check if browser supports IntersectionObserver
        const cardObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Apply the animation defined in CSS
                    entry.target.style.animation = `cardFadeInUp 0.6s ${entry.target.dataset.delay || '0s'} ease-out forwards`;
                    observer.unobserve(entry.target); // Stop observing once animated
                }
            });
        }, { threshold: 0.1 }); // Trigger when 10% of the card is visible

        // Observe each game card and set stagger delay
        document.querySelectorAll('.game-card').forEach((card, index) => {
            // We no longer set initial styles here (opacity/transform) - CSS handles it.
            card.dataset.delay = `${index * 0.08}s`; // Stagger animation delay
            cardObserver.observe(card);
        });

    } else {
        // Fallback for older browsers that don't support IntersectionObserver:
        // Just make all cards visible immediately without animation.
        console.warn("IntersectionObserver not supported. Animations disabled.");
        document.querySelectorAll('.game-card').forEach(card => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        });
    }

    // --- KEYFRAMES INJECTION BLOCK IS REMOVED ---
    // The @keyframes cardFadeInUp rule should now be in your style.css file

// --- Lightbox Functionality ---
    const screenshotImages = document.querySelectorAll('.game-detail-page .screenshot-grid img');
    let lightboxOverlay = null; // To store the created lightbox DOM element
    let lightboxImage = null;   // To store the image element within the lightbox
    let lastFocusedElement = null; // For accessibility: to return focus

    function createLightboxStructure() {
        if (document.getElementById('sg-lightbox-overlay')) return; // Already created

        // Overlay
        lightboxOverlay = document.createElement('div');
        lightboxOverlay.id = 'sg-lightbox-overlay'; // Use a unique ID
        lightboxOverlay.className = 'lightbox-overlay';
        lightboxOverlay.setAttribute('role', 'dialog');
        lightboxOverlay.setAttribute('aria-modal', 'true');
        lightboxOverlay.setAttribute('aria-hidden', 'true');


        // Content container (for image and potential future elements like captions)
        const content = document.createElement('div');
        content.className = 'lightbox-content';

        // Image element
        lightboxImage = document.createElement('img');
        lightboxImage.id = 'sg-lightbox-image';
        lightboxImage.className = 'lightbox-image';
        // ARIA: an empty alt initially, will be set dynamically.
        // Or, if the image is purely decorative when enlarged, an aria-label on the dialog.
        // For now, alt will be copied from thumbnail.
        lightboxImage.alt = "";


        // Close button
        const closeButton = document.createElement('button');
        closeButton.type = 'button'; // Important for accessibility and preventing form submissions
        closeButton.className = 'lightbox-close';
        closeButton.innerHTML = '×'; // Multiplication sign for "X"
        closeButton.setAttribute('aria-label', 'Close image viewer');
        closeButton.onclick = closeLightbox;

        // Assemble
        content.appendChild(lightboxImage);
        lightboxOverlay.appendChild(content);
        lightboxOverlay.appendChild(closeButton); // Close button as direct child of overlay for easier positioning

        // Click on overlay (outside image content) to close
        lightboxOverlay.addEventListener('click', (e) => {
            if (e.target === lightboxOverlay) { // Only if clicking the overlay itself
                closeLightbox();
            }
        });

        document.body.appendChild(lightboxOverlay);
    }

    function openLightbox(event) {
        lastFocusedElement = document.activeElement; // Save current focus

        const clickedImage = event.currentTarget;
        const imageSrc = clickedImage.src; // Assumes thumbnail src is the full-res one
                                          // Use clickedImage.dataset.fullsrc if you have separate high-res
        const imageAlt = clickedImage.alt || 'Enlarged screenshot';

        if (!lightboxOverlay) { // Create structure if it doesn't exist
            createLightboxStructure();
        }

        lightboxImage.src = imageSrc;
        lightboxImage.alt = imageAlt;
        if (imageAlt) { // If alt text exists, use it to label the dialog
            lightboxOverlay.setAttribute('aria-label', imageAlt);
        } else {
            lightboxOverlay.setAttribute('aria-label', 'Image viewer');
        }


        lightboxOverlay.classList.add('show');
        lightboxOverlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        document.addEventListener('keydown', handleEscKey);

        // Focus management: move focus into the lightbox (e.g., to the close button)
        const closeBtn = lightboxOverlay.querySelector('.lightbox-close');
        if(closeBtn) closeBtn.focus();
    }

    function closeLightbox() {
        if (lightboxOverlay) {
            lightboxOverlay.classList.remove('show');
            lightboxOverlay.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = ''; // Restore scrolling
            document.removeEventListener('keydown', handleEscKey);

            // Return focus to the element that opened the lightbox
            if (lastFocusedElement) {
                lastFocusedElement.focus();
            }
        }
    }

    function handleEscKey(event) {
        if (event.key === 'Escape') {
            closeLightbox();
        }
    }

    // Attach event listeners to screenshot images
    if (screenshotImages.length > 0) {
        createLightboxStructure(); // Create structure once on page load if images exist
        screenshotImages.forEach(img => {
            img.addEventListener('click', openLightbox);
            img.setAttribute('role', 'button'); // Indicate it's clickable
            img.setAttribute('tabindex', '0'); // Make it focusable
            // Add keydown for Enter/Space to trigger click for keyboard users
            img.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault(); // Prevent space from scrolling
                    openLightbox(event);
                }
            });
        });
    }

    
}); // End DOMContentLoaded
