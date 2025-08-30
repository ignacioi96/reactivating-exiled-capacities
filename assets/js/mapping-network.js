// ============================================
// MAPPING NETWORK SYSTEM
// Adapted from network.js for mapping capacities page
// ============================================

// Random number generator for consistent results
class MappingRNG {
    constructor(seed) {
        this.seed = seed;
    }
    
    random(max = 1, min = 0) {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        const val = this.seed / 233280;
        return min + val * (max - min);
    }
}

// 2D Vector class
class MappingVector {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    
    clone() {
        return new MappingVector(this.x, this.y);
    }
    
    add(other) {
        this.x += other.x;
        this.y += other.y;
        return this;
    }
    
    subtract(other) {
        return new MappingVector(this.x - other.x, this.y - other.y);
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

// Mapping Network Branch
class MappingBranch {
    constructor(start, target, options = {}) {
        this.start = start.clone();
        this.target = target ? target.clone() : null;
        this.points = [];
        this.children = [];
        
        // Properties
        this.level = options.level || 0;
        this.maxLength = options.maxLength || (target ? start.distanceTo(target) * 0.88 : 120);
        this.segments = Math.max(15, Math.floor(this.maxLength / 12));
        this.branchProbability = options.branchProbability || 0.7;
        this.maxAngleDeviation = options.maxAngleDeviation || 18;
        this.targetInfluence = options.targetInfluence || 0.82;
        this.startWidth = options.startWidth || 3.2;
        this.endWidth = options.endWidth || 1.2;
        this.animationDelay = options.animationDelay || 0;
        this.clusterName = options.clusterName || '';
        
        this.generatePath();
    }
    
    generatePath() {
        this.points = [];
        let currentPos = this.start.clone();
        let currentDirection = this.target ? 
            this.target.subtract(this.start).normalize() :
            new MappingVector(window.mappingRNG.random(-1, 1), window.mappingRNG.random(-1, 1)).normalize();
        
        const stepLength = this.maxLength / this.segments;
        
        for (let i = 0; i <= this.segments; i++) {
            const progress = i / this.segments;
            
            this.points.push({
                position: currentPos.clone(),
                width: this.startWidth + (this.endWidth - this.startWidth) * progress,
                progress: progress
            });
            
            if (i === this.segments) break;
            
            // Strong target seeking for mapping page
            if (this.target) {
                const directionToTarget = this.target.subtract(currentPos).normalize();
                const influence = this.targetInfluence * (0.4 + progress * 0.6);
                
                currentDirection.multiply(1 - influence).add(
                    directionToTarget.clone().multiply(influence)
                ).normalize();
            }
            
            // Organic deviation
            const randomAngle = (window.mappingRNG.random() - 0.5) * this.maxAngleDeviation * Math.PI / 180;
            const cos = Math.cos(randomAngle);
            const sin = Math.sin(randomAngle);
            
            const newDir = new MappingVector(
                currentDirection.x * cos - currentDirection.y * sin,
                currentDirection.x * sin + currentDirection.y * cos
            );
            
            currentDirection = newDir;
            currentPos.add(currentDirection.clone().multiply(stepLength));
        }
    }
    
    generateChildren() {
        if (this.level >= 2) return;
        
        const endWidth = this.points[this.points.length - 1]?.width || this.endWidth;
        
        // Generate fewer children for cleaner mapping visualization
        const numChildren = this.level === 0 ? 
            Math.floor(window.mappingRNG.random(1, 3)) :
            Math.floor(window.mappingRNG.random(1, 2) * this.branchProbability);
        
        for (let i = 0; i < numChildren; i++) {
            const spawnIndex = Math.floor(window.mappingRNG.random(
                this.points.length * 0.3, 
                this.points.length * 0.7
            ));
            const spawnPoint = this.points[spawnIndex];
            
            if (!spawnPoint) continue;
            
            const childLength = this.maxLength * (0.3 + window.mappingRNG.random() * 0.3);
            
            const child = new MappingBranch(
                spawnPoint.position,
                null, // Children don't target buttons, they grow organically
                {
                    level: this.level + 1,
                    maxLength: childLength,
                    branchProbability: this.branchProbability * 0.6,
                    maxAngleDeviation: this.maxAngleDeviation + 10,
                    targetInfluence: 0.3,
                    startWidth: spawnPoint.width * 0.7,
                    endWidth: Math.max(0.6, spawnPoint.width * 0.4),
                    animationDelay: this.animationDelay + spawnPoint.progress * 600 + window.mappingRNG.random(100, 300),
                    clusterName: this.clusterName
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
                path += ` L ${current.position.x.toFixed(1)} ${current.position.y.toFixed(1)}`;
            } else {
                const prev = this.points[i - 1];
                const next = i < this.points.length - 1 ? this.points[i + 1] : current;
                
                const controlX = current.position.x;
                const controlY = current.position.y;
                const endX = (current.position.x + next.position.x) / 2;
                const endY = (current.position.y + next.position.y) / 2;
                
                path += ` Q ${controlX.toFixed(1)} ${controlY.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`;
            }
        }
        
        return path;
    }
}

// Main Mapping Network System
class MappingNetwork {
    constructor() {
        this.svg = null;
        this.branches = [];
        this.isInitialized = false;
        this.isAnimating = false;
        this.animationTimeout = null;
        this.rng = new MappingRNG(Date.now() + 7777);
        window.mappingRNG = this.rng;
        
        console.log('MappingNetwork initialized');
    }
    
    createSVG() {
        // Remove any existing mapping network SVG
        const existing = document.querySelector('#mappingNetworkCanvas');
        if (existing) existing.remove();
        
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.id = 'mappingNetworkCanvas';
        
        // Fixed positioning with high z-index
        this.svg.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            z-index: 3 !important;
            pointer-events: none !important;
            margin: 0 !important;
            padding: 0 !important;
        `;
        
        const viewportWidth = window.visualViewport ? window.visualViewport.width : window.innerWidth;
        const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        
        this.svg.setAttribute('viewBox', `0 0 ${viewportWidth} ${viewportHeight}`);
        
        // Append to body for fixed positioning
        document.body.appendChild(this.svg);
        
        console.log('Mapping SVG created and appended');
        return this.svg;
    }
    
    measureClusterPositions() {
        const positions = [];
        const clusterButtons = document.querySelectorAll('.cluster-button');
        
        console.log(`Found ${clusterButtons.length} cluster buttons`);
        
        clusterButtons.forEach((button, index) => {
            const rect = button.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const clusterName = button.dataset.cluster || `cluster-${index}`;
            
            positions.push({
                x: centerX,
                y: centerY,
                name: clusterName,
                element: button
            });
            
            console.log(`Cluster "${clusterName}": ${centerX.toFixed(1)}px, ${centerY.toFixed(1)}px`);
        });
        
        return positions;
    }
    
    findPageCenter() {
        // Use center of viewport for mapping page
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        console.log(`Page center: ${centerX}px, ${centerY}px`);
        return new MappingVector(centerX, centerY);
    }
    
    generateNetwork() {
        if (this.isAnimating) {
            console.log('Animation in progress, skipping generation');
            return;
        }
        
        this.clear();
        
        if (!this.svg) {
            this.createSVG();
        }
        
        const centerPos = this.findPageCenter();
        const clusterPositions = this.measureClusterPositions();
        
        if (clusterPositions.length === 0) {
            console.warn('No cluster buttons found');
            return;
        }
        
        console.log(`Generating network from center to ${clusterPositions.length} clusters`);
        
        // Create main branches to each cluster
        clusterPositions.forEach((cluster, index) => {
            const target = new MappingVector(cluster.x, cluster.y);
            const distance = centerPos.distanceTo(target);
            
            const branch = new MappingBranch(centerPos, target, {
                level: 0,
                maxLength: distance * 0.88,
                branchProbability: 0.7,
                maxAngleDeviation: 15,
                targetInfluence: 0.82,
                startWidth: 3.5,
                endWidth: 1.5,
                animationDelay: 300 + index * 150,
                clusterName: cluster.name
            });
            
            branch.generateChildren();
            this.branches.push(branch);
        });
        
        // Add some background organic branches
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2 + window.mappingRNG.random(-0.5, 0.5);
            const length = 80 + window.mappingRNG.random(40);
            const endPoint = new MappingVector(
                centerPos.x + Math.cos(angle) * length,
                centerPos.y + Math.sin(angle) * length
            );
            
            const organicBranch = new MappingBranch(centerPos, endPoint, {
                level: 0,
                maxLength: length,
                branchProbability: 0.4,
                maxAngleDeviation: 25,
                targetInfluence: 0.3,
                startWidth: 2.5,
                endWidth: 0.8,
                animationDelay: 100 + i * 100,
                clusterName: `organic-${i}`
            });
            
            organicBranch.generateChildren();
            this.branches.push(organicBranch);
        }
        
        console.log(`Generated ${this.branches.length} main branches`);
    }
    
    animate() {
        if (this.animationTimeout) {
            clearTimeout(this.animationTimeout);
            this.animationTimeout = null;
        }
        
        console.log('Starting mapping network animation...');
        this.isAnimating = true;
        
        const allBranches = [];
        this.branches.forEach(branch => {
            allBranches.push(...branch.getAllBranches());
        });
        
        console.log(`Animating ${allBranches.length} total branches`);
        
        allBranches.forEach((branch, index) => {
            this.createAnimatedPath(branch, index);
        });
        
        const loadingEl = document.getElementById('mappingLoading');
        if (loadingEl) loadingEl.classList.add('active');
        
        const maxDelay = Math.max(...allBranches.map(b => b.animationDelay));
        this.animationTimeout = setTimeout(() => {
            this.isAnimating = false;
            if (loadingEl) loadingEl.classList.remove('active');
            console.log('Mapping network animation complete');
        }, maxDelay + 2000);
    }
    
    createAnimatedPath(branch, index) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', branch.toSVGPath());
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        
        // Color based on level
        let strokeColor, strokeWidth, opacity;
        switch (branch.level) {
            case 0:
                strokeColor = '#d4c7b0';
                strokeWidth = Math.max(1.5, branch.startWidth);
                opacity = 0.8;
                break;
            case 1:
                strokeColor = '#d4c7b0';
                strokeWidth = Math.max(1.0, branch.startWidth);
                opacity = 0.6;
                break;
            default:
                strokeColor = '#d4c7b0';
                strokeWidth = Math.max(0.8, branch.startWidth);
                opacity = 0.4;
        }
        
        path.setAttribute('stroke', strokeColor);
        path.setAttribute('stroke-width', strokeWidth.toFixed(1));
        path.setAttribute('opacity', opacity);
        
        // Animation
        const pathLength = path.getTotalLength();
        path.style.strokeDasharray = `${pathLength}`;
        path.style.strokeDashoffset = `${pathLength}`;
        path.style.animation = `drawMappingPath 2.2s ease-out forwards`;
        path.style.animationDelay = `${branch.animationDelay}ms`;
        
        this.svg.appendChild(path);
    }
    
    clear() {
        if (this.animationTimeout) {
            clearTimeout(this.animationTimeout);
            this.animationTimeout = null;
        }
        
        this.isAnimating = false;
        this.branches = [];
        
        if (this.svg) {
            this.svg.innerHTML = '';
        }
    }
    
    resize() {
        if (this.svg) {
            const viewportWidth = window.visualViewport ? window.visualViewport.width : window.innerWidth;
            const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
            this.svg.setAttribute('viewBox', `0 0 ${viewportWidth} ${viewportHeight}`);
        }
        
        // Regenerate on significant size changes
        console.log('Mapping network resize detected');
        setTimeout(() => {
            this.generateAndAnimate();
        }, 300);
    }
    
    generateAndAnimate() {
        this.generateNetwork();
        this.animate();
    }
}

// Global mapping network instance
let mappingNetwork = null;

// Initialize mapping network system
function initMappingNetwork() {
    console.log('Initializing mapping network system...');
    
    if (mappingNetwork) {
        mappingNetwork.clear();
    }
    
    mappingNetwork = new MappingNetwork();
    
    // Add CSS animation if not already present
    if (!document.getElementById('mapping-network-styles')) {
        const styles = document.createElement('style');
        styles.id = 'mapping-network-styles';
        styles.textContent = `
            @keyframes drawMappingPath {
                to {
                    stroke-dashoffset: 0;
                }
            }
        `;
        document.head.appendChild(styles);
    }
    
    // Wait for cluster buttons to be positioned
    setTimeout(() => {
        if (mappingNetwork) {
            mappingNetwork.generateAndAnimate();
        }
    }, 800);
    
    // Handle resize with debouncing
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (mappingNetwork) {
                mappingNetwork.resize();
            }
        }, 300);
    });
}

// Click handler for regenerating network
function regenerateMappingNetwork() {
    if (mappingNetwork && !mappingNetwork.isAnimating) {
        console.log('Regenerating mapping network...');
        mappingNetwork.rng = new MappingRNG(Date.now() + Math.random() * 1000);
        window.mappingRNG = mappingNetwork.rng;
        mappingNetwork.generateAndAnimate();
    }
}

// Export functions for global access
window.initMappingNetwork = initMappingNetwork;
window.regenerateMappingNetwork = regenerateMappingNetwork;

console.log('Mapping network system loaded');