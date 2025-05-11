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

    // --- NEW: Lightbox Functionality (with Navigation) ---
    const screenshotImages = document.querySelectorAll('.game-detail-page .screenshot-grid img');
    let lightboxOverlay = null;
    let lightboxImage = null;
    let lightboxNavPrev = null;
    let lightboxNavNext = null;
    let lastFocusedElement = null;
    let currentImageIndex = 0;

    function createLightboxStructure() {
        if (document.getElementById('sg-lightbox-overlay')) return;

        lightboxOverlay = document.createElement('div');
        lightboxOverlay.id = 'sg-lightbox-overlay';
        lightboxOverlay.className = 'lightbox-overlay';
        lightboxOverlay.setAttribute('role', 'dialog');
        lightboxOverlay.setAttribute('aria-modal', 'true');
        lightboxOverlay.setAttribute('aria-hidden', 'true');

        const content = document.createElement('div');
        content.className = 'lightbox-content';

        lightboxImage = document.createElement('img');
        lightboxImage.id = 'sg-lightbox-image';
        lightboxImage.className = 'lightbox-image';
        lightboxImage.alt = ""; // Will be set dynamically

        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'lightbox-close';
        closeButton.innerHTML = '×';
        closeButton.setAttribute('aria-label', 'Close image viewer');
        closeButton.onclick = closeLightbox;

        // Navigation Arrows
        lightboxNavPrev = document.createElement('button');
        lightboxNavPrev.type = 'button';
        lightboxNavPrev.className = 'lightbox-nav prev';
        lightboxNavPrev.innerHTML = '❮'; // Left pointing angle bracket
        lightboxNavPrev.setAttribute('aria-label', 'Previous image');
        lightboxNavPrev.onclick = showPreviousImage;

        lightboxNavNext = document.createElement('button');
        lightboxNavNext.type = 'button';
        lightboxNavNext.className = 'lightbox-nav next';
        lightboxNavNext.innerHTML = '❯'; // Right pointing angle bracket
        lightboxNavNext.setAttribute('aria-label', 'Next image');
        lightboxNavNext.onclick = showNextImage;

        content.appendChild(lightboxImage);
        lightboxOverlay.appendChild(content);
        lightboxOverlay.appendChild(closeButton);
        lightboxOverlay.appendChild(lightboxNavPrev);
        lightboxOverlay.appendChild(lightboxNavNext);

        lightboxOverlay.addEventListener('click', (e) => {
            if (e.target === lightboxOverlay) {
                closeLightbox();
            }
        });

        document.body.appendChild(lightboxOverlay);
    }

    function updateLightboxImage(index) {
        if (index < 0 || index >= screenshotImages.length) return; // Should not happen with current logic

        const imageToShow = screenshotImages[index];
        const imageSrc = imageToShow.src; // Assuming thumbnail src is the full-res
        const imageAlt = imageToShow.alt || `Screenshot ${index + 1}`;

        lightboxImage.src = imageSrc;
        lightboxImage.alt = imageAlt;
        lightboxOverlay.setAttribute('aria-label', imageAlt); // Update dialog label

        currentImageIndex = index;
        updateNavigationState();
    }

    function updateNavigationState() {
        if (!lightboxNavPrev || !lightboxNavNext) return;

        if (screenshotImages.length <= 1) {
            lightboxNavPrev.classList.add('hidden');
            lightboxNavNext.classList.add('hidden');
        } else {
            lightboxNavPrev.classList.remove('hidden');
            lightboxNavNext.classList.remove('hidden');
            // Optional: Disable if not looping
            // lightboxNavPrev.disabled = currentImageIndex === 0;
            // lightboxNavNext.disabled = currentImageIndex === screenshotImages.length - 1;
        }
    }

    function showNextImage() {
        let nextIndex = currentImageIndex + 1;
        if (nextIndex >= screenshotImages.length) {
            nextIndex = 0; // Loop to the first image
        }
        updateLightboxImage(nextIndex);
    }

    function showPreviousImage() {
        let prevIndex = currentImageIndex - 1;
        if (prevIndex < 0) {
            prevIndex = screenshotImages.length - 1; // Loop to the last image
        }
        updateLightboxImage(prevIndex);
    }

    function openLightbox(event, index) {
        if (!lightboxOverlay) {
            createLightboxStructure();
        }
        
        lastFocusedElement = document.activeElement;
        updateLightboxImage(index); // This will set currentImageIndex and update nav

        lightboxOverlay.classList.add('show');
        lightboxOverlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', handleLightboxKeys);

        const closeBtn = lightboxOverlay.querySelector('.lightbox-close');
        if (closeBtn) closeBtn.focus();
    }

    function closeLightbox() {
        if (lightboxOverlay) {
            lightboxOverlay.classList.remove('show');
            lightboxOverlay.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            document.removeEventListener('keydown', handleLightboxKeys);

            if (lastFocusedElement) {
                lastFocusedElement.focus();
            }
        }
    }

    function handleLightboxKeys(event) {
        if (event.key === 'Escape') {
            closeLightbox();
        } else if (event.key === 'ArrowRight') {
            if (screenshotImages.length > 1) showNextImage();
        } else if (event.key === 'ArrowLeft') {
            if (screenshotImages.length > 1) showPreviousImage();
        }
    }

    // Attach event listeners to screenshot images
    if (screenshotImages.length > 0) {
        createLightboxStructure(); // Create lightbox structure on page load if images exist
        screenshotImages.forEach((img, index) => {
            img.addEventListener('click', (event) => openLightbox(event, index));
            img.setAttribute('role', 'button');
            img.setAttribute('tabindex', '0');
            img.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openLightbox(event, index);
                }
            });
        });
    }

    
}); // End DOMContentLoaded
