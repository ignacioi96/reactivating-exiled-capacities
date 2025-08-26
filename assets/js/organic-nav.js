/**
 * Organic Mycelium Navigation Controller
 * Enhances the mycelium-style navigation with organic behaviors
 */

class OrganicNavController {
    constructor() {
        this.navToggle = document.querySelector('.nav-toggle');
        this.navDropdown = document.querySelector('.nav-dropdown');
        this.navLines = document.querySelectorAll('.nav-line');
        
        this.isOpen = false;
        this.isHovering = false;
        this.animationFrameId = null;
        this.tendrilPhases = [];
        this.growthAnimations = [];
        
        // Initialize random phases for organic movement
        this.initializeTendrilPhases();
        this.bindEvents();
        this.startOrganicAnimation();
        
        console.log('Organic navigation controller initialized');
    }
    
    initializeTendrilPhases() {
        // Give each tendril a unique phase offset for natural variation
        this.tendrilPhases = Array.from({length: 6}, () => ({
            phase: Math.random() * Math.PI * 2,
            frequency: 0.5 + Math.random() * 0.8, // Random frequency between 0.5-1.3
            amplitude: 2 + Math.random() * 3,     // Random amplitude between 2-5 degrees
            speed: 0.01 + Math.random() * 0.02    // Random speed
        }));
    }
    
    bindEvents() {
        if (!this.navToggle) return;
        
        // Enhanced click handling
        this.navToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleToggleClick();
        });
        
        // Keyboard navigation
        this.navToggle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.handleToggleClick();
            }
            if (e.key === 'Escape' && this.isOpen) {
                this.closeDropdown();
            }
        });
        
        // Enhanced hover effects
        this.navToggle.addEventListener('mouseenter', () => {
            this.handleHoverStart();
        });
        
        this.navToggle.addEventListener('mouseleave', () => {
            this.handleHoverEnd();
        });
        
        // Touch handling for mobile
        this.navToggle.addEventListener('touchstart', (e) => {
            this.handleTouchStart(e);
        }, { passive: true });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.navToggle.contains(e.target) && !this.navDropdown.contains(e.target)) {
                this.closeDropdown();
            }
        });
        
        // Focus management
        this.bindFocusEvents();
        
        // Window events
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }
    
    bindFocusEvents() {
        if (!this.navDropdown) return;
        
        const menuItems = this.navDropdown.querySelectorAll('a[role="menuitem"]');
        
        // Focus trap when dropdown is open
        menuItems.forEach((item, index) => {
            item.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const nextIndex = (index + 1) % menuItems.length;
                    menuItems[nextIndex].focus();
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    const prevIndex = (index - 1 + menuItems.length) % menuItems.length;
                    menuItems[prevIndex].focus();
                }
                if (e.key === 'Escape') {
                    this.closeDropdown();
                    this.navToggle.focus();
                }
            });
        });
    }
    
    handleToggleClick() {
        if (this.isOpen) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
        
        // Trigger growth burst animation
        this.triggerGrowthBurst();
    }
    
    openDropdown() {
        if (!this.navDropdown) return;
        
        this.isOpen = true;
        this.navToggle.classList.add('active');
        this.navToggle.setAttribute('aria-expanded', 'true');
        this.navDropdown.classList.add('active');
        this.navDropdown.setAttribute('aria-hidden', 'false');
        
        // Enhanced organic growth when opening
        this.startSustainedGrowth();
        
        // Focus first menu item
        setTimeout(() => {
            const firstItem = this.navDropdown.querySelector('a[role="menuitem"]');
            if (firstItem) firstItem.focus();
        }, 100);
        
        console.log('Navigation dropdown opened with organic growth');
    }
    
    closeDropdown() {
        if (!this.navDropdown) return;
        
        this.isOpen = false;
        this.navToggle.classList.remove('active');
        this.navToggle.setAttribute('aria-expanded', 'false');
        this.navDropdown.classList.remove('active');
        this.navDropdown.setAttribute('aria-hidden', 'true');
        
        // Stop sustained growth
        this.stopSustainedGrowth();
        
        console.log('Navigation dropdown closed');
    }
    
    handleHoverStart() {
        this.isHovering = true;
        
        // Increase tendril animation intensity
        this.navLines.forEach((line, index) => {
            if (this.tendrilPhases[index]) {
                this.tendrilPhases[index].frequency *= 1.5;
                this.tendrilPhases[index].amplitude *= 1.3;
            }
        });
        
        // Add hover growth effect
        this.startHoverGrowth();
    }
    
    handleHoverEnd() {
        this.isHovering = false;
        
        // Reset tendril animation intensity
        this.navLines.forEach((line, index) => {
            if (this.tendrilPhases[index]) {
                this.tendrilPhases[index].frequency /= 1.5;
                this.tendrilPhases[index].amplitude /= 1.3;
            }
        });
        
        // Stop hover growth
        this.stopHoverGrowth();
    }
    
    handleTouchStart(e) {
        // Add haptic feedback if available
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
        
        // Enhanced touch response
        this.triggerTouchResponse();
    }
    
    startOrganicAnimation() {
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.animateOrganicMovement();
        }
    }
    
    animateOrganicMovement() {
        this.animationFrameId = requestAnimationFrame(() => {
            this.updateTendrilPositions();
            this.animateOrganicMovement();
        });
    }
    
    updateTendrilPositions() {
        const time = Date.now() * 0.001; // Convert to seconds
        
        this.navLines.forEach((line, index) => {
            if (!this.tendrilPhases[index]) return;
            
            const phase = this.tendrilPhases[index];
            
            // Calculate organic rotation variation
            const baseRotation = this.getBaseTendrilRotation(index);
            const organicVariation = Math.sin(time * phase.frequency + phase.phase) * phase.amplitude;
            const newRotation = baseRotation + organicVariation;
            
            // Calculate organic length variation
            const baseLengthVariation = Math.cos(time * phase.frequency * 0.7 + phase.phase) * 2;
            
            // Apply transforms with CSS custom properties for smooth performance
            line.style.transform = `translate(-50%, -50%) rotate(${newRotation}deg)`;
            
            // Subtle opacity pulsing
            const opacityVariation = 0.7 + Math.sin(time * phase.frequency * 0.5 + phase.phase) * 0.2;
            line.style.opacity = opacityVariation;
            
            // Update phase for continuous movement
            phase.phase += phase.speed;
        });
    }
    
    getBaseTendrilRotation(index) {
        // Base rotations for the 6 tendrils to create organic radial pattern
        const baseRotations = [-25, 45, -80, 15, -110, 75];
        return baseRotations[index] || 0;
    }
    
    triggerGrowthBurst() {
        // Create a burst effect on click/tap
        this.navToggle.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            this.navToggle.style.transform = 'scale(1.1)';
        }, 100);
        
        setTimeout(() => {
            this.navToggle.style.transform = 'scale(1)';
        }, 300);
        
        // Intensify tendril movement temporarily
        this.navLines.forEach((line, index) => {
            if (this.tendrilPhases[index]) {
                const originalAmplitude = this.tendrilPhases[index].amplitude;
                this.tendrilPhases[index].amplitude *= 2;
                
                setTimeout(() => {
                    this.tendrilPhases[index].amplitude = originalAmplitude;
                }, 500);
            }
        });
    }
    
    startSustainedGrowth() {
        // Enhanced animation for when dropdown is open
        this.navLines.forEach((line, index) => {
            if (this.tendrilPhases[index]) {
                this.tendrilPhases[index].amplitude *= 1.4;
                this.tendrilPhases[index].frequency *= 1.2;
            }
        });
    }
    
    stopSustainedGrowth() {
        // Reset to normal animation
        this.navLines.forEach((line, index) => {
            if (this.tendrilPhases[index]) {
                this.tendrilPhases[index].amplitude /= 1.4;
                this.tendrilPhases[index].frequency /= 1.2;
            }
        });
    }
    
    startHoverGrowth() {
        // Subtle hover enhancement already handled in CSS
        // This could add additional JavaScript-based effects if needed
    }
    
    stopHoverGrowth() {
        // Reset hover effects
    }
    
    triggerTouchResponse() {
        // Enhanced response for touch interactions
        this.navLines.forEach((line, index) => {
            line.style.filter = 'blur(0px) brightness(1.1)';
            
            setTimeout(() => {
                line.style.filter = 'blur(0.3px) brightness(1)';
            }, 200);
        });
    }
    
    handleResize() {
        // Reinitialize phases on resize to adapt to new screen size
        this.initializeTendrilPhases();
    }
    
    // Public methods for external control
    pauseAnimation() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
    
    resumeAnimation() {
        if (!this.animationFrameId && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.startOrganicAnimation();
        }
    }
    
    setTendrilIntensity(intensity) {
        // Adjust overall animation intensity (0-2, where 1 is normal)
        this.navLines.forEach((line, index) => {
            if (this.tendrilPhases[index]) {
                this.tendrilPhases[index].amplitude *= intensity;
                this.tendrilPhases[index].frequency *= intensity;
            }
        });
    }
    
    triggerSpecialEffect(type = 'burst') {
        switch(type) {
            case 'burst':
                this.triggerGrowthBurst();
                break;
            case 'pulse':
                this.startSustainedGrowth();
                setTimeout(() => this.stopSustainedGrowth(), 1000);
                break;
            case 'calm':
                this.setTendrilIntensity(0.3);
                setTimeout(() => this.setTendrilIntensity(1), 2000);
                break;
        }
    }
    
    cleanup() {
        this.pauseAnimation();
        
        // Remove event listeners
        if (this.navToggle) {
            this.navToggle.removeEventListener('click', this.handleToggleClick);
            this.navToggle.removeEventListener('mouseenter', this.handleHoverStart);
            this.navToggle.removeEventListener('mouseleave', this.handleHoverEnd);
        }
    }
}

// Enhanced navigation dropdown functionality
function toggleNavDropdown() {
    if (window.organicNavController) {
        window.organicNavController.handleToggleClick();
    } else {
        // Fallback for basic functionality
        const dropdown = document.getElementById('nav-dropdown');
        if (dropdown) {
            dropdown.classList.toggle('active');
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.floating-nav')) {
        window.organicNavController = new OrganicNavController();
        
        // Expose methods for external use
        window.triggerNavEffect = (type) => {
            if (window.organicNavController) {
                window.organicNavController.triggerSpecialEffect(type);
            }
        };
        
        window.adjustNavIntensity = (intensity) => {
            if (window.organicNavController) {
                window.organicNavController.setTendrilIntensity(intensity);
            }
        };
        
        console.log('Organic navigation system initialized');
    }
});

// Handle page visibility for performance
document.addEventListener('visibilitychange', () => {
    if (window.organicNavController) {
        if (document.hidden) {
            window.organicNavController.pauseAnimation();
        } else {
            window.organicNavController.resumeAnimation();
        }
    }
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (window.organicNavController) {
        window.organicNavController.cleanup();
    }
});