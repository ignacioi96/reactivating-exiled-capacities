/**
 * Background Mycelium Generator - SIMPLIFIED VERSION
 * Fixes circular dependency issues
 */

class BackgroundMyceliumGenerator {
    constructor() {
        this.container = null;
        this.svg = null;
        this.networks = [];
        this.isInitialized = false;
        
        // Initialize immediately with fixed values
        this.init();
    }
    
    init() {
        // Only run on content pages
        if (document.querySelector('.splash-layout, .home-layout')) {
            return;
        }
        
        console.log('Initializing background mycelium generator...');
        
        // Calculate all values upfront
        const screenWidth = window.innerWidth;
        const density = this.getDensityForWidth(screenWidth);
        const complexity = this.getComplexityForWidth(screenWidth);
        const maxBranches = this.getMaxBranchesForWidth(screenWidth, density);
        
        // Create config object with calculated values
        this.config = {
            density: density,
            complexity: complexity,
            maxBranches: maxBranches,
            colors: {
                primary: '#d4c7b0',
                secondary: '#c7b299',
                accent: '#b8a082',
                subtle: '#e8ddd0',
                shadow: 'rgba(139, 115, 85, 0.1)'
            },
            animations: {
                enabled: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
                duration: 8000,
                stagger: 300
            }
        };
        
        this.createContainer();
        this.createSVG();
        this.detectContentType();
        this.generateNetworks();
        this.bindEvents();
        
        this.isInitialized = true;
        console.log('Background mycelium initialized successfully');
    }
    
    getDensityForWidth(width) {
        if (width > 1200) return 1.0;
        if (width > 768) return 0.7;
        if (width > 480) return 0.5;
        return 0.3;
    }
    
    getComplexityForWidth(width) {
        if (width > 1200) return 0.8;
        if (width > 768) return 0.6;
        if (width > 480) return 0.4;
        return 0.3;
    }
    
    getMaxBranchesForWidth(width, density) {
        const baseCount = Math.floor(width / 100);
        return Math.max(3, Math.min(baseCount * density, 15));
    }
    
    createContainer() {
        this.container = document.createElement('div');
        this.container.className = 'bg-mycelium-container bg-mycelium-warm';
        this.container.id = 'bgMyceliumContainer';
        document.body.insertBefore(this.container, document.body.firstChild);
    }
    
    createSVG() {
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.id = 'bgMyceliumCanvas';
        this.svg.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            z-index: 1;
        `;
        this.svg.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);
        this.container.appendChild(this.svg);
    }
    
    detectContentType() {
        const content = document.querySelector('.page-content, .content-wrapper');
        if (!content) return;
        
        const contentHeight = content.scrollHeight;
        const viewportHeight = window.innerHeight;
        const ratio = contentHeight / viewportHeight;
        
        if (ratio > 3) {
            document.body.classList.add('long-content');
            this.config.complexity *= 0.6;
        } else if (ratio < 1.5) {
            document.body.classList.add('short-content');
            this.config.complexity *= 1.2;
        }
        
        if (document.querySelector('form, input, textarea')) {
            document.body.classList.add('form-page');
            this.config.complexity *= 0.5;
        }
    }
    
    generateNetworks() {
        const numNetworks = Math.floor(this.config.maxBranches * this.config.density);
        console.log(`Generating ${numNetworks} mycelium networks`);
        
        for (let i = 0; i < numNetworks; i++) {
            setTimeout(() => {
                this.createNetwork(i);
            }, i * this.config.animations.stagger);
        }
        
        setTimeout(() => {
            this.container.classList.add('loaded');
        }, numNetworks * this.config.animations.stagger + 1000);
    }
    
    createNetwork(index) {
        const network = new BackgroundMyceliumNetwork({
            svg: this.svg,
            colors: this.config.colors,
            complexity: this.config.complexity,
            animations: this.config.animations,
            index: index
        });
        
        network.generate();
        this.networks.push(network);
    }
    
    bindEvents() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 300);
        });
        
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pause();
            } else {
                this.resume();
            }
        });
    }
    
    handleResize() {
        if (!this.isInitialized) return;
        
        this.svg.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);
        
        // Recalculate for new screen size
        const screenWidth = window.innerWidth;
        this.config.density = this.getDensityForWidth(screenWidth);
        this.config.complexity = this.getComplexityForWidth(screenWidth);
        this.config.maxBranches = this.getMaxBranchesForWidth(screenWidth, this.config.density);
        
        this.regenerate();
    }
    
    regenerate() {
        this.cleanup();
        setTimeout(() => {
            this.generateNetworks();
        }, 100);
    }
    
    pause() {
        this.networks.forEach(network => {
            if (network.pause) network.pause();
        });
    }
    
    resume() {
        this.networks.forEach(network => {
            if (network.resume) network.resume();
        });
    }
    
    cleanup() {
        this.networks.forEach(network => {
            if (network.cleanup) network.cleanup();
        });
        this.networks = [];
        
        if (this.svg) {
            const paths = this.svg.querySelectorAll('path');
            paths.forEach(path => path.remove());
        }
    }
}

class BackgroundMyceliumNetwork {
    constructor(options) {
        this.svg = options.svg;
        this.colors = options.colors;
        this.complexity = options.complexity;
        this.animations = options.animations;
        this.index = options.index;
        this.branches = [];
        this.animationDelay = this.index * 200;
    }
    
    generate() {
        const startPoints = this.generateStartPoints();
        startPoints.forEach((point, i) => {
            this.generateBranch(point, 0, i);
        });
    }
    
    generateStartPoints() {
        const points = [];
        const numPoints = Math.floor(2 + this.complexity * 3);
        
        for (let i = 0; i < numPoints; i++) {
            const x = (window.innerWidth / numPoints) * i + Math.random() * (window.innerWidth / numPoints);
            const y = Math.random() * window.innerHeight;
            points.push({ x, y });
        }
        
        return points;
    }
    
    generateBranch(start, generation, branchIndex) {
        if (generation > 3 || Math.random() > this.complexity) return;
        
        const length = 80 + Math.random() * 120 - (generation * 20);
        const angle = Math.random() * Math.PI * 2;
        
        const end = {
            x: start.x + Math.cos(angle) * length,
            y: start.y + Math.sin(angle) * length
        };
        
        const path = this.createBranchPath(start, end, generation);
        this.svg.appendChild(path);
        this.branches.push(path);
        
        if (Math.random() < 0.4 && generation < 3) {
            const numSubBranches = Math.floor(1 + Math.random() * 3);
            for (let i = 0; i < numSubBranches; i++) {
                const t = 0.3 + Math.random() * 0.7;
                const branchPoint = {
                    x: start.x + (end.x - start.x) * t,
                    y: start.y + (end.y - start.y) * t
                };
                
                setTimeout(() => {
                    this.generateBranch(branchPoint, generation + 1, branchIndex + i);
                }, (generation + 1) * 300);
            }
        }
    }
    
    createBranchPath(start, end, generation) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        
        const midX = (start.x + end.x) / 2 + (Math.random() - 0.5) * 20;
        const midY = (start.y + end.y) / 2 + (Math.random() - 0.5) * 20;
        
        const d = `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} Q ${midX.toFixed(1)} ${midY.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
        path.setAttribute('d', d);
        
        const strokeWidth = Math.max(0.5, 2 - generation * 0.4);
        let strokeColor = this.colors.primary;
        let className = 'bg-mycelium-path';
        
        if (generation === 1) {
            strokeColor = this.colors.secondary;
            className = 'bg-mycelium-branch';
        } else if (generation === 2) {
            strokeColor = this.colors.accent;
            className = 'bg-mycelium-accent';
        } else if (generation > 2) {
            strokeColor = this.colors.subtle;
            className = 'bg-mycelium-subtle-branch';
        }
        
        path.setAttribute('stroke', strokeColor);
        path.setAttribute('stroke-width', strokeWidth);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        path.className.baseVal = className;
        
        if (this.animations.enabled) {
            const delay = this.animationDelay + generation * 400 + Math.random() * 500;
            path.style.animationDelay = `${delay}ms`;
        }
        
        return path;
    }
    
    pause() {
        this.branches.forEach(branch => {
            branch.style.animationPlayState = 'paused';
        });
    }
    
    resume() {
        this.branches.forEach(branch => {
            branch.style.animationPlayState = 'running';
        });
    }
    
    cleanup() {
        this.branches.forEach(branch => {
            if (branch.parentNode) {
                branch.parentNode.removeChild(branch);
            }
        });
        this.branches = [];
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (!document.querySelector('.splash-layout, .home-layout')) {
        console.log('Initializing background mycelium system...');
        
        setTimeout(() => {
            try {
                window.backgroundMycelium = new BackgroundMyceliumGenerator();
            } catch (error) {
                console.error('Failed to initialize background mycelium:', error);
            }
        }, 500);
    }
});