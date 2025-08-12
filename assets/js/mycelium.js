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

// Mycelium branch class adapted for radial growth
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
                const warmth = 0.1 + this.level * 0.05; // Add slight warmth
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

// Main mycelium network class
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
            centerPoint, // Use center point instead of converted button position
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
        window.myceliumRNG = new RNG(Date.now()); // Global RNG for consistent randomization
        
        // Convert button position to 3D world coordinates
        const buttonCenter = this.screenToWorld(buttonPosition);
        
        // Create initial branches radiating outward from button
        for (let i = 0; i < config.initialBranches; i++) {
            const angle = (i / config.initialBranches) * Math.PI * 2;
            const elevation = window.myceliumRNG.random(-0.3, 0.3); // Slight up/down variation
            
            const direction = new THREE.Vector3(
                Math.cos(angle),
                elevation,
                Math.sin(angle)
            ).normalize();
            
            const startTime = 0.1 + i * 0.08; // Stagger start times
            
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

    screenToWorld(screenPosition) {
        // Convert screen coordinates to world coordinates
        const vector = new THREE.Vector3();
        vector.x = (screenPosition.x / window.innerWidth) * 2 - 1;
        vector.y = -(screenPosition.y / window.innerHeight) * 2 + 1;
        vector.z = 0.5;
        
        vector.unproject(window.myceliumCamera);
        
        const dir = vector.sub(window.myceliumCamera.position).normalize();
        const distance = -window.myceliumCamera.position.z / dir.z;
        const pos = window.myceliumCamera.position.clone().add(dir.multiplyScalar(distance));
        
        return pos;
    }

    generateChildBranches(parentBranch, config) {
        if (parentBranch.level >= config.levels - 1) return;
        
        const childCount = Math.floor(window.myceliumRNG.random(1, 4) * config.branchProbability);
        
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
            centerPoint, // Use center point instead of converted button position
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

// Global variables for 3D scene
let myceliumScene, myceliumCamera, myceliumRenderer, myceliumNetwork;
let isMyceliumInitialized = false;
let isAnimationTriggered = false;

// Easter egg variables
let buttonClickCount = 0;
let clickResetTimer = null;

// Initialize 3D mycelium system
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

// Button click handler
function triggerMyceliumGrowth() {
    if (!isMyceliumInitialized) return;
    
    // Increment click counter
    buttonClickCount++;
    console.log('Button clicked! Count:', buttonClickCount);
    
    // Reset counter after 10 seconds of no clicks
    clearTimeout(clickResetTimer);
    clickResetTimer = setTimeout(() => {
        console.log('Resetting click count');
        buttonClickCount = 0;
    }, 10000);
    
    // Check for easter egg trigger (5 clicks)
    if (buttonClickCount === 5) {
        console.log('Easter egg triggered!');
        openAdvanced3DModal();
        buttonClickCount = 0; // Reset counter
        return;
    }
    
    // Normal mycelium growth
    if (myceliumNetwork.isAnimating) {
        myceliumNetwork.stopGrowthAnimation();
    }
    
    // Clear previous mycelium
    myceliumNetwork.mesh.visible = false;
    myceliumNetwork.branches = [];
    
    // Reset the trigger flag
    isAnimationTriggered = false;
    
    // Small delay to ensure cleanup, then start new animation
    setTimeout(() => {
        isAnimationTriggered = true;
        const button = document.getElementById('centralButton');
        
        // Add click effect
        button.classList.add('clicked');
        setTimeout(() => button.classList.remove('clicked'), 200);
        
        // Get button position
        const buttonRect = button.getBoundingClientRect();
        const buttonCenter = {
            x: buttonRect.left + buttonRect.width / 2,
            y: buttonRect.top + buttonRect.height / 2
        };
        
        // Generate and animate mycelium
        const branchCount = parseInt(document.getElementById('branchCount')?.value) || 8;
        const options = {
            initialBranches: branchCount,
            levels: 4,
            branchLength: 2.0,
            branchRadius: 0.035,
            branchProbability: 0.75,
            maxAngle: 40
        };
        
        myceliumNetwork.generate(buttonCenter, options);
        myceliumNetwork.startGrowthAnimation();
        
        // Hide instructions on first click
        const instructions = document.querySelector('.instructions');
        if (instructions) {
            instructions.style.opacity = '0';
        }
    }, 100);
}

// Debug functions
function regenerateMyceliumNetwork() {
    if (!myceliumNetwork) return;
    triggerMyceliumGrowth();
}

function toggleMyceliumWireframe() {
    if (myceliumNetwork) {
        myceliumNetwork.toggleWireframe();
    }
}

function changeMyceliumColorScheme() {
    if (myceliumNetwork) {
        myceliumNetwork.changeColorScheme();
    }
}

// Handle window resize
function handleMyceliumResize() {
    if (!isMyceliumInitialized) return;
    
    myceliumCamera.aspect = window.innerWidth / window.innerHeight;
    myceliumCamera.updateProjectionMatrix();
    myceliumRenderer.setSize(window.innerWidth, window.innerHeight);
}

// Enhanced modal with interactive camera controls
function openAdvanced3DModal() {
    console.log('Opening advanced modal...');
    
    // Remove existing modal if it exists
    const existingModal = document.getElementById('advanced3d-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal HTML with instructions
    const modalHTML = `
        <div id="advanced3d-modal" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.95);
            z-index: 3000;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(10px);
        ">
            <div style="
                background: rgba(244, 239, 229, 0.98);
                padding: 0;
                border-radius: 15px;
                text-align: center;
                max-width: 90vw;
                max-height: 90vh;
                border: 2px solid #8b7355;
                overflow: hidden;
                box-shadow: 0 10px 50px rgba(139, 115, 85, 0.3);
                position: relative;
            ">
                <button onclick="closeAdvanced3DModal()" style="
                    position: absolute;
                    top: 15px;
                    right: 20px;
                    background: none;
                    border: none;
                    color: #8b7355;
                    font-size: 28px;
                    cursor: pointer;
                    padding: 5px;
                    line-height: 1;
                    z-index: 10;
                ">&times;</button>
                
                <canvas id="advancedMyceliumCanvas" style="
                    width: 800px;
                    height: 600px;
                    background: #0a0a0a;
                    display: block;
                    cursor: grab;
                "></canvas>
                
                <div id="cameraInstructions" style="
                    position: absolute;
                    top: 20px;
                    left: 20px;
                    color: rgba(244, 239, 229, 0.9);
                    font-style: italic;
                    font-size: 12px;
                    background: rgba(0, 0, 0, 0.7);
                    padding: 8px 12px;
                    border-radius: 10px;
                    z-index: 5;
                    transition: opacity 0.5s ease;
                ">
                    Cinematic mode • Click and drag to take control
                </div>
            </div>
        </div>
    `;
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    console.log('Modal HTML added to page');
    
    // Initialize 3D scene with interactive controls
    setTimeout(() => {
        console.log('Attempting to initialize advanced 3D...');
        try {
            initAdvanced3D();
            console.log('Advanced 3D initialization complete');
        } catch (error) {
            console.error('Advanced 3D initialization failed:', error);
        }
    }, 100);
}

// Camera control variables
let advancedCameraControls = {
    isUserControlled: false,
    cinematicStartTime: 0,
    fullSpeedDuration: 8000, // 8 seconds at full speed
    slowdownDuration: 12000, // 12 seconds to slow down to gentle speed
    
    // Speed control
    initialSpeed: 1.0,
    gentleSpeed: 0.3, // Final gentle speed (30% of original)
    currentSpeed: 1.0,
    
    // User input offsets
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
    cameraDistance: 8,
    
    // User offset from the base cinematic position
    userOffsetX: 0,
    userOffsetY: 0,
    userOffsetZ: 0,
    targetUserOffsetX: 0,
    targetUserOffsetY: 0,
    targetUserOffsetZ: 0,
    
    smoothing: 0.08,
    userInputDecay: 0.998 // Very gentle decay
};

// Enhanced initAdvanced3D with interactive camera
function initAdvanced3D() {
    console.log('Initializing advanced 3D scene...');
    const canvas = document.getElementById('advancedMyceliumCanvas');
    console.log('Canvas found:', !!canvas);
    if (!canvas) return;
    
    // Scene setup
    advancedScene = new THREE.Scene();
    advancedScene.background = new THREE.Color(0x0a0a0a);
    
    // Camera  
    advancedCamera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);
    advancedCamera.position.set(5, 3, 5); // Higher and better angle
    advancedCamera.lookAt(0, 0, 0); // Look at center where mycelium will be

    // Renderer
    advancedRenderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    advancedRenderer.setSize(800, 600);
    advancedRenderer.shadowMap.enabled = true;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    advancedScene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xf0f0f0, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    advancedScene.add(directionalLight);
    console.log('Lighting added to scene');
    
    // Create network
    advancedNetwork = new RadialMyceliumNetwork();
    advancedScene.add(advancedNetwork);
    
    // Generate network structure
    generateAdvancedMycelium();
    
    // Setup camera controls
    setupAdvancedCameraControls(canvas);
    
    // Initialize camera control state
    advancedCameraControls.cinematicStartTime = Date.now();
    advancedCameraControls.isUserControlled = false;
    advancedCameraControls.currentSpeed = advancedCameraControls.initialSpeed;
    // advancedCameraControls.cinematicStartTime = Date.now();
    // advancedCameraControls.isUserControlled = false;
    // advancedCameraControls.cinematicTheta = 0;
    // advancedCameraControls.userThetaOffset = 0;
    // advancedCameraControls.userPhiOffset = 0;
    // advancedCameraControls.targetUserThetaOffset = 0;
    // advancedCameraControls.targetUserPhiOffset = 0;
    
    // Start the animation loop
    animateAdvanced3D();
    
    // Auto-start the growth animation after a brief delay
    setTimeout(() => {
        console.log('Starting automatic growth animation...');
        animateAdvancedGrowth();
    }, 500);
}

// Setup interactive camera controls
function setupAdvancedCameraControls(canvas) {
    // Mouse controls
    canvas.addEventListener('mousedown', (e) => {
        advancedCameraControls.isDragging = true;
        advancedCameraControls.lastMouseX = e.clientX;
        advancedCameraControls.lastMouseY = e.clientY;
        canvas.style.cursor = 'grabbing';
        
        if (!advancedCameraControls.isUserControlled) {
            takeUserControl();
        }
    });
    
    canvas.addEventListener('mouseup', () => {
        advancedCameraControls.isDragging = false;
        canvas.style.cursor = 'grab';
    });
    
    canvas.addEventListener('mouseleave', () => {
        advancedCameraControls.isDragging = false;
        canvas.style.cursor = 'grab';
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (!advancedCameraControls.isDragging) return;
        
        const deltaX = e.clientX - advancedCameraControls.lastMouseX;
        const deltaY = e.clientY - advancedCameraControls.lastMouseY;
        
        // Convert mouse movement to 3D offset
        const sensitivity = 0.02;
        advancedCameraControls.targetUserOffsetX += deltaX * sensitivity;
        advancedCameraControls.targetUserOffsetY -= deltaY * sensitivity; // Negative for natural movement
        
        // Limit the offset range
        const maxOffset = 4;
        advancedCameraControls.targetUserOffsetX = Math.max(-maxOffset, Math.min(maxOffset, advancedCameraControls.targetUserOffsetX));
        advancedCameraControls.targetUserOffsetY = Math.max(-maxOffset, Math.min(maxOffset, advancedCameraControls.targetUserOffsetY));
        
        advancedCameraControls.lastMouseX = e.clientX;
        advancedCameraControls.lastMouseY = e.clientY;
    });
    
    // Zoom with mouse wheel
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        
        if (!advancedCameraControls.isUserControlled) {
            takeUserControl();
        }
        
        advancedCameraControls.cameraDistance += e.deltaY * 0.01;
        advancedCameraControls.cameraDistance = Math.max(2, Math.min(20, advancedCameraControls.cameraDistance));
    });
    
    // Touch controls
    let touchDistance = 0;
    
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            advancedCameraControls.isDragging = true;
            advancedCameraControls.lastMouseX = touch.clientX;
            advancedCameraControls.lastMouseY = touch.clientY;
            
            if (!advancedCameraControls.isUserControlled) {
                takeUserControl();
            }
        } else if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            touchDistance = Math.sqrt(dx * dx + dy * dy);
            
            if (!advancedCameraControls.isUserControlled) {
                takeUserControl();
            }
        }
    });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        
        if (e.touches.length === 1 && advancedCameraControls.isDragging) {
            const touch = e.touches[0];
            const deltaX = touch.clientX - advancedCameraControls.lastMouseX;
            const deltaY = touch.clientY - advancedCameraControls.lastMouseY;
            
            const sensitivity = 0.02;
            advancedCameraControls.targetUserOffsetX += deltaX * sensitivity;
            advancedCameraControls.targetUserOffsetY -= deltaY * sensitivity;
            
            const maxOffset = 4;
            advancedCameraControls.targetUserOffsetX = Math.max(-maxOffset, Math.min(maxOffset, advancedCameraControls.targetUserOffsetX));
            advancedCameraControls.targetUserOffsetY = Math.max(-maxOffset, Math.min(maxOffset, advancedCameraControls.targetUserOffsetY));
            
            advancedCameraControls.lastMouseX = touch.clientX;
            advancedCameraControls.lastMouseY = touch.clientY;
        } else if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (touchDistance > 0) {
                const scale = touchDistance / distance;
                advancedCameraControls.cameraDistance *= scale;
                advancedCameraControls.cameraDistance = Math.max(2, Math.min(20, advancedCameraControls.cameraDistance));
            }
            
            touchDistance = distance;
        }
    });
    
    canvas.addEventListener('touchend', (e) => {
        advancedCameraControls.isDragging = false;
        touchDistance = 0;
    });
}

// Switch to user control mode
function takeUserControl() {
    console.log('User took camera control - slowing down cinematic movement');
    advancedCameraControls.isUserControlled = true;
    
    // Update instructions
    const instructions = document.getElementById('cameraInstructions');
    if (instructions) {
        instructions.textContent = 'Interactive mode • Movement slowing down • Drag to adjust view';
        setTimeout(() => {
            instructions.style.opacity = '0';
            setTimeout(() => {
                if (instructions.parentNode) {
                    instructions.parentNode.removeChild(instructions);
                }
            }, 500);
        }, 3000);
    }
}

// Enhanced animation loop with camera control
function animateAdvanced3D() {
    if (!advancedRenderer || !advancedScene || !advancedCamera) return;
    
    requestAnimationFrame(animateAdvanced3D);
    
    // Update camera position
    updateAdvancedCamera();
    
    advancedRenderer.render(advancedScene, advancedCamera);
}

// Camera position update function
function updateAdvancedCamera() {
    const now = Date.now();
    const elapsed = now - advancedCameraControls.cinematicStartTime;
    
    // Calculate current speed based on elapsed time
    if (elapsed < advancedCameraControls.fullSpeedDuration) {
        // Full speed phase
        advancedCameraControls.currentSpeed = advancedCameraControls.initialSpeed;
    } else if (elapsed < advancedCameraControls.fullSpeedDuration + advancedCameraControls.slowdownDuration) {
        // Slowdown phase - gradual transition
        const slowdownProgress = (elapsed - advancedCameraControls.fullSpeedDuration) / advancedCameraControls.slowdownDuration;
        const easeOut = 1 - Math.pow(1 - slowdownProgress, 3); // Smooth easing curve
        advancedCameraControls.currentSpeed = advancedCameraControls.initialSpeed + 
            (advancedCameraControls.gentleSpeed - advancedCameraControls.initialSpeed) * easeOut;
    } else {
        // Gentle speed phase
        advancedCameraControls.currentSpeed = advancedCameraControls.gentleSpeed;
        
        // Auto-enable user control after slowdown completes
        if (!advancedCameraControls.isUserControlled) {
            takeUserControl();
        }
    }
    
    // Use the SAME original cinematic movement, just scaled by current speed
    const time = elapsed * 0.0008 * advancedCameraControls.currentSpeed;
    const radius = advancedCameraControls.cameraDistance;
    
    // Calculate base cinematic position
    const baseCameraX = Math.cos(time) * radius;
    const baseCameraZ = Math.sin(time) * radius;
    const baseCameraY = -3 + Math.sin(time * 0.3) * 1;
    
    // Smooth user input offsets
    advancedCameraControls.userOffsetX += (advancedCameraControls.targetUserOffsetX - advancedCameraControls.userOffsetX) * advancedCameraControls.smoothing;
    advancedCameraControls.userOffsetY += (advancedCameraControls.targetUserOffsetY - advancedCameraControls.userOffsetY) * advancedCameraControls.smoothing;
    advancedCameraControls.userOffsetZ += (advancedCameraControls.targetUserOffsetZ - advancedCameraControls.userOffsetZ) * advancedCameraControls.smoothing;
    
    // Gentle decay when not actively dragging
    if (!advancedCameraControls.isDragging) {
        advancedCameraControls.targetUserOffsetX *= advancedCameraControls.userInputDecay;
        advancedCameraControls.targetUserOffsetY *= advancedCameraControls.userInputDecay;
        advancedCameraControls.targetUserOffsetZ *= advancedCameraControls.userInputDecay;
    }
    
    // Apply final position (base cinematic + user offset)
    advancedCamera.position.set(
        baseCameraX + advancedCameraControls.userOffsetX,
        baseCameraY + advancedCameraControls.userOffsetY,
        baseCameraZ + advancedCameraControls.userOffsetZ
    );
    
    advancedCamera.lookAt(0, 0, 0);
}

function closeAdvanced3DModal() {
    console.log('Closing modal...');
    const modal = document.getElementById('advanced3d-modal');
    if (modal) {
        modal.remove();
        console.log('Modal removed');
    }
}

// Advanced 3D scene variables
let advancedScene, advancedCamera, advancedRenderer, advancedNetwork;
let advancedAnimationId;

function generateAdvancedMycelium() {
    if (!advancedNetwork) return;
    
    const options = {
        initialBranches: 8,
        levels: 4,
        branchLength: 2.0,
        branchRadius: 0.04,
        branchProbability: 0.8,
        maxAngle: 45
    };
    
    // Generate at world origin instead of button position
    // This centers the network in the 3D space
    advancedNetwork.generateCentered(options);
}

function animateAdvancedGrowth() {
    if (advancedNetwork) {
        advancedNetwork.startGrowthAnimation();
    }
}

function toggleAdvancedWireframe() {
    if (advancedNetwork && advancedNetwork.mesh.material) {
        advancedNetwork.mesh.material.wireframe = !advancedNetwork.mesh.material.wireframe;
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize on splash page
    if (document.querySelector('.splash-layout')) {
        console.log('Splash page detected, initializing mycelium...');
        initMycelium();
        
        // Button click handler for manual triggers
        const button = document.getElementById('centralButton');
        if (button) {
            button.addEventListener('click', triggerMyceliumGrowth);
            console.log('Button click handler attached');
        }
        
        // Auto-trigger mycelium growth when instructions appear
        setTimeout(() => {
            console.log('Auto-triggering mycelium growth...');
            triggerMyceliumGrowth();
        }, 3200);
    }
});

// Window resize handler
window.addEventListener('resize', handleMyceliumResize);

// Debug controls setup
document.addEventListener('DOMContentLoaded', () => {
    // Debug controls toggle
    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'd') {
            const debug = document.getElementById('debugControls');
            debug.classList.toggle('visible');
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