// ============================================
// 2D MYCELIUM SYSTEM - MUCH SIMPLER!
// ============================================

// Seeded random number generator
class RNG {
    constructor(seed) {
        this.seed = seed;
    }
    
    random(max = 1, min = 0) {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        const val = this.seed / 233280;
        return min + val * (max - min);
    }
}

// 2D Vector helper class
class Vec2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    
    clone() {
        return new Vec2(this.x, this.y);
    }
    
    add(other) {
        this.x += other.x;
        this.y += other.y;
        return this;
    }
    
    subtract(other) {
        return new Vec2(this.x - other.x, this.y - other.y);
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

// 2D Mycelium Branch Class
class MyceliumBranch2D {
    constructor(start, target, options = {}) {
        this.start = start.clone();
        this.target = target ? target.clone() : null;
        this.points = [];
        this.children = [];
        
        // Branch properties
        this.level = options.level || 0;
        this.maxLength = options.maxLength || (target ? start.distanceTo(target) * 0.9 : 100);
        this.segments = options.segments || 20;
        this.branchProbability = options.branchProbability || 0.7;
        this.maxAngleDeviation = options.maxAngleDeviation || 30; // degrees
        this.targetInfluence = options.targetInfluence || 0.8;
        this.startWidth = options.startWidth || 3;
        this.endWidth = options.endWidth || 1;
        this.animationDelay = options.animationDelay || 0;
        
        // Generate the branch path
        this.generatePath();
    }
    
    generatePath() {
        this.points = [];
        let currentPos = this.start.clone();
        let currentDirection = this.target ? 
            this.target.subtract(this.start).normalize() :
            new Vec2(window.myceliumRNG.random(-1, 1), window.myceliumRNG.random(-1, 1)).normalize();
        
        const stepLength = this.maxLength / this.segments;
        
        for (let i = 0; i <= this.segments; i++) {
            const progress = i / this.segments;
            
            // Add current position to path
            this.points.push({
                position: currentPos.clone(),
                width: this.startWidth + (this.endWidth - this.startWidth) * progress,
                progress: progress
            });
            
            // Don't move on the last point
            if (i === this.segments) break;
            
            // Calculate next position
            if (this.target) {
                // Target-seeking behavior
                const directionToTarget = this.target.subtract(currentPos).normalize();
                const influence = this.targetInfluence * (0.3 + progress * 0.7); // Stronger near end
                
                // Blend current direction with target direction
                currentDirection.multiply(1 - influence).add(
                    directionToTarget.clone().multiply(influence)
                ).normalize();
            }
            
            // Add organic randomness
            const randomAngle = (window.myceliumRNG.random() - 0.5) * this.maxAngleDeviation * Math.PI / 180;
            const cos = Math.cos(randomAngle);
            const sin = Math.sin(randomAngle);
            
            const newDir = new Vec2(
                currentDirection.x * cos - currentDirection.y * sin,
                currentDirection.x * sin + currentDirection.y * cos
            );
            
            currentDirection = newDir;
            currentPos.add(currentDirection.clone().multiply(stepLength));
        }
    }
    
    generateChildren() {
        if (this.level >= 2) return; // Max 3 levels (0, 1, 2)
        
        const numChildren = this.level === 0 ? 
            Math.floor(window.myceliumRNG.random(2, 4)) : // Main branches have 2-3 children
            Math.floor(window.myceliumRNG.random(0, 3) * this.branchProbability); // Sub-branches have 0-2
        
        for (let i = 0; i < numChildren; i++) {
            // Pick a point along the branch to spawn from (not too early, not too late)
            const spawnIndex = Math.floor(window.myceliumRNG.random(
                this.points.length * 0.3, 
                this.points.length * 0.8
            ));
            const spawnPoint = this.points[spawnIndex];
            
            if (!spawnPoint) continue;
            
            // Create child branch
            const childLength = this.maxLength * (0.4 + window.myceliumRNG.random() * 0.4);
            const childTarget = this.target && this.level < 2 && window.myceliumRNG.random() < 0.5 ? 
                this.target : null; // Some children continue toward parent's target
            
            const child = new MyceliumBranch2D(
                spawnPoint.position,
                childTarget,
                {
                    level: this.level + 1,
                    maxLength: childLength,
                    segments: Math.max(8, this.segments - 4),
                    branchProbability: this.branchProbability * 0.8,
                    maxAngleDeviation: this.maxAngleDeviation + 10,
                    targetInfluence: this.targetInfluence * 0.7,
                    startWidth: spawnPoint.width,
                    endWidth: Math.max(0.5, spawnPoint.width * 0.6),
                    animationDelay: this.animationDelay + spawnPoint.progress * 1000 + window.myceliumRNG.random(200, 500)
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
        
        let path = `M ${this.points[0].position.x} ${this.points[0].position.y}`;
        
        // Create smooth curves using quadratic bezier curves
        for (let i = 1; i < this.points.length; i++) {
            const current = this.points[i];
            
            if (i === this.points.length - 1) {
                // Last point - draw line to end
                path += ` L ${current.position.x} ${current.position.y}`;
            } else {
                // Create smooth curve to next point
                const next = this.points[i + 1];
                const controlX = current.position.x;
                const controlY = current.position.y;
                const endX = (current.position.x + next.position.x) / 2;
                const endY = (current.position.y + next.position.y) / 2;
                
                if (i === 1) {
                    // First curve
                    path += ` Q ${controlX} ${controlY} ${endX} ${endY}`;
                } else {
                    // Smooth continuation
                    path += ` T ${endX} ${endY}`;
                }
            }
        }
        
        return path;
    }
}

// Main 2D Mycelium Network Manager
class MyceliumNetwork2D {
    constructor(container) {
        this.container = container;
        this.svg = null;
        this.branches = [];
        this.isAnimating = false;
        this.rng = new RNG(Date.now());
        window.myceliumRNG = this.rng;
        
        this.createSVG();
    }
    
    createSVG() {
        // Remove existing SVG
        const existing = this.container.querySelector('#mycelium-svg');
        if (existing) existing.remove();
        
        // Create new SVG
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.id = 'mycelium-svg';
        this.svg.style.position = 'fixed';
        this.svg.style.top = '0';
        this.svg.style.left = '0';
        this.svg.style.width = '100vw';
        this.svg.style.height = '100vh';
        this.svg.style.zIndex = '3';
        this.svg.style.pointerEvents = 'none';
        this.svg.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);
        
        this.container.appendChild(this.svg);
    }
    
    generateTargeted(buttonCenter, targetPositions, options = {}) {
        console.log('Generating 2D targeted mycelium...');
        console.log('Button center:', buttonCenter);
        console.log('Targets:', targetPositions);
        
        this.clear();
        window.myceliumRNG = new RNG(Date.now() + 12345);
        
        const defaults = {
            branchProbability: 0.8,
            maxAngleDeviation: 15,
            targetInfluence: 0.85,
            startWidth: 4,
            endWidth: 1.5
        };
        
        const config = { ...defaults, ...options };
        
        const start = new Vec2(buttonCenter.x, buttonCenter.y);
        
        // Create main targeted branches
        targetPositions.forEach((targetPos, i) => {
            const target = new Vec2(targetPos.x, targetPos.y);
            const distance = start.distanceTo(target);
            
            console.log(`Creating branch ${i} to distance: ${distance.toFixed(1)}px`);
            
            const branch = new MyceliumBranch2D(start, target, {
                level: 0,
                maxLength: distance * 0.95, // Slight undershoot for better connection
                segments: Math.max(15, Math.floor(distance / 20)), // More segments for longer distances
                branchProbability: config.branchProbability,
                maxAngleDeviation: config.maxAngleDeviation,
                targetInfluence: config.targetInfluence,
                startWidth: config.startWidth,
                endWidth: config.endWidth,
                animationDelay: i * 300
            });
            
            branch.generateChildren();
            this.branches.push(branch);
        });
        
        // Add some organic background branches
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2 + window.myceliumRNG.random(-0.8, 0.8);
            const length = 80 + window.myceliumRNG.random(60);
            const endPoint = new Vec2(
                start.x + Math.cos(angle) * length,
                start.y + Math.sin(angle) * length
            );
            
            const organicBranch = new MyceliumBranch2D(start, endPoint, {
                level: 0,
                maxLength: length,
                segments: 12,
                branchProbability: 0.6,
                maxAngleDeviation: 25,
                targetInfluence: 0.3,
                startWidth: config.startWidth * 0.7,
                endWidth: config.endWidth * 0.7,
                animationDelay: 100 + i * 150
            });
            
            organicBranch.generateChildren();
            this.branches.push(organicBranch);
        }
        
        const allBranches = [];
        this.branches.forEach(branch => {
            allBranches.push(...branch.getAllBranches());
        });
        
        console.log(`Generated ${allBranches.length} total 2D branches`);
    }
    
    startGrowthAnimation() {
        if (this.isAnimating) return;
        
        console.log('Starting 2D mycelium animation...');
        this.isAnimating = true;
        
        // Get all branches
        const allBranches = [];
        this.branches.forEach(branch => {
            allBranches.push(...branch.getAllBranches());
        });
        
        // Create SVG paths for each branch
        allBranches.forEach((branch, index) => {
            this.animateBranch(branch, index);
        });
        
        // Show loading indicator
        const loadingEl = document.getElementById('loading');
        if (loadingEl) loadingEl.classList.add('active');
        
        // Hide loading after animation
        const maxDelay = Math.max(...allBranches.map(b => b.animationDelay));
        setTimeout(() => {
            this.isAnimating = false;
            if (loadingEl) loadingEl.classList.remove('active');
        }, maxDelay + 2000);
    }
    
    animateBranch(branch, index) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', branch.toSVGPath());
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#e5ddd5');
        path.setAttribute('stroke-width', branch.startWidth);
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        path.setAttribute('opacity', Math.max(0.6, 1 - branch.level * 0.2));
        
        // Animation setup
        const pathLength = path.getTotalLength();
        path.style.strokeDasharray = pathLength;
        path.style.strokeDashoffset = pathLength;
        path.style.animation = `drawPath 2s ease-out forwards`;
        path.style.animationDelay = `${branch.animationDelay}ms`;
        
        this.svg.appendChild(path);
    }
    
    clear() {
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
// GLOBAL VARIABLES & INITIALIZATION
// ============================================

let myceliumNetwork2D;
let isMycelium2DInitialized = false;

// Predetermined target positions (matching CSS button positions)
const TARGET_POSITIONS = {
    about: { x: 50, y: 15 },     // Top center (viewport %)
    mapping: { x: 15, y: 80 },   // Bottom left (viewport %)
    nervous: { x: 85, y: 80 }    // Bottom right (viewport %)
};

function initMycelium() {
    if (isMycelium2DInitialized) return;
    
    console.log('Initializing 2D mycelium system...');
    
    const container = document.body;
    myceliumNetwork2D = new MyceliumNetwork2D(container);
    
    isMycelium2DInitialized = true;
    
    // Add CSS animation for path drawing
    if (!document.getElementById('mycelium-styles')) {
        const styles = document.createElement('style');
        styles.id = 'mycelium-styles';
        styles.textContent = `
            @keyframes drawPath {
                to {
                    stroke-dashoffset: 0;
                }
            }
        `;
        document.head.appendChild(styles);
    }
}

function triggerTargetedMyceliumGrowth() {
    if (!isMycelium2DInitialized) {
        console.error('2D Mycelium not initialized yet');
        return;
    }
    
    console.log('Triggering 2D targeted mycelium growth...');
    
    // Get central button position
    const button = document.getElementById('centralButton');
    if (!button) {
        console.error('Central button not found');
        return;
    }
    
    const buttonRect = button.getBoundingClientRect();
    const buttonCenter = {
        x: buttonRect.left + buttonRect.width / 2,
        y: buttonRect.top + buttonRect.height / 2
    };
    
    // Convert predetermined target positions to screen coordinates
    const targets = [
        viewportToScreen(TARGET_POSITIONS.about.x, TARGET_POSITIONS.about.y),
        viewportToScreen(TARGET_POSITIONS.mapping.x, TARGET_POSITIONS.mapping.y),
        viewportToScreen(TARGET_POSITIONS.nervous.x, TARGET_POSITIONS.nervous.y)
    ];
    
    console.log('2D Button center:', buttonCenter);
    console.log('2D Target positions:', targets);
    
    // Generate and animate
    myceliumNetwork2D.generateTargeted(buttonCenter, targets, {
        branchProbability: 0.8,
        maxAngleDeviation: 12,
        targetInfluence: 0.9,
        startWidth: 4,
        endWidth: 1
    });
    
    myceliumNetwork2D.startGrowthAnimation();
}

// Alias for compatibility with template
const triggerTargetedMycelium2D = triggerTargetedMyceliumGrowth;

// Convert viewport percentage to screen coordinates
function viewportToScreen(vpX, vpY) {
    return {
        x: (vpX / 100) * window.innerWidth,
        y: (vpY / 100) * window.innerHeight
    };
}

// Handle window resize
function handleMycelium2DResize() {
    if (isMycelium2DInitialized && myceliumNetwork2D) {
        myceliumNetwork2D.resize();
        
        // Regenerate if in home mode
        if (window.isHomeMode) {
            setTimeout(() => {
                triggerTargetedMyceliumGrowth();
            }, 100);
        }
    }
}

window.addEventListener('resize', handleMycelium2DResize);

// DOM initialization
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.splash-layout')) {
        console.log('Initializing 2D mycelium system...');
        initMycelium();
    }
});