// ============================================
// UTILITY CLASSES
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

// ============================================
// MYCELIUM BRANCH CLASSES
// ============================================

// Standard mycelium branch class for radial growth
class MyceliumBranch {
    constructor(origin, direction, length, radius, level, sections = 8, startTime = 0, parent = null) {
        this.origin = origin.clone();
        this.direction = direction.clone().normalize();
        this.length = length;
        this.radius = radius;
        this.level = level;
        this.sections = sections;
        this.segments = 6;
        this.children = [];
        this.parent = parent;
        
        // Animation timing
        this.startTime = startTime;
        this.growthDuration = 1.2 + Math.random() * 0.8;
        this.endTime = this.startTime + this.growthDuration;
        
        // Calculate branch path
        this.calculatePath();
    }

    calculatePath() {
        this.path = [];
        let currentPos = this.origin.clone();
        let currentDir = this.direction.clone();
        
        const totalSections = this.sections + 3;
        
        for (let i = 0; i <= totalSections; i++) {
            const t = i / totalSections;
            const branchT = Math.min(t * (totalSections / this.sections), 1);
            
            let sectionRadius = this.radius;
            
            if (i <= this.sections) {
                sectionRadius = this.radius * (1 - branchT * 0.3);
            } else {
                const tipT = (i - this.sections) / 3;
                const baseTipRadius = this.radius * 0.7;
                sectionRadius = baseTipRadius * (1 - tipT * tipT);
            }
            
            this.path.push({
                position: currentPos.clone(),
                direction: currentDir.clone(),
                radius: sectionRadius,
                t: t
            });
            
            let stepLength;
            if (i <= this.sections) {
                stepLength = this.length / this.sections;
            } else {
                stepLength = (this.length / this.sections) * 0.4;
            }
            
            currentPos.addScaledVector(currentDir, stepLength);
            
            if (i < this.sections) {
                // Add organic curves and slight randomness
                const randomness = 0.15;
                currentDir.x += window.myceliumRNG.random(randomness, -randomness);
                currentDir.y += window.myceliumRNG.random(randomness, -randomness);
                currentDir.z += window.myceliumRNG.random(randomness, -randomness);
                currentDir.normalize();
            }
        }
    }

    generateGeometry() {
        this.vertices = [];
        this.normals = [];
        this.indices = [];
        this.uvs = [];
        this.colors = [];
        
        const totalSections = this.path.length - 1;
        
        // Generate vertices for each section
        for (let i = 0; i < this.path.length; i++) {
            const section = this.path[i];
            
            for (let j = 0; j < this.segments; j++) {
                const angle = (j / this.segments) * Math.PI * 2;
                
                const up = Math.abs(section.direction.y) > 0.9 ? 
                    new THREE.Vector3(1, 0, 0) : 
                    new THREE.Vector3(0, 1, 0);
                const right = new THREE.Vector3().crossVectors(section.direction, up).normalize();
                const forward = new THREE.Vector3().crossVectors(right, section.direction).normalize();
                
                const localPos = new THREE.Vector3(
                    Math.cos(angle) * section.radius,
                    Math.sin(angle) * section.radius,
                    0
                );
                
                const vertex = new THREE.Vector3()
                    .addScaledVector(right, localPos.x)
                    .addScaledVector(forward, localPos.y)
                    .add(section.position);
                
                let normal;
                if (i <= this.sections) {
                    normal = new THREE.Vector3()
                        .addScaledVector(right, Math.cos(angle))
                        .addScaledVector(forward, Math.sin(angle))
                        .normalize();
                } else {
                    const tipT = (i - this.sections) / 3;
                    const radialNormal = new THREE.Vector3()
                        .addScaledVector(right, Math.cos(angle))
                        .addScaledVector(forward, Math.sin(angle));
                    normal = radialNormal.multiplyScalar(1 - tipT)
                        .add(section.direction.clone().multiplyScalar(tipT)).normalize();
                }
                
                this.vertices.push(vertex.x, vertex.y, vertex.z);
                this.normals.push(normal.x, normal.y, normal.z);
                this.uvs.push(j / this.segments, section.t);
                
                // Color intensity based on level and position
                const colorIntensity = Math.max(0.4, 1 - this.level * 0.12);
                const warmth = 0.1 + this.level * 0.05;
                this.colors.push(
                    colorIntensity + warmth, 
                    colorIntensity, 
                    colorIntensity - warmth * 0.5
                );
            }
        }
        
        // Generate indices
        for (let i = 0; i < totalSections; i++) {
            for (let j = 0; j < this.segments; j++) {
                const current = i * this.segments + j;
                const next = i * this.segments + (j + 1) % this.segments;
                const currentNext = (i + 1) * this.segments + j;
                const nextNext = (i + 1) * this.segments + (j + 1) % this.segments;
                
                this.indices.push(current, currentNext, next);
                this.indices.push(next, currentNext, nextNext);
            }
        }
        
        // Add tip closure
        this.addTipClosure(totalSections);
    }

    addTipClosure(totalSections) {
        const tipCenter = this.vertices.length / 3;
        const lastSection = this.path[this.path.length - 1];
        
        this.vertices.push(lastSection.position.x, lastSection.position.y, lastSection.position.z);
        this.normals.push(lastSection.direction.x, lastSection.direction.y, lastSection.direction.z);
        this.uvs.push(0.5, 1.0);
        
        const colorIntensity = Math.max(0.4, 1 - this.level * 0.12);
        const warmth = 0.1 + this.level * 0.05;
        this.colors.push(
            colorIntensity + warmth, 
            colorIntensity, 
            colorIntensity - warmth * 0.5
        );
        
        // Connect last ring to tip
        for (let j = 0; j < this.segments; j++) {
            const current = totalSections * this.segments + j;
            const next = totalSections * this.segments + (j + 1) % this.segments;
            
            this.indices.push(current, tipCenter, next);
        }
    }
}

// Targeted mycelium branch class that grows toward specific positions
class TargetedMyceliumBranch extends MyceliumBranch {
    constructor(origin, direction, length, radius, level, sections = 8, startTime = 0, parent = null, target = null, targetInfluence = 0.5) {
        super(origin, direction, length, radius, level, sections, startTime, parent);
        this.target = target;
        this.targetInfluence = targetInfluence; // How strongly to pull toward target (0-1)
        
        // Recalculate path with target influence
        if (this.target) {
            this.calculateTargetedPath();
        }
    }

    calculateTargetedPath() {
        this.path = [];
        let currentPos = this.origin.clone();
        let currentDir = this.direction.clone();
        
        const totalSections = this.sections + 3;
        
        // Calculate total distance to target for progress tracking
        const totalDistanceToTarget = this.origin.distanceTo(this.target);
        
        for (let i = 0; i <= totalSections; i++) {
            const t = i / totalSections;
            const branchT = Math.min(t * (totalSections / this.sections), 1);
            
            let sectionRadius = this.radius;
            
            if (i <= this.sections) {
                sectionRadius = this.radius * (1 - branchT * 0.3);
            } else {
                const tipT = (i - this.sections) / 3;
                const baseTipRadius = this.radius * 0.7;
                sectionRadius = baseTipRadius * (1 - tipT * tipT);
            }
            
            this.path.push({
                position: currentPos.clone(),
                direction: currentDir.clone(),
                radius: sectionRadius,
                t: t
            });
            
            let stepLength;
            if (i <= this.sections) {
                stepLength = this.length / this.sections;
            } else {
                stepLength = (this.length / this.sections) * 0.4;
            }
            
            currentPos.addScaledVector(currentDir, stepLength);
            
            if (i < this.sections && this.target) {
                // Calculate current distance to target
                const currentDistanceToTarget = currentPos.distanceTo(this.target);
                
                // Target direction
                const targetDirection = new THREE.Vector3()
                    .subVectors(this.target, currentPos)
                    .normalize();
                
                // Progressive targeting - stronger influence as we progress
                let influence = this.targetInfluence;
                
                // Increase influence based on progress through the branch
                const progressInfluence = t * 1.5;
                influence = Math.min(1.0, influence * progressInfluence);
                
                // Even stronger influence if we're getting close to target
                if (currentDistanceToTarget < totalDistanceToTarget * 0.3) {
                    influence = Math.min(1.0, influence * 1.5);
                }
                
                // Blend current direction with target direction
                currentDir.multiplyScalar(1 - influence)
                    .add(targetDirection.multiplyScalar(influence))
                    .normalize();
                
                // Minimal randomness to maintain organic feel
                const randomness = 0.04 * (1 - influence);
                if (randomness > 0) {
                    currentDir.x += window.myceliumRNG.random(randomness, -randomness);
                    currentDir.y += window.myceliumRNG.random(randomness, -randomness);
                    currentDir.z += window.myceliumRNG.random(randomness, -randomness);
                    currentDir.normalize();
                }
            }
        }
    }
}

// ============================================
// MAIN MYCELIUM NETWORK CLASS
// ============================================

class RadialMyceliumNetwork extends THREE.Group {
    constructor() {
        super();
        this.name = 'RadialMyceliumNetwork';
        this.mesh = new THREE.Mesh();
        this.add(this.mesh);
        this.branches = [];
        this.rng = new RNG(Date.now());
        
        this.isAnimating = false;
        this.animationStartTime = 0;
        this.animationDuration = 0;
        this.currentColorScheme = 0;
        this.colorSchemes = ['natural', 'bioluminescent', 'warm', 'cool'];
    }

    // Standard generation from button position (splash page)
    generate(buttonPosition, options = {}) {
        const defaults = {
            initialBranches: 8,
            levels: 4,
            branchLength: 2.5,
            branchRadius: 0.04,
            branchProbability: 0.7,
            maxAngle: 45
        };
        
        const config = { ...defaults, ...options };
        
        this.branches = [];
        window.myceliumRNG = new RNG(Date.now());
        
        // Convert button position to 3D world coordinates
        const buttonCenter = this.screenToWorld(buttonPosition);
        
        // Create initial branches radiating outward from button
        for (let i = 0; i < config.initialBranches; i++) {
            const angle = (i / config.initialBranches) * Math.PI * 2;
            const elevation = window.myceliumRNG.random(-0.3, 0.3);
            
            const direction = new THREE.Vector3(
                Math.cos(angle),
                elevation,
                Math.sin(angle)
            ).normalize();
            
            const startTime = 0.1 + i * 0.08;
            
            const branch = new MyceliumBranch(
                buttonCenter,
                direction,
                config.branchLength,
                config.branchRadius,
                0,
                8,
                startTime
            );
            
            this.branches.push(branch);
            this.generateChildBranches(branch, config);
        }
        
        // Generate geometry for all branches
        this.generateAllGeometry();
        
        // Calculate animation duration
        const maxEndTime = Math.max(...this.branches.map(b => b.endTime));
        this.animationDuration = maxEndTime * 1000;
    }

    // Centered generation (for advanced modal)
    generateCentered(options = {}) {
        const defaults = {
            initialBranches: 8,
            levels: 4,
            branchLength: 2.5,
            branchRadius: 0.04,
            branchProbability: 0.7,
            maxAngle: 45
        };
        
        const config = { ...defaults, ...options };
        
        this.branches = [];
        window.myceliumRNG = new RNG(Date.now());
        
        // Start at world origin - this centers the network
        const centerPoint = new THREE.Vector3(0, 0, 0);
        
        // Create initial branches radiating outward from center
        for (let i = 0; i < config.initialBranches; i++) {
            const angle = (i / config.initialBranches) * Math.PI * 2;
            const elevation = window.myceliumRNG.random(-0.3, 0.3);
            
            const direction = new THREE.Vector3(
                Math.cos(angle),
                elevation,
                Math.sin(angle)
            ).normalize();
            
            const startTime = 0.1 + i * 0.08;
            
            const branch = new MyceliumBranch(
                centerPoint,
                direction,
                config.branchLength,
                config.branchRadius,
                0,
                8,
                startTime
            );
            
            this.branches.push(branch);
            this.generateChildBranches(branch, config);
        }
        
        // Generate geometry for all branches
        this.generateAllGeometry();
        
        // Calculate animation duration
        const maxEndTime = Math.max(...this.branches.map(b => b.endTime));
        this.animationDuration = maxEndTime * 1000;
    }

    // Targeted generation (home page with navigation buttons)
    generateTargeted(buttonPosition, targetPositions, options = {}) {
        console.log('generateTargeted called with:', targetPositions.length, 'targets');
        
        const defaults = {
            initialBranches: 3, // One per target
            levels: 3,
            branchRadius: 0.045,
            branchProbability: 1.0,
            maxAngle: 12,
            targetInfluence: 0.95 // Very strong targeting
        };
        
        const config = { ...defaults, ...options };
        
        this.branches = [];
        window.myceliumRNG = new RNG(Date.now() + 12345);
        
        // Convert button position to 3D world coordinates
        const buttonCenter = this.screenToWorld(buttonPosition);
        console.log('Button center in 3D:', buttonCenter);
        
        // Convert target positions to 3D world coordinates and calculate distances
        const targets = targetPositions.map((pos, index) => {
            const target3D = this.screenToWorld(pos);
            const distance = buttonCenter.distanceTo(target3D);
            console.log(`Target ${index} (${pos.x}, ${pos.y}) -> 3D:`, target3D, 'distance:', distance.toFixed(2));
            return { position: target3D, distance: distance };
        });
        
        // Create one main targeted branch per target
        targets.forEach((target, i) => {
            // Calculate direction vector (no random offset for main branches)
            const directionToTarget = new THREE.Vector3()
                .subVectors(target.position, buttonCenter)
                .normalize();
            
            // Use 90% of actual distance to target (slight undershoot for better visual contact)
            const branchLength = target.distance * 0.9;
            const startTime = 0.2 + i * 0.15;
            
            console.log(`Creating main branch ${i} - length: ${branchLength.toFixed(2)}, direction:`, directionToTarget);
            
            const branch = new TargetedMyceliumBranch(
                buttonCenter,
                directionToTarget,
                branchLength,
                config.branchRadius,
                0,
                14, // More sections for precision
                startTime,
                null,
                target.position,
                config.targetInfluence
            );
            
            this.branches.push(branch);
            
            // Add child branches for each main branch
            this.generateTargetedChildBranches(branch, config, [target]);
        });
        
        // Add some additional organic branches for visual richness
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + window.myceliumRNG.random(-0.5, 0.5);
            const elevation = window.myceliumRNG.random(-0.2, 0.2);
            
            const direction = new THREE.Vector3(
                Math.cos(angle),
                elevation,
                Math.sin(angle)
            ).normalize();
            
            const organicLength = 1.5 + window.myceliumRNG.random(0.8);
            const startTime = 0.4 + i * 0.1;
            
            const organicBranch = new MyceliumBranch(
                buttonCenter,
                direction,
                organicLength,
                config.branchRadius * 0.7,
                0,
                8,
                startTime
            );
            
            this.branches.push(organicBranch);
            this.generateChildBranches(organicBranch, { ...config, levels: 2, branchLength: organicLength });
        }
        
        console.log(`Generated ${this.branches.length} total branches (${targets.length} targeted, ${this.branches.length - targets.length} organic)`);
        
        // Generate geometry for all branches
        this.generateAllGeometry();
        
        // Calculate animation duration
        const maxEndTime = Math.max(...this.branches.map(b => b.endTime));
        this.animationDuration = maxEndTime * 1000;
    }

    screenToWorld(screenPosition) {
        // Convert screen coordinates to world coordinates
        if (!window.myceliumCamera) {
            console.error('Camera not available for coordinate conversion');
            return new THREE.Vector3(0, 0, 0);
        }
        
        // Normalized device coordinates (-1 to 1)
        const x = (screenPosition.x / window.innerWidth) * 2 - 1;
        const y = -(screenPosition.y / window.innerHeight) * 2 + 1;
        
        console.log(`Screen (${screenPosition.x}, ${screenPosition.y}) -> NDC (${x.toFixed(3)}, ${y.toFixed(3)})`);
        
        // Create a vector at the near plane
        const vector = new THREE.Vector3(x, y, 0.5);
        vector.unproject(window.myceliumCamera);
        
        // Calculate the ray direction from camera to the unprojected point
        const cameraPosition = window.myceliumCamera.position;
        const direction = vector.sub(cameraPosition).normalize();
        
        // Find intersection with the z=0 plane (where our mycelium grows)
        const distance = -cameraPosition.z / direction.z;
        const worldPosition = cameraPosition.clone().add(direction.multiplyScalar(distance));
        
        console.log(`World position: (${worldPosition.x.toFixed(3)}, ${worldPosition.y.toFixed(3)}, ${worldPosition.z.toFixed(3)})`);
        
        return worldPosition;
    }

    generateChildBranches(parentBranch, config) {
        if (parentBranch.level >= config.levels - 1) return;
        
        const childCount = Math.floor(window.myceliumRNG.random(1, 3) * config.branchProbability);
        
        for (let i = 0; i < childCount; i++) {
            const parentT = window.myceliumRNG.random(0.4, 0.8);
            const sectionIndex = Math.floor(parentT * (parentBranch.path.length - 1));
            const section = parentBranch.path[sectionIndex];
            
            // Create child direction with bias toward parent direction
            const deviationAngle = window.myceliumRNG.random(config.maxAngle * Math.PI / 180);
            const rotationAngle = window.myceliumRNG.random(Math.PI * 2);
            
            const childDir = this.createDeviatedDirection(
                section.direction, 
                deviationAngle, 
                rotationAngle
            );
            
            const childStartTime = parentBranch.startTime + (parentBranch.growthDuration * parentT) + 
                                 window.myceliumRNG.random(0.1, 0.4);
            
            const childBranch = new MyceliumBranch(
                section.position,
                childDir,
                config.branchLength * (0.6 + window.myceliumRNG.random(0.4)),
                section.radius * 0.75,
                parentBranch.level + 1,
                6,
                childStartTime,
                parentBranch
            );
            
            parentBranch.children.push(childBranch);
            this.branches.push(childBranch);
            this.generateChildBranches(childBranch, config);
        }
    }

    generateTargetedChildBranches(parentBranch, config, allTargets) {
        if (parentBranch.level >= config.levels - 1) return;
        
        // Generate more child branches for visual richness
        const childCount = parentBranch.level === 0 ? 
            Math.floor(window.myceliumRNG.random(2, 4)) :  // 2-3 children for main branches
            Math.floor(window.myceliumRNG.random(1, 2.5)); // 1-2 children for sub-branches
        
        for (let i = 0; i < childCount; i++) {
            const parentT = window.myceliumRNG.random(0.3, 0.8);
            const sectionIndex = Math.floor(parentT * (parentBranch.path.length - 1));
            const section = parentBranch.path[sectionIndex];
            
            // Create child direction
            let childDir;
            let childTarget = null;
            let childLength;
            
            if (parentBranch.target && parentBranch.level < 2 && window.myceliumRNG.random() < 0.6) {
                // Some children continue toward parent's target
                const toTarget = new THREE.Vector3()
                    .subVectors(parentBranch.target, section.position)
                    .normalize();
                
                const randomInfluence = 0.4;
                const randomDir = new THREE.Vector3(
                    window.myceliumRNG.random(-1, 1),
                    window.myceliumRNG.random(-1, 1),
                    window.myceliumRNG.random(-1, 1)
                ).normalize();
                
                childDir = toTarget.multiplyScalar(1 - randomInfluence)
                    .add(randomDir.multiplyScalar(randomInfluence))
                    .normalize();
                
                childTarget = parentBranch.target;
                // Length based on remaining distance to target
                const remainingDistance = section.position.distanceTo(parentBranch.target);
                childLength = Math.min(remainingDistance * 0.8, parentBranch.length * 0.6);
            } else {
                // Create organic deviation
                const deviationAngle = window.myceliumRNG.random(config.maxAngle * Math.PI / 180 * 1.5);
                const rotationAngle = window.myceliumRNG.random(Math.PI * 2);
                childDir = this.createDeviatedDirection(section.direction, deviationAngle, rotationAngle);
                childLength = parentBranch.length * (0.4 + window.myceliumRNG.random(0.4));
            }
            
            const childStartTime = parentBranch.startTime + (parentBranch.growthDuration * parentT) + 
                                 window.myceliumRNG.random(0.1, 0.3);
            
            // Create appropriate branch type
            let childBranch;
            if (childTarget) {
                childBranch = new TargetedMyceliumBranch(
                    section.position,
                    childDir,
                    childLength,
                    section.radius * 0.75,
                    parentBranch.level + 1,
                    8,
                    childStartTime,
                    parentBranch,
                    childTarget,
                    config.targetInfluence * 0.7
                );
            } else {
                childBranch = new MyceliumBranch(
                    section.position,
                    childDir,
                    childLength,
                    section.radius * 0.75,
                    parentBranch.level + 1,
                    6,
                    childStartTime,
                    parentBranch
                );
            }
            
            parentBranch.children.push(childBranch);
            this.branches.push(childBranch);
            
            // Recursively generate children for first two levels only
            if (parentBranch.level < 2) {
                this.generateTargetedChildBranches(childBranch, config, allTargets);
            }
        }
    }

    createDeviatedDirection(baseDirection, deviationAngle, rotationAngle) {
        // Create a direction that deviates from the base direction
        const up = Math.abs(baseDirection.y) > 0.9 ? 
            new THREE.Vector3(1, 0, 0) : 
            new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3().crossVectors(baseDirection, up).normalize();
        const forward = new THREE.Vector3().crossVectors(right, baseDirection).normalize();
        
        // Create deviation in local space
        const localDir = new THREE.Vector3(
            Math.cos(rotationAngle) * Math.sin(deviationAngle),
            Math.sin(rotationAngle) * Math.sin(deviationAngle),
            Math.cos(deviationAngle)
        );
        
        // Transform to world space
        const worldDir = new THREE.Vector3()
            .addScaledVector(right, localDir.x)
            .addScaledVector(forward, localDir.y)
            .addScaledVector(baseDirection, localDir.z)
            .normalize();
        
        return worldDir;
    }

    generateAllGeometry() {
        for (const branch of this.branches) {
            branch.generateGeometry();
        }
    }

    startGrowthAnimation() {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        this.animationStartTime = Date.now();
        
        const loadingEl = document.getElementById('loading');
        if (loadingEl) loadingEl.classList.add('active');
        
        this.animateGrowth();
    }

    animateGrowth() {
        if (!this.isAnimating) return;
        
        const currentTime = Date.now();
        const elapsed = currentTime - this.animationStartTime;
        const currentAnimationTime = elapsed / 1000;
        const progress = Math.min(elapsed / this.animationDuration, 1);
        
        this.createGrowingGeometry(currentAnimationTime);
        
        if (progress >= 1) {
            this.stopGrowthAnimation();
        } else {
            requestAnimationFrame(() => this.animateGrowth());
        }
    }

    stopGrowthAnimation() {
        this.isAnimating = false;
        const loadingEl = document.getElementById('loading');
        if (loadingEl) loadingEl.classList.remove('active');
        this.createCompleteGeometry();
    }

    createGrowingGeometry(currentTime) {
        const vertices = [];
        const normals = [];
        const indices = [];
        const uvs = [];
        const colors = [];
        
        let indexOffset = 0;
        
        for (const branch of this.branches) {
            if (currentTime >= branch.startTime) {
                const branchProgress = Math.min(
                    (currentTime - branch.startTime) / branch.growthDuration, 
                    1
                );
                
                if (branchProgress > 0) {
                    this.addPartialBranchGeometry(
                        branch, branchProgress, indexOffset, 
                        vertices, normals, indices, uvs, colors
                    );
                    indexOffset += this.getPartialBranchVertexCount(branch, branchProgress);
                }
            }
        }
        
        this.updateMeshGeometry(vertices, normals, indices, uvs, colors);
    }

    createCompleteGeometry() {
        const vertices = [];
        const normals = [];
        const indices = [];
        const uvs = [];
        const colors = [];
        
        let indexOffset = 0;
        
        for (const branch of this.branches) {
            this.addCompleteBranchGeometry(
                branch, indexOffset, 
                vertices, normals, indices, uvs, colors
            );
            indexOffset += branch.vertices.length / 3;
        }
        
        this.updateMeshGeometry(vertices, normals, indices, uvs, colors);
    }

    addPartialBranchGeometry(branch, progress, baseIndexOffset, vertices, normals, indices, uvs, colors) {
        const totalSections = branch.path.length - 1;
        const visibleSections = Math.floor(progress * totalSections);
        const partialSection = progress * totalSections - visibleSections;
        
        // Add vertices for complete sections
        for (let i = 0; i <= visibleSections; i++) {
            this.addSectionVertices(branch, i, vertices, normals, uvs, colors);
        }
        
        // Add partial section if needed
        if (partialSection > 0 && visibleSections < totalSections) {
            this.addInterpolatedSection(
                branch, visibleSections, partialSection, 
                vertices, normals, uvs, colors
            );
        }
        
        // Generate indices for visible sections
        const actualSections = visibleSections + (partialSection > 0 ? 1 : 0);
        this.addSectionIndices(actualSections, branch.segments, baseIndexOffset, indices);
    }

    addCompleteBranchGeometry(branch, baseIndexOffset, vertices, normals, indices, uvs, colors) {
        // Add all vertices
        for (let i = 0; i < branch.vertices.length; i++) {
            vertices.push(branch.vertices[i]);
        }
        
        for (let i = 0; i < branch.normals.length; i++) {
            normals.push(branch.normals[i]);
        }
        
        for (let i = 0; i < branch.uvs.length; i++) {
            uvs.push(branch.uvs[i]);
        }
        
        for (let i = 0; i < branch.colors.length; i++) {
            colors.push(branch.colors[i]);
        }
        
        // Add indices with offset
        for (let i = 0; i < branch.indices.length; i++) {
            indices.push(branch.indices[i] + baseIndexOffset);
        }
    }

    addSectionVertices(branch, sectionIndex, vertices, normals, uvs, colors) {
        const section = branch.path[sectionIndex];
        
        for (let j = 0; j < branch.segments; j++) {
            const angle = (j / branch.segments) * Math.PI * 2;
            
            const up = Math.abs(section.direction.y) > 0.9 ? 
                new THREE.Vector3(1, 0, 0) : 
                new THREE.Vector3(0, 1, 0);
            const right = new THREE.Vector3().crossVectors(section.direction, up).normalize();
            const forward = new THREE.Vector3().crossVectors(right, section.direction).normalize();
            
            const localPos = new THREE.Vector3(
                Math.cos(angle) * section.radius,
                Math.sin(angle) * section.radius,
                0
            );
            
            const vertex = new THREE.Vector3()
                .addScaledVector(right, localPos.x)
                .addScaledVector(forward, localPos.y)
                .add(section.position);
            
            const normal = new THREE.Vector3()
                .addScaledVector(right, Math.cos(angle))
                .addScaledVector(forward, Math.sin(angle))
                .normalize();
            
            vertices.push(vertex.x, vertex.y, vertex.z);
            normals.push(normal.x, normal.y, normal.z);
            uvs.push(j / branch.segments, section.t);
            
            const colorIntensity = Math.max(0.4, 1 - branch.level * 0.12);
            const warmth = 0.1 + branch.level * 0.05;
            colors.push(
                colorIntensity + warmth, 
                colorIntensity, 
                colorIntensity - warmth * 0.5
            );
        }
    }

    addInterpolatedSection(branch, sectionIndex, t, vertices, normals, uvs, colors) {
        const currentSection = branch.path[sectionIndex];
        const nextSection = branch.path[sectionIndex + 1];
        
        const interpPosition = currentSection.position.clone().lerp(nextSection.position, t);
        const interpDirection = currentSection.direction.clone().lerp(nextSection.direction, t).normalize();
        const interpRadius = currentSection.radius + (nextSection.radius - currentSection.radius) * t;
        const interpT = currentSection.t + (nextSection.t - currentSection.t) * t;
        
        for (let j = 0; j < branch.segments; j++) {
            const angle = (j / branch.segments) * Math.PI * 2;
            
            const up = Math.abs(interpDirection.y) > 0.9 ? 
                new THREE.Vector3(1, 0, 0) : 
                new THREE.Vector3(0, 1, 0);
            const right = new THREE.Vector3().crossVectors(interpDirection, up).normalize();
            const forward = new THREE.Vector3().crossVectors(right, interpDirection).normalize();
            
            const localPos = new THREE.Vector3(
                Math.cos(angle) * interpRadius,
                Math.sin(angle) * interpRadius,
                0
            );
            
            const vertex = new THREE.Vector3()
                .addScaledVector(right, localPos.x)
                .addScaledVector(forward, localPos.y)
                .add(interpPosition);
            
            const normal = new THREE.Vector3()
                .addScaledVector(right, Math.cos(angle))
                .addScaledVector(forward, Math.sin(angle))
                .normalize();
            
            vertices.push(vertex.x, vertex.y, vertex.z);
            normals.push(normal.x, normal.y, normal.z);
            uvs.push(j / branch.segments, interpT);
            
            const colorIntensity = Math.max(0.4, 1 - branch.level * 0.12);
            const warmth = 0.1 + branch.level * 0.05;
            colors.push(
                colorIntensity + warmth, 
                colorIntensity, 
                colorIntensity - warmth * 0.5
            );
        }
    }

    addSectionIndices(sections, segments, baseIndexOffset, indices) {
        for (let i = 0; i < sections; i++) {
            for (let j = 0; j < segments; j++) {
                const current = baseIndexOffset + i * segments + j;
                const next = baseIndexOffset + i * segments + (j + 1) % segments;
                const currentNext = baseIndexOffset + (i + 1) * segments + j;
                const nextNext = baseIndexOffset + (i + 1) * segments + (j + 1) % segments;
                
                indices.push(current, currentNext, next);
                indices.push(next, currentNext, nextNext);
            }
        }
    }

    getPartialBranchVertexCount(branch, progress) {
        const totalSections = branch.path.length - 1;
        const visibleSections = Math.floor(progress * totalSections);
        const hasPartialSection = (progress * totalSections - visibleSections) > 0;
        
        return (visibleSections + 1 + (hasPartialSection ? 1 : 0)) * branch.segments;
    }

    updateMeshGeometry(vertices, normals, indices, uvs, colors) {
        if (vertices.length === 0) {
            this.mesh.visible = false;
            return;
        }
        
        const geometry = new THREE.BufferGeometry();
        
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3));
        geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
        geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
        geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
        
        geometry.computeBoundingSphere();
        
        if (!this.mesh.material) {
            this.mesh.material = this.createMaterial();
        }
        
        this.mesh.geometry = geometry;
        this.mesh.visible = true;
    }

    createMaterial() {
        return new THREE.MeshPhongMaterial({
            color: 0xf5f0e8,
            emissive: 0x332211,
            shininess: 15,
            vertexColors: true,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
        });
    }

    // Public methods for debugging/customization
    toggleWireframe() {
        if (this.mesh.material) {
            this.mesh.material.wireframe = !this.mesh.material.wireframe;
        }
    }

    changeColorScheme() {
        this.currentColorScheme = (this.currentColorScheme + 1) % this.colorSchemes.length;
        const scheme = this.colorSchemes[this.currentColorScheme];
        
        if (this.mesh.material) {
            switch(scheme) {
                case 'bioluminescent':
                    this.mesh.material.color.setHex(0x00ff88);
                    this.mesh.material.emissive.setHex(0x002211);
                    break;
                case 'warm':
                    this.mesh.material.color.setHex(0xff6b4a);
                    this.mesh.material.emissive.setHex(0x2a1510);
                    break;
                case 'cool':
                    this.mesh.material.color.setHex(0x40e0ff);
                    this.mesh.material.emissive.setHex(0x0a2a3a);
                    break;
                default: // natural
                    this.mesh.material.color.setHex(0xf5f0e8);
                    this.mesh.material.emissive.setHex(0x332211);
                    break;
            }
        }
    }
}

// ============================================
// GLOBAL VARIABLES & SCENE MANAGEMENT
// ============================================

// Global variables for main 3D scene
let myceliumScene, myceliumCamera, myceliumRenderer, myceliumNetwork;
let isMyceliumInitialized = false;

// Predetermined target positions (matching CSS button positions)
const TARGET_POSITIONS = {
    about: { x: 50, y: 15 },     // Top center (viewport %)
    mapping: { x: 15, y: 80 },   // Bottom left (viewport %)
    nervous: { x: 85, y: 80 }    // Bottom right (viewport %)
};

// ============================================
// MAIN MYCELIUM INITIALIZATION
// ============================================

function initMycelium() {
    if (isMyceliumInitialized) return;
    
    console.log('Initializing mycelium system...');
    
    // Scene
    myceliumScene = new THREE.Scene();
    
    // Camera
    myceliumCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    myceliumCamera.position.set(0, 0, 5);
    window.myceliumCamera = myceliumCamera; // Make globally accessible
    
    // Renderer
    const canvas = document.getElementById('myceliumCanvas');
    if (!canvas) {
        console.error('Canvas not found!');
        return;
    }
    
    myceliumRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    myceliumRenderer.setSize(window.innerWidth, window.innerHeight);
    myceliumRenderer.shadowMap.enabled = true;
    myceliumRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    myceliumScene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    myceliumScene.add(directionalLight);
    
    // Create mycelium network
    myceliumNetwork = new RadialMyceliumNetwork();
    myceliumScene.add(myceliumNetwork);
    console.log('Mycelium network initialized');
    
    isMyceliumInitialized = true;
    
    // Animation loop
    animateMycelium();
}

function animateMycelium() {
    if (!isMyceliumInitialized) return;
    
    requestAnimationFrame(animateMycelium);
    if (myceliumRenderer && myceliumScene && myceliumCamera) {
        myceliumRenderer.render(myceliumScene, myceliumCamera);
    }
}

// ============================================
// TARGETED MYCELIUM GROWTH
// ============================================

function triggerTargetedMyceliumGrowth() {
    if (!isMyceliumInitialized) {
        console.error('Mycelium not initialized yet');
        return;
    }
    
    console.log('Triggering targeted mycelium growth...');
    
    if (myceliumNetwork.isAnimating) {
        myceliumNetwork.stopGrowthAnimation();
    }
    
    // Clear previous mycelium
    myceliumNetwork.mesh.visible = false;
    myceliumNetwork.branches = [];
    
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
    
    console.log('Button center:', buttonCenter);
    console.log('Target positions:', targets);
    
    // Generate targeted mycelium
    const options = {
        initialBranches: 3, // Exactly 3 branches for 3 targets
        levels: 3,
        branchLength: 3.5,
        branchRadius: 0.05,
        branchProbability: 0.9,
        maxAngle: 15,
        targetInfluence: 0.85
    };
    
    console.log('Generating targeted mycelium with options:', options);
    myceliumNetwork.generateTargeted(buttonCenter, targets, options);
    myceliumNetwork.startGrowthAnimation();
}

// Convert viewport percentage to screen coordinates
function viewportToScreen(vpX, vpY) {
    return {
        x: (vpX / 100) * window.innerWidth,
        y: (vpY / 100) * window.innerHeight
    };
}

// ============================================
// WINDOW RESIZE HANDLING
// ============================================

function handleMyceliumResize() {
    if (!isMyceliumInitialized) return;
    
    myceliumCamera.aspect = window.innerWidth / window.innerHeight;
    myceliumCamera.updateProjectionMatrix();
    myceliumRenderer.setSize(window.innerWidth, window.innerHeight);
    
    // Recalculate target positions if in home mode
    if (window.isHomeMode && typeof triggerTargetedMyceliumGrowth === 'function') {
        setTimeout(() => {
            console.log('Recalculating target positions after resize...');
            triggerTargetedMyceliumGrowth();
        }, 100);
    }
}

window.addEventListener('resize', () => {
    handleMyceliumResize();
});

// ============================================
// DOM INITIALIZATION
// ============================================

// Auto-initialize when DOM is ready (but don't auto-grow)
document.addEventListener('DOMContentLoaded', () => {
    // Initialize for splash page (which transforms into home)
    if (document.querySelector('.splash-layout')) {
        console.log('Splash page detected, initializing mycelium...');
        initMycelium();
        // Note: No automatic growth - only when user clicks button
    }
});



// ============================================
// WINDOW RESIZE HANDLING
// ============================================

function handleMyceliumResize() {
    if (!isMyceliumInitialized) return;
    
    myceliumCamera.aspect = window.innerWidth / window.innerHeight;
    myceliumCamera.updateProjectionMatrix();
    myceliumRenderer.setSize(window.innerWidth, window.innerHeight);
    
    // Recalculate target positions if in home mode
    if (window.isHomeMode && typeof triggerTargetedMyceliumGrowth === 'function') {
        setTimeout(() => {
            console.log('Recalculating target positions after resize...');
            triggerTargetedMyceliumGrowth();
        }, 100);
    }
}

window.addEventListener('resize', () => {
    handleMyceliumResize();
    
    // If modal is open, update camera aspect ratio
    if (document.getElementById('advanced3d-modal') && advancedCamera && advancedRenderer) {
        const canvas = document.getElementById('advancedMyceliumCanvas');
        if (canvas) {
            const rect = canvas.getBoundingClientRect();
            const newAspectRatio = rect.width / rect.height;
            
            advancedCamera.aspect = newAspectRatio;
            advancedCamera.updateProjectionMatrix();
            
            console.log(`Updated camera aspect ratio: ${newAspectRatio.toFixed(2)}`);
        }
    }
});

// ============================================
// DOM INITIALIZATION
// ============================================

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize for splash page (which transforms into home)
    if (document.querySelector('.splash-layout')) {
        console.log('Splash page detected, initializing mycelium...');
        initMycelium();
        
        // Auto-trigger initial mycelium growth
        setTimeout(() => {
            console.log('Auto-triggering initial mycelium growth...');
            triggerMyceliumGrowth();
        }, 3200);
    }
    
    // Debug controls toggle
    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'd') {
            const debug = document.getElementById('debugControls');
            if (debug) {
                debug.classList.toggle('visible');
            }
        }
    });
    
    // Branch count slider
    const branchSlider = document.getElementById('branchCount');
    const branchValue = document.getElementById('branchValue');
    if (branchSlider && branchValue) {
        branchSlider.addEventListener('input', (e) => {
            branchValue.textContent = e.target.value;
        });
    }
});