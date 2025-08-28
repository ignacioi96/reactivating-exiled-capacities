// ============================================
// CLEAN 2D NETWORK SYSTEM (No conflicts!)
// ============================================

// Simple random number generator with unique name
class NetworkRNG {
    constructor(seed) {
        this.seed = seed;
    }
    
    random(max = 1, min = 0) {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        const val = this.seed / 233280;
        return min + val * (max - min);
    }
}

// 2D Point class
class Point2D {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    
    clone() {
        return new Point2D(this.x, this.y);
    }
    
    add(other) {
        this.x += other.x;
        this.y += other.y;
        return this;
    }
    
    subtract(other) {
        return new Point2D(this.x - other.x, this.y - other.y);
    }
    
    multiply(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    }
    
    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    
    normalize() {
        const len = this.length();
        if (len > 0) {
            this.x /= len;
            this.y /= len;
        }
        return this;
    }
    
    distanceTo(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

// Network branch class
class NetworkBranch {
    constructor(start, target, options = {}) {
        this.start = start.clone();
        this.target = target ? target.clone() : null;
        this.points = [];
        this.children = [];
        
        // Properties
        this.level = options.level || 0;
        this.maxLength = options.maxLength || (target ? start.distanceTo(target) * 0.92 : 100);
        this.segments = Math.max(12, Math.floor(this.maxLength / 15));
        this.branchProbability = options.branchProbability || 0.8;
        this.maxAngleDeviation = options.maxAngleDeviation || 20;
        this.targetInfluence = options.targetInfluence || 0.88;
        this.startWidth = options.startWidth || 3.5;
        this.endWidth = options.endWidth || 1;
        this.animationDelay = options.animationDelay || 0;
        
        this.generatePath();
    }
    
    generatePath() {
        this.points = [];
        let currentPos = this.start.clone();
        let currentDirection = this.target ? 
            this.target.subtract(this.start).normalize() :
            new Point2D(window.networkRNG.random(-1, 1), window.networkRNG.random(-1, 1)).normalize();
        
        const stepLength = this.maxLength / this.segments;
        
        for (let i = 0; i <= this.segments; i++) {
            const progress = i / this.segments;
            
            this.points.push({
                position: currentPos.clone(),
                width: this.startWidth + (this.endWidth - this.startWidth) * progress,
                progress: progress
            });
            
            if (i === this.segments) break;
            
            // Target seeking
            if (this.target) {
                const directionToTarget = this.target.subtract(currentPos).normalize();
                const influence = this.targetInfluence * Math.pow(progress, 0.7); // Curve the influence
                
                currentDirection.multiply(1 - influence).add(
                    directionToTarget.clone().multiply(influence)
                ).normalize();
            }
            
            // Organic deviation
            const randomAngle = (window.networkRNG.random() - 0.5) * this.maxAngleDeviation * Math.PI / 180;
            const cos = Math.cos(randomAngle);
            const sin = Math.sin(randomAngle);
            
            const newDir = new Point2D(
                currentDirection.x * cos - currentDirection.y * sin,
                currentDirection.x * sin + currentDirection.y * cos
            );
            
            currentDirection = newDir;
            currentPos.add(currentDirection.clone().multiply(stepLength));
        }
    }
    
    generateChildren() {
        if (this.level >= 2) return;
        
        const numChildren = this.level === 0 ? 
            Math.floor(window.networkRNG.random(2, 4)) :
            Math.floor(window.networkRNG.random(1, 3) * this.branchProbability);
        
        for (let i = 0; i < numChildren; i++) {
            const spawnIndex = Math.floor(window.networkRNG.random(
                this.points.length * 0.25, 
                this.points.length * 0.75
            ));
            const spawnPoint = this.points[spawnIndex];
            
            if (!spawnPoint) continue;
            
            const childLength = this.maxLength * (0.35 + window.networkRNG.random() * 0.4);
            const childTarget = this.target && this.level < 2 && window.networkRNG.random() < 0.4 ? 
                this.target : null;
            
            const child = new NetworkBranch(
                spawnPoint.position,
                childTarget,
                {
                    level: this.level + 1,
                    maxLength: childLength,
                    branchProbability: this.branchProbability * 0.7,
                    maxAngleDeviation: this.maxAngleDeviation + 8,
                    targetInfluence: this.targetInfluence * 0.6,
                    startWidth: spawnPoint.width * 0.8,
                    endWidth: Math.max(0.5, spawnPoint.width * 0.5),
                    animationDelay: this.animationDelay + spawnPoint.progress * 800 + window.networkRNG.random(100, 400)
                }
            );
            
            child.generateChildren();
            this.children.push(child);
        }
    }
    
    getAllBranches() {
        const branches = [this];
        for (const child of this.children) {
            branches.push(...child.getAllBranches());
        }
        return branches;
    }
    
    toSVGPath() {
        if (this.points.length < 2) return '';
        
        let path = `M ${this.points[0].position.x.toFixed(1)} ${this.points[0].position.y.toFixed(1)}`;
        
        for (let i = 1; i < this.points.length; i++) {
            const current = this.points[i];
            
            if (i === 1 || i === this.points.length - 1) {
                // First and last points - straight lines
                path += ` L ${current.position.x.toFixed(1)} ${current.position.y.toFixed(1)}`;
            } else {
                // Smooth curves for middle points
                const prev = this.points[i - 1];
                const next = this.points[i + 1];
                
                // Control point is current position
                const controlX = current.position.x;
                const controlY = current.position.y;
                
                // End point is midway to next point
                const endX = (current.position.x + next.position.x) / 2;
                const endY = (current.position.y + next.position.y) / 2;
                
                path += ` Q ${controlX.toFixed(1)} ${controlY.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`;
            }
        }
        
        return path;
    }
}

// Main network system
class OrganicNetwork {
    constructor(container) {
        this.container = container;
        this.svg = null;
        this.branches = [];
        this.animationTimeout = null;
        this.isAnimating = false;
        this.rng = new NetworkRNG(Date.now());
        window.networkRNG = this.rng;
        
        this.createSVG();
        console.log('OrganicNetwork initialized');
    }
    
    createSVG() {
        const existing = this.container.querySelector('#network-svg');
        if (existing) existing.remove();
        
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.id = 'network-svg';
        this.svg.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 3;
            pointer-events: none;
        `;
        this.svg.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);
        
        this.container.appendChild(this.svg);
    }
    
    generateToTargets(buttonCenter, targetPositions, options = {}) {
        console.log('Generating network to targets...');
        console.log('From:', buttonCenter);
        console.log('To:', targetPositions);
        
        this.clear();
        window.networkRNG = new NetworkRNG(Date.now() + 54321);
        
        const defaults = {
            branchProbability: 0.75,
            maxAngleDeviation: 12,
            targetInfluence: 0.88,
            startWidth: 4,
            endWidth: 1.2
        };
        
        const config = { ...defaults, ...options };
        const start = new Point2D(buttonCenter.x, buttonCenter.y);
        
        // Main targeted branches
        targetPositions.forEach((targetPos, i) => {
            const target = new Point2D(targetPos.x, targetPos.y);
            const distance = start.distanceTo(target);
            
            console.log(`Branch ${i}: ${distance.toFixed(1)}px to target`);
            
            const branch = new NetworkBranch(start, target, {
                level: 0,
                maxLength: distance * 0.92,
                branchProbability: config.branchProbability,
                maxAngleDeviation: config.maxAngleDeviation,
                targetInfluence: config.targetInfluence,
                startWidth: config.startWidth,
                endWidth: config.endWidth,
                animationDelay: 200 + i * 250
            });
            
            branch.generateChildren();
            this.branches.push(branch);
        });
        
        // Background organic branches
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + window.networkRNG.random(-1, 1);
            const length = 70 + window.networkRNG.random(50);
            const endPoint = new Point2D(
                start.x + Math.cos(angle) * length,
                start.y + Math.sin(angle) * length
            );
            
            const organicBranch = new NetworkBranch(start, endPoint, {
                level: 0,
                maxLength: length,
                branchProbability: 0.5,
                maxAngleDeviation: 30,
                targetInfluence: 0.4,
                startWidth: config.startWidth * 0.6,
                endWidth: config.endWidth * 0.6,
                animationDelay: 50 + i * 120
            });
            
            organicBranch.generateChildren();
            this.branches.push(organicBranch);
        }
        
        const total = this.branches.reduce((sum, branch) => sum + branch.getAllBranches().length, 0);
        console.log(`Generated ${total} total branches`);
    }
    
    animate() {
        if (this.animationTimeout) {
            clearTimeout(this.animationTimeout);
            this.animationTimeout = null;
        }
        
        if (this.isAnimating) {
            console.log('Animation in progress, forcing reset...');
            this.isAnimating = false;  // Force reset
        }
        
        console.log('Starting network animation...');
        this.isAnimating = true;
        
        const allBranches = [];
        this.branches.forEach(branch => {
            allBranches.push(...branch.getAllBranches());
        });
        
        allBranches.forEach((branch, index) => {
            this.createAnimatedPath(branch, index);
        });
        
        const loadingEl = document.getElementById('loading');
        if (loadingEl) loadingEl.classList.add('active');
        
        const maxDelay = Math.max(...allBranches.map(b => b.animationDelay));
        this.animationTimeout = setTimeout(() => {  // <-- Store the timeout
            this.isAnimating = false;
            if (loadingEl) loadingEl.classList.remove('active');
            this.animationTimeout = null;
        }, maxDelay + 2500);
    }
    
    createAnimatedPath(branch, index) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', branch.toSVGPath());
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#e5ddd5');
        path.setAttribute('stroke-width', branch.startWidth.toFixed(1));
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        path.setAttribute('opacity', Math.max(0.7, 1 - branch.level * 0.15));
        
        const pathLength = path.getTotalLength();
        path.style.strokeDasharray = `${pathLength}`;
        path.style.strokeDashoffset = `${pathLength}`;
        path.style.animation = `drawNetworkPath 1.8s ease-out forwards`;
        path.style.animationDelay = `${branch.animationDelay}ms`;
        
        this.svg.appendChild(path);
    }
    
    clear() {
    // Clear animation timeout
    if (this.animationTimeout) {
            clearTimeout(this.animationTimeout);
            this.animationTimeout = null;
        }
        
        this.isAnimating = false;  // Reset flag
        this.branches = [];
        
        if (this.svg) {
            this.svg.innerHTML = '';
        }
    }
    
    resize() {
        if (this.svg) {
            this.svg.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);
        }
    }
}

// ============================================
// DYNAMIC BUTTON POSITION MEASUREMENT SYSTEM
// ============================================

function measureActualButtonPositions() {
    console.log('🎯 Measuring actual button positions...');
    
    const buttons = [
        { id: 'aboutButton', name: 'about' },
        { id: 'mappingButton', name: 'mapping' },
        { id: 'nervousButton', name: 'nervous' }
    ];
    
    const positions = [];
    const debugInfo = [];
    
    buttons.forEach(({ id, name }) => {
        const button = document.getElementById(id);
        if (!button) {
            console.warn(`❌ Button ${id} not found`);
            return;
        }
        
        // Get the computed position including all transforms
        const rect = button.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Convert to viewport coordinates
        const vpX = (centerX / window.innerWidth) * 100;
        const vpY = (centerY / window.innerHeight) * 100;
        
        positions.push({
            x: centerX,
            y: centerY
        });
        
        debugInfo.push({
            name: name,
            actualVpX: vpX.toFixed(1),
            actualVpY: vpY.toFixed(1),
            pixelX: centerX.toFixed(1),
            pixelY: centerY.toFixed(1),
            visible: button.style.opacity !== '0' && button.style.visibility !== 'hidden'
        });
        
        console.log(`📍 ${name} button: ${vpX.toFixed(1)}%, ${vpY.toFixed(1)}% (${centerX.toFixed(1)}px, ${centerY.toFixed(1)}px)`);
    });
    
    // Store debug info globally for inspection
    window.buttonPositionDebug = {
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        positions: debugInfo,
        timestamp: new Date().toLocaleTimeString()
    };
    
    console.log('🔍 Position debug info available at: window.buttonPositionDebug');
    
    return positions;
}

function waitForButtonsToBePositioned() {
    return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 20;
        
        function checkPositions() {
            attempts++;
            const positions = measureActualButtonPositions();
            
            // Check if we have valid positions (not all zero)
            const hasValidPositions = positions.length === 3 && 
                positions.some(pos => pos.x > 0 && pos.y > 0);
            
            if (hasValidPositions) {
                console.log(`✅ Valid button positions found after ${attempts} attempts`);
                resolve(positions);
            } else if (attempts >= maxAttempts) {
                console.warn(`⚠️ Max attempts reached (${maxAttempts}), using current positions`);
                resolve(positions);
            } else {
                console.log(`⏳ Attempt ${attempts}: Buttons not yet positioned, retrying...`);
                setTimeout(checkPositions, 50);
            }
        }
        
        checkPositions();
    });
}

// ============================================
// MAIN SYSTEM INTEGRATION WITH DYNAMIC TARGETING
// ============================================

let organicNetwork;
let isNetworkInitialized = false;

function initNetwork() {
    if (isNetworkInitialized) return;
    
    console.log('Initializing organic network system...');
    
    organicNetwork = new OrganicNetwork(document.body);
    isNetworkInitialized = true;
    
    // Add CSS animation
    if (!document.getElementById('network-styles')) {
        const styles = document.createElement('style');
        styles.id = 'network-styles';
        styles.textContent = `
            @keyframes drawNetworkPath {
                to {
                    stroke-dashoffset: 0;
                }
            }
        `;
        document.head.appendChild(styles);
    }
}

async function growNetworkToButtons() {
    if (!isNetworkInitialized) {
        console.error('❌ Network not initialized');
        return;
    }
    
    console.log('🌱 Starting dynamic network growth...');
    
    const button = document.getElementById('centralButton');
    if (!button) {
        console.error('❌ Central button not found');
        return;
    }
    
    const buttonRect = button.getBoundingClientRect();
    const buttonCenter = {
        x: buttonRect.left + buttonRect.width / 2,
        y: buttonRect.top + buttonRect.height / 2
    };
    
    console.log('🎯 Central button position:', buttonCenter);
    
    try {
        // Wait for buttons to be properly positioned
        const targetPositions = await waitForButtonsToBePositioned();
        
        if (targetPositions.length !== 3) {
            console.error('❌ Could not find all button positions');
            return;
        }
        
        console.log('🎯 Final target positions:', targetPositions);
        
        // Calculate distances for verification
        targetPositions.forEach((target, i) => {
            const distance = Math.sqrt(
                Math.pow(target.x - buttonCenter.x, 2) + 
                Math.pow(target.y - buttonCenter.y, 2)
            );
            const names = ['about', 'mapping', 'nervous'];
            console.log(`📏 Distance to "${names[i]}" button: ${distance.toFixed(1)}px`);
        });
        
        // Generate and animate the network
        organicNetwork.generateToTargets(buttonCenter, targetPositions);
        organicNetwork.animate();
        
        console.log('✅ Dynamic network generation complete');
        
    } catch (error) {
        console.error('❌ Error in dynamic network growth:', error);
    }
}

// Add a visual loading state during regeneration
function showRegenerationIndicator() {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
        loadingEl.textContent = 'Adapting network...';
        loadingEl.classList.add('active');
        
        setTimeout(() => {
            loadingEl.textContent = 'Growing network...';
        }, 1500);
    }
}

async function handleNetworkResize() {
    if (!isNetworkInitialized || !organicNetwork) return;
    
    console.log('🔄 Window resized - updating network...');
    console.log('📏 New window size:', window.innerWidth + 'x' + window.innerHeight);
    
    // Update SVG viewBox for new screen size
    organicNetwork.resize();
    
    // If we're in home mode (buttons are visible), regrow the network
    if (window.isHomeMode) {
        console.log('🏠 Home mode active - regenerating network with dynamic targeting');
        
        // Show visual indicator
        showRegenerationIndicator();
        
        // Clear existing network immediately
        organicNetwork.clear();
        
        // Small delay to ensure layout has settled after resize
        setTimeout(async () => {
            try {
                await growNetworkToButtons();
            } catch (error) {
                console.error('❌ Error during resize regeneration:', error);
            }
        }, 400);
    }
}

// Improved resize handling with debouncing and orientation change detection
let resizeTimeout;
let lastWidth = window.innerWidth;
let lastHeight = window.innerHeight;
let lastOrientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';

function debouncedResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        const currentOrientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
        const orientationChanged = currentOrientation !== lastOrientation;
        
        // Check for significant size changes or orientation changes
        const widthChanged = Math.abs(window.innerWidth - lastWidth) > 50;
        const heightChanged = Math.abs(window.innerHeight - lastHeight) > 50;
        
        if (widthChanged || heightChanged || orientationChanged) {
            console.log('📱 Significant change detected - regenerating');
            console.log(`📏 Change: ${lastWidth}x${lastHeight} (${lastOrientation}) → ${window.innerWidth}x${window.innerHeight} (${currentOrientation})`);
            
            lastWidth = window.innerWidth;
            lastHeight = window.innerHeight;
            lastOrientation = currentOrientation;
            
            handleNetworkResize();
        } else {
            console.log('📏 Minor size change - skipping regeneration');
        }
    }, 250);
}

window.addEventListener('resize', debouncedResize);

// Also listen for orientation changes on mobile devices
window.addEventListener('orientationchange', () => {
    console.log('📱 Orientation change detected');
    // Longer delay for orientation change to let the viewport settle completely
    setTimeout(() => {
        handleNetworkResize();
    }, 800);
});

document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.splash-layout')) {
        console.log('Initializing network system...');
        initNetwork();
    }
});

// Compatibility aliases for template
window.initMycelium = initNetwork;
window.triggerTargetedMyceliumGrowth = growNetworkToButtons;