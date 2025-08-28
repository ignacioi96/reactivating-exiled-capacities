/**
 * Simplified In-Page Mycelium Generator
 * Based on working 2D mycelium approach - clean and simple
 */

// Seeded random number generator
class MyceliumRNG {
    constructor(seed) {
        this.seed = seed;
    }
    
    random(max = 1, min = 0) {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        const val = this.seed / 233280;
        return min + val * (max - min);
    }
}

// Simple 2D Vector class
class Vec2D {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    
    clone() {
        return new Vec2D(this.x, this.y);
    }
    
    add(other) {
        this.x += other.x;
        this.y += other.y;
        return this;
    }
    
    subtract(other) {
        return new Vec2D(this.x - other.x, this.y - other.y);
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

// Simple In-Page Mycelium Branch (based on working 2D approach)
class InPageBranch {
    constructor(start, target, options = {}) {
        this.start = start.clone();
        this.target = target ? target.clone() : null;
        this.points = [];
        this.children = [];
        this.rng = options.rng;
        
        // Branch properties - keeping it simple like working example
        this.level = options.level || 0;
        this.maxLength = options.maxLength || (target ? start.distanceTo(target) * 0.9 : 120);
        this.segments = options.segments || Math.max(15, Math.floor(this.maxLength / 12));
        this.branchProbability = options.branchProbability || 0.75;
        this.maxAngleDeviation = options.maxAngleDeviation || 25; // degrees
        this.targetInfluence = options.targetInfluence || 0.7;
        this.startWidth = options.startWidth || 3;
        this.endWidth = options.endWidth || 0.8;
        this.animationDelay = options.animationDelay || 0;
        
        // Generate the branch path
        this.generatePath();
    }

    createTaperedPath(branch, index) {
    const mainPoints = branch.points.filter(p => !p.isTaper);
    const taperPoints = branch.points.filter(p => p.isTaper);
    
    if (taperPoints.length === 0) {
        // No taper, use regular path
        return this.createAnimatedPath(branch, index);
    }
    
    // Create main body path (everything except taper)
    const mainPath = this.createMainBodyPath(branch, mainPoints);
    this.svg.appendChild(mainPath);
    
    // Create ultra-thin taper path
    if (taperPoints.length > 0) {
        const taperPath = this.createTaperPath(branch, [...mainPoints.slice(-1), ...taperPoints]);
        this.svg.appendChild(taperPath);
    }
}
    
    generateTaperPoints() {
    if (this.points.length < 2) return [];
    
    const lastPoint = this.points[this.points.length - 1];
    const secondLastPoint = this.points[this.points.length - 2];
    
    const direction = lastPoint.position.subtract(secondLastPoint.position).normalize();
    
    const taperPoints = [];
    const numTaperPoints = 4;
    const taperLength = 10 + this.rng.random() * 8;
    
    for (let i = 1; i <= numTaperPoints; i++) {
        const progress = i / numTaperPoints;
        const stepLength = (taperLength / numTaperPoints) * (1 - progress * 0.2);
        
        const curvature = (this.rng.random() - 0.5) * 0.2;
        const curvedDirection = new Vec2D(
            direction.x + curvature * direction.y,
            direction.y - curvature * direction.x
        ).normalize();
        
        const newPosition = lastPoint.position.clone().add(
            curvedDirection.clone().multiply(stepLength * i)
        );
        
        // ULTRA-THIN TAPER: Goes from last point width to nearly zero
        const startWidth = lastPoint.width;
        const taperWidth = startWidth * (1 - Math.pow(progress, 2.2)); // Aggressive taper curve
        
        taperPoints.push({
            position: newPosition,
            width: Math.max(0.05, taperWidth), // Nearly invisible at the tip
            progress: 1 + progress * 0.1,
            isTaper: true
        });
    }
    
    return taperPoints;
}

    // Simple path generation like working 2D example
    generatePath() {
    this.points = [];
    let currentPos = this.start.clone();
    let currentDirection = this.target ? 
        this.target.subtract(this.start).normalize() :
        new Vec2D(this.rng.random(-1, 1), this.rng.random(-1, 1)).normalize();
    
    const stepLength = this.maxLength / this.segments;
    
    for (let i = 0; i <= this.segments; i++) {
        const progress = i / this.segments;
        
        // NATURAL ORGANIC TAPERING: Variable thickness with organic fluctuations
        let baseThickness = this.startWidth * (1 - progress * 0.7); // Gradual taper
        
        // Add organic thickness variation (roots aren't perfectly smooth)
        const organicVariation = (this.rng.random() - 0.5) * 0.3 * this.startWidth * (1 - progress);
        baseThickness += organicVariation;
        
        // Natural thinning toward tip (no forced minimum)
        const finalThickness = Math.max(0.1, baseThickness * (0.3 + progress * 0.7));
        
        this.points.push({
            position: currentPos.clone(),
            width: Math.max(0.1, finalThickness),
            progress: progress
        });
        
        if (i === this.segments) break;
            
            // Target-seeking behavior like working example
            if (this.target) {
                const directionToTarget = this.target.subtract(currentPos).normalize();
                const influence = this.targetInfluence * (0.3 + progress * 0.7); // Stronger near end
                
                // Blend current direction with target direction
                currentDirection.multiply(1 - influence).add(
                    directionToTarget.clone().multiply(influence)
                ).normalize();
            }
            
            // Add organic randomness
            const randomAngle = (this.rng.random() - 0.5) * this.maxAngleDeviation * Math.PI / 180;
            const cos = Math.cos(randomAngle);
            const sin = Math.sin(randomAngle);
            
            const newDir = new Vec2D(
                currentDirection.x * cos - currentDirection.y * sin,
                currentDirection.x * sin + currentDirection.y * cos
            );
            
            currentDirection = newDir;
            currentPos.add(currentDirection.clone().multiply(stepLength));
        }
    }
    
    // Progressive subdivision with directional inheritance and better distributed root branching
    generateChildren() {
        const endWidth = this.points[this.points.length - 1]?.width || this.endWidth;
        const avgWidth = this.getAverageWidth();
        
        // Continue subdividing until really thin or max levels
        if ((endWidth < 0.3 && avgWidth < 0.5) || this.level >= 4) return;
        
        // Calculate parent's overall growth direction for inheritance
        const parentDirection = this.getOverallDirection();
        
        // SPECIAL HANDLING FOR ROOT BRANCHES: Better distribution
        if (this.level === 0) {
            this.generateDistributedRootBranches(parentDirection);
            return;
        }
        
        // Regular child generation for non-root branches
        let numChildren;
        if (endWidth > 1.5 || avgWidth > 1.8) {
            numChildren = Math.floor(this.rng.random(3, 5)); // Thick: many children
        } else if (endWidth > 0.8 || avgWidth > 1.0) {
            numChildren = Math.floor(this.rng.random(2, 4)); // Medium: moderate children
        } else {
            numChildren = Math.floor(this.rng.random(1, 3)); // Thin: fewer children
        }
        
        // Apply branching probability
        numChildren = Math.floor(numChildren * this.branchProbability);
        
        // Force at least one child for thick branches
        if ((endWidth > 1.0 || avgWidth > 1.2) && numChildren < 1) {
            numChildren = 1;
        }
        
        for (let i = 0; i < numChildren; i++) {
            // Pick spawn point along branch (favor later parts for thick branches)
            const spawnStart = endWidth > 1.0 ? 0.5 : 0.3;
            const spawnEnd = endWidth > 1.0 ? 0.9 : 0.8;
            
            const spawnIndex = Math.floor(this.rng.random(
                this.points.length * spawnStart,
                this.points.length * spawnEnd
            ));
            const spawnPoint = this.points[spawnIndex];
            
            if (!spawnPoint) continue;
            
            // DIRECTIONAL INHERITANCE: Create child target that follows parent flow
            const childTarget = this.createDirectionalTarget(spawnPoint, parentDirection);
            const childLength = spawnPoint.position.distanceTo(childTarget);
            
            // Ensure children get progressively thinner
            const childStartWidth = spawnPoint.width * 0.75;
            const childEndWidth = Math.max(0.2, childStartWidth * 0.4);
            
            const child = new InPageBranch(
                spawnPoint.position,
                childTarget, // Give child a directional target
                {
                    level: this.level + 1,
                    maxLength: childLength,
                    segments: Math.max(8, this.segments - 4),
                    branchProbability: this.branchProbability * 0.85,
                    maxAngleDeviation: Math.max(15, this.maxAngleDeviation - 5), // Less deviation to maintain flow
                    targetInfluence: 0.6, // Moderate influence to maintain direction
                    startWidth: childStartWidth,
                    endWidth: childEndWidth,
                    animationDelay: this.animationDelay + spawnPoint.progress * 800 + this.rng.random(200, 500),
                    rng: this.rng
                }
            );
            
            child.generateChildren();
            this.children.push(child);
        }
    }
    
    // Better distributed branching for root branches
    generateDistributedRootBranches(parentDirection) {
        // Generate branches throughout the root's length, not just at tip
        const totalBranches = 3 + Math.floor(this.rng.random() * 3); // 3-5 branches total
        
        console.log(`Root branch generating ${totalBranches} distributed branches`);
        
        for (let i = 0; i < totalBranches; i++) {
            // BETTER DISTRIBUTION: Spawn from 30% to 90% along root (not just tip)
            const spawnProgress = 0.3 + (i / (totalBranches - 1)) * 0.6; // Evenly distribute from 30% to 90%
            const spawnIndex = Math.floor(spawnProgress * (this.points.length - 1));
            const spawnPoint = this.points[Math.min(spawnIndex, this.points.length - 1)];
            
            if (!spawnPoint) continue;
            
            // Create directional target
            const childTarget = this.createDirectionalTarget(spawnPoint, parentDirection, false);
            const childLength = spawnPoint.position.distanceTo(childTarget);
            
            // Branch thickness based on spawn position (thicker for earlier branches)
            const thicknessFactor = 1 - spawnProgress * 0.2; // Earlier branches are thicker
            const childStartWidth = spawnPoint.width * 0.85 * thicknessFactor;
            const childEndWidth = Math.max(0.3, childStartWidth * 0.4);
            
            const distributedBranch = new InPageBranch(
                spawnPoint.position,
                childTarget,
                {
                    level: this.level + 1,
                    maxLength: childLength,
                    segments: Math.max(10, Math.floor(childLength / 12)),
                    branchProbability: this.branchProbability * 0.9,
                    maxAngleDeviation: 25, // Allow good spread
                    targetInfluence: 0.65,
                    startWidth: childStartWidth,
                    endWidth: childEndWidth,
                    animationDelay: this.animationDelay + spawnProgress * 800 + i * 100,
                    rng: this.rng
                }
            );
            
            distributedBranch.generateChildren();
            this.children.push(distributedBranch);
        }
    }
    
    // Calculate the overall growth direction of this branch
    getOverallDirection() {
        if (this.points.length < 2) {
            return new Vec2D(1, 0); // Default direction
        }
        
        // Use direction from start to end as the overall flow
        const start = this.points[0].position;
        const end = this.points[this.points.length - 1].position;
        return end.subtract(start).normalize();
    }
    
    // Create a target for child branch that maintains directional flow
    createDirectionalTarget(spawnPoint, parentDirection, isTipBranch = false) {
        // Maximum deviation from parent direction (in radians)
        let maxDeviationAngle;
        
        if (isTipBranch) {
            // Tip branches can spread wider for better coverage
            maxDeviationAngle = Math.PI / 2.5; // ~72 degrees max deviation for tips
        } else {
            // Regular branches stay closer to parent direction
            maxDeviationAngle = Math.PI / 3; // 60 degrees max deviation
        }
        
        // Random deviation within allowed range
        const deviationAngle = (this.rng.random() - 0.5) * maxDeviationAngle;
        
        // Rotate parent direction by deviation angle
        const cos = Math.cos(deviationAngle);
        const sin = Math.sin(deviationAngle);
        const childDirection = new Vec2D(
            parentDirection.x * cos - parentDirection.y * sin,
            parentDirection.x * sin + parentDirection.y * cos
        );
        
        // Child length based on level and whether it's a tip branch
        let childLength;
        if (isTipBranch) {
            // Tip branches can be longer for better spread
            childLength = (80 + this.rng.random() * 100) * (1 - this.level * 0.15);
        } else {
            // Regular child branches
            childLength = (60 + this.rng.random() * 80) * (1 - this.level * 0.2);
        }
        
        // Calculate target position
        const targetX = spawnPoint.position.x + childDirection.x * childLength;
        const targetY = spawnPoint.position.y + childDirection.y * childLength;
        
        return new Vec2D(targetX, targetY);
    }
    
    getAllBranches() {
        const branches = [this];
        for (const child of this.children) {
            branches.push(...child.getAllBranches());
        }
        return branches;
    }
    
    getAverageWidth() {
        if (this.points.length === 0) return this.startWidth;
        const totalWidth = this.points.reduce((sum, point) => sum + point.width, 0);
        return totalWidth / this.points.length;
    }
    
    // Clean SVG path generation like working example
    toSVGPath() {
    if (this.points.length < 2) return '';
    
    // Skip taper points for now - let natural tapering handle it
    let path = `M ${this.points[0].position.x.toFixed(1)} ${this.points[0].position.y.toFixed(1)}`;
    
    // Create more organic curves
    for (let i = 1; i < this.points.length; i++) {
        const current = this.points[i];
        
        if (i === this.points.length - 1) {
            // Natural tip - just draw to end point
            path += ` L ${current.position.x.toFixed(1)} ${current.position.y.toFixed(1)}`;
        } else {
            // Smoother, more organic curves
            const next = this.points[i + 1];
            const midX = (current.position.x + next.position.x) / 2;
            const midY = (current.position.y + next.position.y) / 2;
            
            path += ` Q ${current.position.x.toFixed(1)} ${current.position.y.toFixed(1)} ${midX.toFixed(1)} ${midY.toFixed(1)}`;
        }
    }
    
    return path;
}
}

class InPageMyceliumGenerator {
    constructor() {
        this.pageContainer = null;
        this.myceliumContainer = null;
        this.svg = null;
        this.networks = [];
        this.isInitialized = false;
        this.rng = new MyceliumRNG(Date.now() + 12345);
        
        this.config = {
            density: 1.0,
            complexity: 0.8,
            maxBranches: 2, // Limit to 2 mycelium networks per page
            baseStrokeWidth: 2.5,
            colors: {
                primary: '#cfc5af',
                secondary: '#cfc5af', 
                accent: '#cfc5af',
                subtle: '#cfc5af'
            },
            animations: {
                enabled: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
                duration: 4000,
                stagger: 150
            }
        };
        
        console.log('InPageMyceliumGenerator: Simplified approach initialized');
        this.init();
    }
    
    init() {
        if (!this.shouldRunOnThisPage()) {
            return;
        }
        
        this.waitForPageContainer().then(() => {
            console.log('InPageMyceliumGenerator: Page container ready');
            
            this.adaptToScreenSize();
            this.createMyceliumContainer();
            this.createSVG();
            this.ensureTextAboveMycelium();
            this.detectContentType();
            
            setTimeout(() => {
                this.generateNetworks();
            }, 500);
            
            this.bindEvents();
            this.isInitialized = true;
        });
    }
    
    shouldRunOnThisPage() {
        if (document.querySelector('.splash-layout, .home-layout')) {
            return false;
        }
        return true;
    }
    
    async waitForPageContainer() {
        return new Promise((resolve) => {
            const checkForContainer = () => {
                this.pageContainer = document.querySelector('.page-container');
                if (this.pageContainer) {
                    resolve();
                } else {
                    setTimeout(checkForContainer, 100);
                }
            };
            checkForContainer();
        });
    }
    
    adaptToScreenSize() {
        const screenWidth = window.innerWidth;
        
        if (screenWidth > 1200) {
            this.config.maxBranches = 2; // Keep to 2 networks
            this.config.baseStrokeWidth = 3.0;
        } else if (screenWidth > 768) {
            this.config.maxBranches = 2; // Keep to 2 networks
            this.config.baseStrokeWidth = 2.5;
        } else {
            this.config.maxBranches = 2; // Keep to 2 networks
            this.config.baseStrokeWidth = 2.0;
        }
    }
    
    createMyceliumContainer() {
        this.myceliumContainer = document.createElement('div');
        this.myceliumContainer.className = 'in-page-mycelium-container';
        this.myceliumContainer.id = 'inPageMyceliumContainer';
        
        this.pageContainer.insertBefore(this.myceliumContainer, this.pageContainer.firstChild);
    }
    
    createSVG() {
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.id = 'inPageMyceliumCanvas';
        this.svg.classList.add('in-page-mycelium-svg');
        
        const rect = this.pageContainer.getBoundingClientRect();
        this.svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
        
        this.myceliumContainer.appendChild(this.svg);
    }
    
    ensureTextAboveMycelium() {
        const textElements = this.pageContainer.querySelectorAll('h1, h2, h3, h4, h5, h6, p, .content-wrapper, .page-content');
        textElements.forEach(el => {
            el.style.position = 'relative';
            el.style.zIndex = '2';
        });
    }
    
    detectContentType() {
    const content = this.pageContainer.querySelector('.page-content, .content-wrapper');
    if (!content) return;
    
    const contentHeight = content.scrollHeight;
    const containerHeight = this.pageContainer.offsetHeight;
    const ratio = contentHeight / containerHeight;
    
    // Scale network count based on content length
    if (ratio > 3) {
        // Very long content - 4-5 networks
        this.config.maxBranches = Math.floor(4 + this.rng.random() * 2);
        this.pageContainer.classList.add('very-long-content');
        this.config.complexity *= 0.7; // Less complex but more networks
    } else if (ratio > 2) {
        // Long content - 3-4 networks  
        this.config.maxBranches = Math.floor(3 + this.rng.random() * 2);
        this.pageContainer.classList.add('long-content');
        this.config.complexity *= 0.8;
    } else if (ratio > 1.5) {
        // Medium content - 2-3 networks
        this.config.maxBranches = Math.floor(2 + this.rng.random() * 2);
        this.pageContainer.classList.add('medium-content');
    } else if (ratio < 1.2) {
        // Short content - 2 networks
        this.config.maxBranches = 2;
        this.pageContainer.classList.add('short-content');
        this.config.complexity *= 1.1;
    } else {
        // Default content - 2-3 networks
        this.config.maxBranches = Math.floor(2 + this.rng.random() * 2);
    }
    
    console.log(`Content ratio: ${ratio.toFixed(2)}, Networks: ${this.config.maxBranches}`);
}

    
    generateNetworks() {
        const rect = this.pageContainer.getBoundingClientRect();
        const numNetworks = Math.floor(this.config.maxBranches * this.config.density);
        console.log(`Generating ${numNetworks} edge-to-inward networks`);
        
        // Generate edge starting points with inward targets
        const startingPoints = this.generateEdgeToInwardPoints(numNetworks, rect.width, rect.height);
        
        for (let i = 0; i < numNetworks; i++) {
            const point = startingPoints[i];
            
            setTimeout(() => {
                this.createEdgeToInwardNetwork(i, point, rect);
            }, i * this.config.animations.stagger);
        }
        
        setTimeout(() => {
            this.myceliumContainer.classList.add('loaded');
            console.log('All edge-to-inward networks generated');
        }, numNetworks * this.config.animations.stagger + 2000);
    }

    
    // Generate edge starting points that grow inward with good distribution
    generateEdgeToInwardPoints(count, width, height) {
    const points = [];
    const margin = 40;
    
    // Force distribution across all 4 edges for better coverage
    const edgeAssignments = [];
    
    // Ensure each edge gets at least one network if we have 4+ networks
    if (count >= 4) {
        edgeAssignments.push(0, 1, 2, 3); // Force one per edge
        // Fill remaining with random distribution
        for (let i = 4; i < count; i++) {
            edgeAssignments.push(Math.floor(this.rng.random() * 4));
        }
    } else {
        // For fewer networks, random distribution
        for (let i = 0; i < count; i++) {
            edgeAssignments.push(Math.floor(this.rng.random() * 4));
        }
    }
    
    // Shuffle for organic distribution
    for (let i = edgeAssignments.length - 1; i > 0; i--) {
        const j = Math.floor(this.rng.random() * (i + 1));
        [edgeAssignments[i], edgeAssignments[j]] = [edgeAssignments[j], edgeAssignments[i]];
    }
    
    for (let i = 0; i < count; i++) {
        const edge = edgeAssignments[i];
        let startX, startY, targetX, targetY;
        
        // Position based on assigned edge (0=right, 1=bottom, 2=left, 3=top)
        switch (edge) {
            case 0: // Right edge
                startX = width + margin + this.rng.random() * 20;
                startY = this.rng.random(0.2 * height, 0.8 * height);
                targetX = width * (0.4 + this.rng.random() * 0.4);
                targetY = startY + (this.rng.random() - 0.5) * 100;
                break;
                
            case 1: // Bottom edge
                startX = this.rng.random(0.2 * width, 0.8 * width);
                startY = height + margin + this.rng.random() * 20;
                targetX = startX + (this.rng.random() - 0.5) * 100;
                targetY = height * (0.4 + this.rng.random() * 0.4);
                break;
                
            case 2: // Left edge
                startX = -margin - this.rng.random() * 20;
                startY = this.rng.random(0.2 * height, 0.8 * height);
                targetX = width * (0.2 + this.rng.random() * 0.4);
                targetY = startY + (this.rng.random() - 0.5) * 100;
                break;
                
            case 3: // Top edge
                startX = this.rng.random(0.2 * width, 0.8 * width);
                startY = -margin - this.rng.random() * 20;
                targetX = startX + (this.rng.random() - 0.5) * 100;
                targetY = height * (0.2 + this.rng.random() * 0.4);
                break;
        }
        
        // Keep targets within bounds
        targetX = Math.max(30, Math.min(width - 30, targetX));
        targetY = Math.max(30, Math.min(height - 30, targetY));
        
        points.push({
            start: new Vec2D(startX, startY),
            target: new Vec2D(targetX, targetY),
            edge: edge
        });
        
        console.log(`Network ${i}: ${['right', 'bottom', 'left', 'top'][edge]} edge`);
    }
    
    return points;
}
    
    createEdgeToInwardNetwork(index, point, containerRect) {
        const distance = point.start.distanceTo(point.target);
        
        // SHORTEN ROOT LENGTH: Use only 60-70% of distance instead of 90%
        const rootLength = distance * (0.6 + this.rng.random() * 0.1); // 60-70% of distance
        
        // Create main branch
        const branch = new InPageBranch(
            point.start,
            point.target,
            {
                level: 0,
                maxLength: rootLength, // Shorter roots
                segments: Math.max(12, Math.floor(rootLength / 15)), // Adjust segments for shorter length
                branchProbability: this.config.complexity,
                maxAngleDeviation: 20,
                targetInfluence: 0.75, // Strong inward pull
                startWidth: this.config.baseStrokeWidth,
                endWidth: this.config.baseStrokeWidth * 0.3,
                animationDelay: 100 + index * 200,
                rng: this.rng
            }
        );
        
        branch.generateChildren();
        
        const rootBranch = [branch]; // Just the root
        const childBranches = branch.children.length > 0 ? 
            branch.children.flatMap(child => child.getAllBranches()) : [];

        // Render root first (thick, early animation)
        rootBranch.forEach((subBranch, branchIndex) => {
            this.createAnimatedPath(subBranch, index * 100 + branchIndex);
        });

        // Render children after (thin, later animation) 
        childBranches.forEach((subBranch, branchIndex) => {
            this.createAnimatedPath(subBranch, index * 100 + rootBranch.length + branchIndex);
        });
        this.networks.push(branch);
    }
    
    createAnimatedPath(branch, index) {
    // Check if this branch has taper points
    const hasTaper = branch.points.some(p => p.isTaper);
    
    // Create main path (body of the branch)
    const mainPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    mainPath.setAttribute('d', branch.toSVGPath());
    mainPath.setAttribute('fill', 'none');
    mainPath.setAttribute('stroke-linecap', 'round'); // Keep round for main body
    mainPath.setAttribute('stroke-linejoin', 'round');
    
    // Color and width based on level (main body width)
    let strokeColor, strokeWidth;
    switch (branch.level) {
        case 0:
            strokeColor = this.config.colors.primary;
            strokeWidth = branch.getAverageWidth();
            break;
        case 1:
            strokeColor = this.config.colors.secondary;
            strokeWidth = branch.getAverageWidth();
            break;
        case 2:
            strokeColor = this.config.colors.accent;
            strokeWidth = branch.getAverageWidth();
            break;
        default:
            strokeColor = this.config.colors.subtle;
            strokeWidth = branch.getAverageWidth();
    }
    
    mainPath.setAttribute('stroke', strokeColor);
    mainPath.setAttribute('stroke-width', Math.max(0.5, strokeWidth).toFixed(1));
    mainPath.setAttribute('opacity', Math.max(0.6, 1 - branch.level * 0.15));
    
    // Animation for main path
    const pathLength = mainPath.getTotalLength();
    mainPath.style.strokeDasharray = `${pathLength}`;
    mainPath.style.strokeDashoffset = `${pathLength}`;
    mainPath.style.animation = `drawNetworkPath 2s ease-out forwards`;
    mainPath.style.animationDelay = `${branch.animationDelay}ms`;
    
    this.svg.appendChild(mainPath);
}
    
    bindEvents() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 300);
        });
    }
    
    handleResize() {
        if (!this.isInitialized || !this.pageContainer) return;
        
        const rect = this.pageContainer.getBoundingClientRect();
        this.svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
        this.adaptToScreenSize();
        this.regenerate();
    }
    
    regenerate() {
        this.cleanup();
        this.rng = new MyceliumRNG(Date.now() + 12345);
        setTimeout(() => {
            this.generateNetworks();
        }, 200);
    }
    
    cleanup() {
        this.networks = [];
        if (this.svg) {
            this.svg.innerHTML = '';
        }
    }
    
    // Control functions
    setBaseStrokeWidth(newWidth) {
        this.config.baseStrokeWidth = newWidth;
        if (this.isInitialized) {
            this.regenerate();
        }
    }
    
    setBranchDensity(density) {
        this.config.maxBranches = Math.max(2, Math.min(8, Math.floor(density)));
        if (this.isInitialized) {
            this.regenerate();
        }
    }
    
    setComplexity(complexity) {
        this.config.complexity = Math.max(0.3, Math.min(1.0, complexity));
        if (this.isInitialized) {
            this.regenerate();
        }
    }
}

// Add required CSS animation
if (!document.getElementById('simplified-mycelium-styles')) {
    const styles = document.createElement('style');
    styles.id = 'simplified-mycelium-styles';
    styles.textContent = `
        @keyframes drawNetworkPath {
            to {
                stroke-dashoffset: 0;
            }
        }
    `;
    document.head.appendChild(styles);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Simplified InPageMyceliumGenerator: DOM ready');
    
    setTimeout(() => {
        try {
            window.inPageMycelium = new InPageMyceliumGenerator();
        } catch (error) {
            console.error('Simplified InPageMyceliumGenerator: Failed to initialize:', error);
        }
    }, 200);
});

// Control functions
window.setMyceliumStrokeWidth = function(width) {
    if (window.inPageMycelium && typeof width === 'number' && width > 0) {
        window.inPageMycelium.setBaseStrokeWidth(width);
        console.log(`Simplified mycelium: Base stroke width set to ${width}`);
    } else {
        console.log('Usage: setMyceliumStrokeWidth(2.5) - recommended range 1.5-4.0');
    }
};

window.setMyceliumDensity = function(density) {
    if (window.inPageMycelium && typeof density === 'number') {
        window.inPageMycelium.setBranchDensity(density);
        console.log(`Simplified mycelium: Branch density set to ${density}`);
    } else {
        console.log('Usage: setMyceliumDensity(4) - recommended range 3-6');
    }
};

window.setMyceliumComplexity = function(complexity) {
    if (window.inPageMycelium && typeof complexity === 'number') {
        window.inPageMycelium.setComplexity(complexity);
        console.log(`Simplified mycelium: Complexity set to ${complexity}`);
    } else {
        console.log('Usage: setMyceliumComplexity(0.8) - range 0.3-1.0');
    }
};

window.debugInPageMycelium = function() {
    console.log('Simplified InPageMyceliumGenerator: Status report');
    if (window.inPageMycelium) {
        const config = window.inPageMycelium.config;
        console.log('Current settings:', {
            baseStrokeWidth: config.baseStrokeWidth,
            maxBranches: config.maxBranches,
            complexity: config.complexity,
            density: config.density
        });
        console.log('Networks generated:', window.inPageMycelium.networks.length);
        console.log('SVG paths:', document.querySelectorAll('#inPageMyceliumCanvas path').length);
    } else {
        console.log('Creating new simplified mycelium instance...');
        window.inPageMycelium = new InPageMyceliumGenerator();
    }
};