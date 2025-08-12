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

// Initialize 3D mycelium system
function initMycelium() {
    if (isMyceliumInitialized) return;
    
    // Scene
    myceliumScene = new THREE.Scene();
    
    // Camera
    myceliumCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    myceliumCamera.position.set(0, 0, 5);
    window.myceliumCamera = myceliumCamera; // Make globally accessible
    
    // Renderer
    const canvas = document.getElementById('myceliumCanvas');
    if (!canvas) return;
    
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
    
    isMyceliumInitialized = true;
    
    // Animation loop
    animateMycelium();
}

function animateMycelium() {
    if (!isMyceliumInitialized) return;
    
    requestAnimationFrame(animateMycelium);
    myceliumRenderer.render(myceliumScene, myceliumCamera);
}

// Button click handler
function triggerMyceliumGrowth() {
    if (!isMyceliumInitialized) return;
    
    // Reset animation state to allow multiple clicks
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
        const options = {
            initialBranches: 8,
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
    
    // Use the same logic as the main button
    triggerMyceliumGrowth();
}

// Handle window resize
function handleMyceliumResize() {
    if (!isMyceliumInitialized) return;
    
    myceliumCamera.aspect = window.innerWidth / window.innerHeight;
    myceliumCamera.updateProjectionMatrix();
    myceliumRenderer.setSize(window.innerWidth, window.innerHeight);
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize on splash page
    if (document.querySelector('.splash-layout')) {
        initMycelium();
        
        // Button click handler for manual triggers
        const button = document.getElementById('centralButton');
        if (button) {
            button.addEventListener('click', triggerMyceliumGrowth);
        }
        
        // Auto-trigger mycelium growth when instructions appear
        // Instructions fade in after 2s delay + 1s animation = 3s total
        setTimeout(() => {
            triggerMyceliumGrowth();
        }, 3200); // Slight delay after instructions appear
    }
});

// Window resize handler
window.addEventListener('resize', handleMyceliumResize);