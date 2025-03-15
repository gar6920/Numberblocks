// Numberblocks game - Three.js implementation
console.log('Numberblocks game initializing...');

// Global variables
let scene, camera, renderer;
let ground;
let controls;
let clock;
let playerNumberblock; // Player's Numberblock
let operatorManager; // Operator system manager

// Initialize the Three.js scene
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue background
    
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    
    renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('game-canvas'),
        antialias: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    createGround();
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);
    
    // Add landscape elements for perspective
    createLandscapeElements();
    
    // Create player's Numberblock
    playerNumberblock = createPlayerNumberblock(scene, 1);

    // Initialize operator system
    window.camera = camera; // Make camera available for operator billboarding
    operatorManager = new OperatorManager(scene);

    controls = initControls(camera, renderer.domElement);

    // CRITICAL FIX: Explicitly set position on controls object (not camera directly)
    controls.getObject().position.set(0, 2, 5);
    scene.add(controls.getObject());
    
    clock = new THREE.Clock();
    window.addEventListener('resize', onWindowResize);
    
    // CRITICAL FIX: Explicitly call onWindowResize to ensure camera's projection matrix is correct initially
    onWindowResize();
    
    animate();
}

// Create the ground plane
function createGround() {
    // Create a large flat plane for the ground
    const groundGeometry = new THREE.BoxGeometry(50, 0.1, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x7CFC00, // Lawn green color
        roughness: 0.8,
        metalness: 0.2
    });
    
    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.position.y = -0.05; // Move it slightly down to center it
    scene.add(ground);
}

// Create random landscape elements for perspective
function createLandscapeElements() {
    // Define bright colors that match Numberblocks aesthetic
    const colors = [
        0xFF0000, // Red (One)
        0xFFA500, // Orange (Two)
        0xFFFF00, // Yellow (Three)
        0x00FF00, // Green (Four)
        0x0000FF, // Blue (Five)
        0x800080, // Purple (Six)
        0xFFC0CB, // Pink (Seven)
        0xA52A2A, // Brown (Eight)
        0x808080  // Grey (Nine)
    ];
    
    // Create 30 random objects
    for (let i = 0; i < 30; i++) {
        let geometry, material, mesh;
        const shapeType = Math.floor(Math.random() * 4); // 0-3 for different shapes
        const colorIndex = Math.floor(Math.random() * colors.length);
        const color = colors[colorIndex];
        
        // Create different shapes
        switch (shapeType) {
            case 0: // Cube (like Numberblock parts)
                const size = 0.5 + Math.random() * 1.5;
                geometry = new THREE.BoxGeometry(size, size, size);
                break;
            case 1: // Cylinder
                const radius = 0.3 + Math.random() * 1;
                const height = 1 + Math.random() * 3;
                geometry = new THREE.CylinderGeometry(radius, radius, height, 16);
                break;
            case 2: // Sphere
                const sphereRadius = 0.5 + Math.random() * 1;
                geometry = new THREE.SphereGeometry(sphereRadius, 16, 16);
                break;
            case 3: // Cone
                const coneRadius = 0.5 + Math.random() * 1;
                const coneHeight = 1 + Math.random() * 2;
                geometry = new THREE.ConeGeometry(coneRadius, coneHeight, 16);
                break;
        }
        
        // Create material with random color
        material = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.7,
            metalness: 0.2
        });
        
        // Create and position the mesh
        mesh = new THREE.Mesh(geometry, material);
        
        // Position randomly on the ground plane (within a 40x40 area)
        const posX = (Math.random() * 40) - 20;
        const posZ = (Math.random() * 40) - 20;
        
        // Calculate Y position based on the shape's height
        let posY;
        if (shapeType === 0) { // Cube
            posY = mesh.geometry.parameters.height / 2;
        } else if (shapeType === 1) { // Cylinder
            posY = mesh.geometry.parameters.height / 2;
        } else if (shapeType === 2) { // Sphere
            posY = mesh.geometry.parameters.radius;
        } else { // Cone
            posY = mesh.geometry.parameters.height / 2;
        }
        
        mesh.position.set(posX, posY, posZ);
        
        // Add random rotation for more variety
        mesh.rotation.y = Math.random() * Math.PI * 2;
        
        // Add to scene
        scene.add(mesh);
    }
    
    // Add some trees as landmarks
    createTrees();
}

// Create simple trees as landmarks
function createTrees() {
    for (let i = 0; i < 10; i++) {
        // Create trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 2, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513, // Brown
            roughness: 0.9
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        
        // Create foliage (as a cone)
        const foliageGeometry = new THREE.ConeGeometry(1.5, 3, 8);
        const foliageMaterial = new THREE.MeshStandardMaterial({
            color: 0x228B22, // Forest green
            roughness: 0.8
        });
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.y = 2.5; // Position on top of trunk
        
        // Create tree group
        const tree = new THREE.Group();
        tree.add(trunk);
        tree.add(foliage);
        
        // Position randomly on the ground plane but away from center
        let posX, posZ, distance;
        do {
            posX = (Math.random() * 40) - 20;
            posZ = (Math.random() * 40) - 20;
            distance = Math.sqrt(posX * posX + posZ * posZ);
        } while (distance < 8); // Keep trees away from spawn point
        
        tree.position.set(posX, 1, posZ); // Position with trunk base on ground
        
        // Add to scene
        scene.add(tree);
    }
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Calculate time delta for smooth movement
    const delta = clock.getDelta();
    
    // Update controls
    if (controls && typeof updateControls === 'function') {
        updateControls(controls, delta);
    }
    
    // Update the playerNumberblock position to follow the camera
    updatePlayerPosition();
    
    // Update operator system
    if (operatorManager) {
        operatorManager.update(delta);
    }
    
    // Render the scene
    renderer.render(scene, camera);
}

// Update the player's Numberblock position to follow the camera
function updatePlayerPosition() {
    if (playerNumberblock && controls) {
        // Get the controls object's position
        const controlsObject = controls.getObject();
        
        // Calculate the forward direction vector
        const camDirection = new THREE.Vector3(0, 0, -1);
        camDirection.applyQuaternion(camera.quaternion);
        
        // Position the Numberblock at the exact same position as the camera, but slightly lower
        const targetPosition = new THREE.Vector3();
        targetPosition.copy(controlsObject.position);
        
        // Fixed vertical offset to maintain strict relationship between camera and Numberblock
        const verticalOffset = 1.5;
        targetPosition.y -= verticalOffset;
        
        // Get the height of the Numberblock for ground collision
        const numberblockHeight = playerNumberblock.getHeight();
        const groundLevel = numberblockHeight / 2; // Bottom of Numberblock should be at y=0
        
        // Prevent the Numberblock from falling through the ground
        // This will also adjust the camera accordingly to maintain the relationship
        if (targetPosition.y < groundLevel) {
            targetPosition.y = groundLevel;
            // Adjust camera position to maintain the fixed relationship
            controlsObject.position.y = groundLevel + verticalOffset;
        }
        
        // Update the Numberblock's position immediately (no lerp) to stay perfectly aligned with camera
        playerNumberblock.mesh.position.copy(targetPosition);
        
        // Make the Numberblock rotate to match camera's horizontal rotation
        playerNumberblock.mesh.rotation.y = controlsObject.rotation.y;
    }
}

// Initialize the scene when the page loads
document.addEventListener('DOMContentLoaded', init);
