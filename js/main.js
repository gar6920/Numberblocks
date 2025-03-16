// Numberblocks game - Three.js implementation
console.log('Numberblocks game initializing...');

// Import collision functions if they're not already globally available
if (typeof updateAABB !== 'function' || typeof checkCollision !== 'function') {
    console.log('Importing collision functions...');
    
    // Define the functions locally if they're not available globally
    function updateAABB(mesh) {
        if (!mesh) return null;
        
        // Use Three.js Box3 to create a bounding box from the mesh
        try {
            const box = new THREE.Box3().setFromObject(mesh);
            return box;
        } catch (error) {
            console.error("Error creating bounding box:", error);
            return null;
        }
    }

    function checkCollision(boxA, boxB) {
        if (!boxA || !boxB) return false;
        try {
            return boxA.intersectsBox(boxB);
        } catch (error) {
            console.error("Error checking collision:", error);
            return false;
        }
    }
}

// Global variables
let scene, camera, renderer, controls;
let ground;
let playerNumberblock; // Player's Numberblock
let staticNumberblock; // Static Numberblock for interaction
let operatorManager; // Operator system manager
let numberblocks = []; // Array to track random Numberblocks
let operatorDisplay; // Add operator display element
window.isFirstPerson = true; // Make isFirstPerson truly global by attaching to window

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

    // Initialize the HUD display with the starting value
    updatePlayerDisplay(1);
    
    // Create static Numberblock for operator application
    staticNumberblock = createStaticNumberblock(2, { x: 0, z: -5 });
    console.log("Static Numberblock created with value: 2");

    // Initialize operator system
    window.camera = camera; // Make camera available for operator billboarding
    operatorManager = new OperatorManager(scene);

    // Initialize FPS controls with proper look
    controls = initControls(camera, renderer.domElement);
    
    // CRITICAL FIX: Explicitly set position on controls object (not camera directly)
    controls.getObject().position.set(0, 2, 5);
    scene.add(controls.getObject());
    
    // Initialize collision detection
    if (typeof addCollidableObject === 'function') {
        addCollidableObject(playerNumberblock.mesh);
        addCollidableObject(staticNumberblock.mesh);
        console.log("Collision objects registered");
    } else {
        console.error("Collision functions not available!");
    }
    
    clock = new THREE.Clock();
    window.addEventListener('resize', onWindowResize);
    
    // CRITICAL FIX: Explicitly call onWindowResize to ensure camera's projection matrix is correct initially
    onWindowResize();
    
    // Create HUD elements
    createHUD();
    
    // Create random Numberblocks around the map
    createRandomNumberblocks();
    
    animate();
}

// Create the ground plane
function createGround() {
    // Create a large flat plane for the ground
    const groundGeometry = new THREE.BoxGeometry(200, 0.1, 200);
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
    
    // Create 120 random objects (increased from 30 for the larger world)
    for (let i = 0; i < 120; i++) {
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
        
        // Position randomly on the ground plane (within a 180x180 area)
        // Keep away from center where player spawns
        let posX, posZ;
        do {
            posX = (Math.random() * 180) - 90;
            posZ = (Math.random() * 180) - 90;
        } while (Math.abs(posX) < 8 && Math.abs(posZ) < 8); // Increased spawn area protection
        
        mesh.position.set(posX, 0, posZ);
        
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
    for (let i = 0; i < 40; i++) {
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
            posX = (Math.random() * 180) - 90;
            posZ = (Math.random() * 180) - 90;
            distance = Math.sqrt(posX * posX + posZ * posZ);
        } while (distance < 10); // Keep trees away from spawn point
        
        tree.position.set(posX, 1, posZ); // Position with trunk base on ground
        
        // Add to scene
        scene.add(tree);
    }
}

// Create HUD elements
function createHUD() {
    // Player's number display
    const valueDisplay = document.createElement('div');
    valueDisplay.id = 'value-display';
    valueDisplay.style.position = 'absolute';
    valueDisplay.style.bottom = '20px';
    valueDisplay.style.left = '20px';
    valueDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    valueDisplay.style.color = 'white';
    valueDisplay.style.padding = '10px 20px';
    valueDisplay.style.borderRadius = '5px';
    valueDisplay.style.fontFamily = 'Arial, sans-serif';
    valueDisplay.style.fontSize = '24px';
    valueDisplay.style.fontWeight = 'bold';
    valueDisplay.innerHTML = 'Value: 1';
    document.body.appendChild(valueDisplay);

    // Operator display
    operatorDisplay = document.createElement('div');
    operatorDisplay.id = 'operator-display';
    operatorDisplay.style.position = 'absolute';
    operatorDisplay.style.bottom = '20px';
    operatorDisplay.style.right = '20px';
    operatorDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    operatorDisplay.style.color = 'white';
    operatorDisplay.style.padding = '10px 20px';
    operatorDisplay.style.borderRadius = '5px';
    operatorDisplay.style.fontFamily = 'Arial, sans-serif';
    operatorDisplay.style.fontSize = '24px';
    operatorDisplay.style.fontWeight = 'bold';
    operatorDisplay.innerHTML = 'Current Operator: None';
    document.body.appendChild(operatorDisplay);
    
    // View mode display
    const viewModeDisplay = document.createElement('div');
    viewModeDisplay.id = 'view-mode-display';
    viewModeDisplay.style.position = 'absolute';
    viewModeDisplay.style.top = '20px';
    viewModeDisplay.style.left = '50%';
    viewModeDisplay.style.transform = 'translateX(-50%)';
    viewModeDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    viewModeDisplay.style.color = 'white';
    viewModeDisplay.style.padding = '10px 20px';
    viewModeDisplay.style.borderRadius = '5px';
    viewModeDisplay.style.fontFamily = 'Arial, sans-serif';
    viewModeDisplay.style.fontSize = '20px';
    viewModeDisplay.style.fontWeight = 'bold';
    viewModeDisplay.style.transition = 'opacity 1s';
    viewModeDisplay.style.opacity = '0';
    viewModeDisplay.innerHTML = 'First Person View';
    document.body.appendChild(viewModeDisplay);
}

// Update the player's number display in the HUD
function updatePlayerDisplay(value) {
    const valueDisplay = document.getElementById('value-display');
    if (valueDisplay) {
        valueDisplay.innerHTML = `Value: ${value}`;
    }
}

// Update operator display
function updateOperatorDisplay(operatorType) {
    if (operatorDisplay) {
        if (operatorType) {
            operatorDisplay.innerHTML = operatorType === 'plus' ? '+ Add' : '- Subtract';
            operatorDisplay.style.color = operatorType === 'plus' ? '#00FF00' : '#FF0000';
        } else {
            operatorDisplay.innerHTML = 'Current Operator: None';
            operatorDisplay.style.color = 'white';
        }
    }
}

// Create random Numberblocks around the map
function createRandomNumberblocks() {
    const numBlocks = 15; // Create 15 random Numberblocks
    
    for (let i = 0; i < numBlocks; i++) {
        // Create a Numberblock with random value between 1 and 20
        const value = Math.floor(Math.random() * 20) + 1;
        const numberblock = new Numberblock(value);
        
        // Position randomly, away from player spawn
        let posX, posZ;
        do {
            posX = (Math.random() * 40) - 20;
            posZ = (Math.random() * 40) - 20;
        } while (
            Math.abs(posX) < 5 && 
            Math.abs(posZ) < 5
        );
        
        // Position the Numberblock with its base at ground level
        numberblock.mesh.position.set(posX, numberblock.blockSize / 2, posZ);
        scene.add(numberblock.mesh);
        numberblocks.push(numberblock);
        
        if (typeof addCollidableObject === 'function') {
            addCollidableObject(numberblock.mesh);
        }
    }
}

// Create a static Numberblock for testing
function createStaticNumberblock(value = 2, position = { x: 0, z: -5 }) {
    const numberblock = new Numberblock(value);
    numberblock.mesh.position.set(position.x, numberblock.blockSize / 2, position.z);
    scene.add(numberblock.mesh);
    return numberblock;
}

// Create random shapes for the landscape
function createRandomShapes() {
    const numShapes = 30;
    const shapes = [];
    
    for (let i = 0; i < numShapes; i++) {
        let geometry, mesh;
        const shapeType = Math.floor(Math.random() * 4); // 0: cube, 1: cylinder, 2: sphere, 3: cone
        
        // Create random shape
        switch (shapeType) {
            case 0: // Cube
                geometry = new THREE.BoxGeometry(1, 1, 1);
                break;
            case 1: // Cylinder
                geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 16);
                break;
            case 2: // Sphere
                geometry = new THREE.SphereGeometry(0.5, 16, 16);
                break;
            case 3: // Cone
                geometry = new THREE.ConeGeometry(0.5, 1, 16);
                break;
        }
        
        // Create material with random color
        const material = new THREE.MeshStandardMaterial({
            color: Math.random() * 0xFFFFFF,
            roughness: 0.7,
            metalness: 0.3
        });
        
        mesh = new THREE.Mesh(geometry, material);
        
        // Position randomly on the ground plane (within a 40x40 area)
        // Keep away from center where player spawns
        let posX, posZ;
        do {
            posX = (Math.random() * 40) - 20;
            posZ = (Math.random() * 40) - 20;
        } while (
            Math.abs(posX) < 5 && 
            Math.abs(posZ) < 5
        );
        
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
        
        scene.add(mesh);
        shapes.push(mesh);
        
        // Make it collidable
        if (typeof addCollidableObject === 'function') {
            addCollidableObject(mesh);
        }
    }
    
    return shapes;
}

// Create player Numberblock and add it to the scene
function createPlayerNumberblock(scene, value = 1) {
    const playerBlock = new Numberblock(value);
    playerBlock.mesh.position.set(0, playerBlock.blockSize / 2, 0); // Start at origin, on ground
    scene.add(playerBlock.mesh);
    return playerBlock;
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
    const delta = clock.getDelta();

    if (controls) updateControls(controls, delta);
    
    // In first-person, update Numberblock position to match camera
    // In third-person, handle camera following Numberblock
    if (window.isFirstPerson) {
        updatePlayerPosition();
    } else {
        // In third-person, update player position directly
        updatePlayerPositionThirdPerson(delta);
        updateThirdPersonCamera();
    }

    checkOperatorCollisions();
    checkNumberblockCollisions();

    renderer.render(scene, camera);
}

// Update player position and rotation based on controls - STANDARD FPS MECHANICS
function updatePlayerPosition() {
    if (!playerNumberblock || !controls) return;

    const controlsObject = controls.getObject();

    // Position Numberblock under camera based on height
    const numberblockHeight = playerNumberblock.getHeight();
    playerNumberblock.mesh.position.set(
        controlsObject.position.x,
        controlsObject.position.y - numberblockHeight / 2,
        controlsObject.position.z
    );

    // Get camera direction vector and calculate rotation
    // This addresses axis issues by deriving rotation from direction vector
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(controlsObject.quaternion);
    direction.y = 0; // Zero out vertical component
    direction.normalize();
    
    // Calculate rotation from direction vector
    const rotationY = Math.atan2(direction.x, direction.z);
    playerNumberblock.mesh.rotation.set(0, rotationY, 0);
}

// Update player position in third-person mode
function updatePlayerPositionThirdPerson(delta) {
    if (!playerNumberblock || !controls) return;
    
    // Get input states from global variables in controls.js
    const moveSpeed = 5.0 * delta;
    
    // Create a movement vector
    const movement = new THREE.Vector3(0, 0, 0);
    
    // Forward/backward movement
    if (window.moveForward) movement.z -= moveSpeed;
    if (window.moveBackward) movement.z += moveSpeed;
    
    // Left/right movement
    if (window.moveLeft) movement.x -= moveSpeed;
    if (window.moveRight) movement.x += moveSpeed;
    
    // Apply rotation to movement (match movement to camera orientation)
    const cameraDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion);
    cameraDirection.y = 0; // Keep movement on the horizontal plane
    cameraDirection.normalize();
    
    const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    cameraRight.y = 0;
    cameraRight.normalize();
    
    // Calculate the final movement direction
    const finalMovement = new THREE.Vector3();
    finalMovement.addScaledVector(cameraDirection, -movement.z); // Forward is negative Z
    finalMovement.addScaledVector(cameraRight, movement.x);      // Right is positive X
    
    // Apply movement to Numberblock
    playerNumberblock.mesh.position.add(finalMovement);
    
    // Rotate Numberblock to face movement direction if moving
    if (finalMovement.lengthSq() > 0.001) {
        const targetRotation = Math.atan2(finalMovement.x, -finalMovement.z);
        
        // Smoothly rotate towards target direction (lerp rotation)
        const currentRotation = playerNumberblock.mesh.rotation.y;
        let rotationDifference = targetRotation - currentRotation;
        
        // Handle wraparound for angle difference
        if (rotationDifference > Math.PI) rotationDifference -= Math.PI * 2;
        if (rotationDifference < -Math.PI) rotationDifference += Math.PI * 2;
        
        // Apply smooth rotation
        playerNumberblock.mesh.rotation.y = currentRotation + rotationDifference * 0.1;
    }
    
    // Q and E rotation in third person rotates the camera around the player
    if (window.turnLeft || window.turnRight) {
        // This will be handled in updateThirdPersonCamera
    }
}

// Update camera position in third-person mode
function updateThirdPersonCamera() {
    if (!playerNumberblock || !playerNumberblock.mesh) return;

    const distance = 12;      // Camera distance behind the player
    const heightOffset = 8;   // Height offset above the player
    const smoothing = 0.1;    // Smooth camera motion factor
    const rotationSpeed = 0.05;

    // Initialize the angle if not set
    if (typeof window.thirdPersonCameraAngle === 'undefined') {
        window.thirdPersonCameraAngle = playerNumberblock.mesh.rotation.y + Math.PI;
    }

    // Adjust camera angle with Q/E keys
    if (window.turnLeft) {
        window.thirdPersonCameraAngle += rotationSpeed;
    }
    if (window.turnRight) {
        window.thirdPersonCameraAngle -= rotationSpeed;
    }

    // Calculate desired camera position explicitly without cumulative interpolation errors
    const playerPos = playerNumberblock.mesh.position.clone();
    const targetX = playerPos.x - Math.sin(window.thirdPersonCameraAngle) * distance;
    const targetZ = playerPos.z - Math.cos(window.thirdPersonCameraAngle) * distance;
    
    // Ensure camera Y position is always exactly at height offset plus player's midpoint height
    const targetY = playerNumberblock.mesh.position.y + heightOffset;

    // Set camera position explicitly without smoothing vertically to prevent drift
    camera.position.set(
        THREE.MathUtils.lerp(camera.position.x, targetX, 0.1),
        targetY, // No vertical smoothing
        THREE.MathUtils.lerp(camera.position.z, targetZ, 0.1)
    );

    // Always look at the player's midpoint height directly
    const lookAtY = playerNumberblock.mesh.position.y + playerNumberblock.getHeight() / 2;
    camera.lookAt(playerNumberblock.mesh.position.x, targetY - (heightOffset / 2), playerNumberblock.mesh.position.z);
}

// Switch to third-person view
function switchToThirdPersonView() {
    // Keep pointer locked but detach camera from controls
    controls.getObject().remove(camera);
    scene.add(camera);
    
    // Reset camera's up vector to ensure correct orientation
    camera.up.set(0, 1, 0);
    
    // Hide cursor in third-person mode
    document.body.style.cursor = 'none';
    
    // Initialize third-person camera angle based on current player rotation
    // Use + Math.PI to position camera behind player
    window.thirdPersonCameraAngle = playerNumberblock.mesh.rotation.y + Math.PI;
    
    // Set initial camera position immediately to avoid gradual transition
    const playerPos = playerNumberblock.mesh.position.clone();
    const distance = 12;
    const height = 8;
    
    camera.position.set(
        playerPos.x - Math.sin(window.thirdPersonCameraAngle) * distance,
        playerPos.y + height,
        playerPos.z - Math.cos(window.thirdPersonCameraAngle) * distance
    );
    
    // Look at player immediately
    const targetY = playerPos.y + playerNumberblock.getHeight() / 2;
    camera.lookAt(playerPos.x, targetY, playerPos.z);
    
    // Setup mouse controls for third-person camera rotation
    if (!window.thirdPersonMouseHandler) {
        window.thirdPersonMouseHandler = function(event) {
            // Skip processing extremely small movements to prevent drift
            if (Math.abs(event.movementX) > 0.5) {
                window.thirdPersonCameraAngle -= event.movementX * 0.002;
            }
        };
    }
    
    // Activate third-person mouse controls using the pointer lock events
    document.addEventListener('mousemove', window.thirdPersonMouseHandler);
    window.thirdPersonMouseControlsActive = true;
    
    // Make sure pointer is locked
    if (!controls.isLocked) {
        controls.lock();
    }
}

// Check for collisions between player's Numberblock and other Numberblocks
function checkNumberblockCollisions() {
    if (!playerNumberblock || !playerNumberblock.mesh) return;
    
    const playerBox = new THREE.Box3().setFromObject(playerNumberblock.mesh);
    
    // Check collision with static Numberblock
    if (staticNumberblock && staticNumberblock.mesh) {
        const staticBox = new THREE.Box3().setFromObject(staticNumberblock.mesh);
        if (playerBox.intersectsBox(staticBox)) {
            // Only handle collision if we have an operator
            if (operatorManager && operatorManager.getHeldOperator()) {
                handleNumberblockCollision(staticNumberblock);
                
                // Remove the static Numberblock
                scene.remove(staticNumberblock.mesh);
                staticNumberblock = null;
                
                // Create a new static Numberblock
                const value = Math.floor(Math.random() * 20) + 1;
                staticNumberblock = createStaticNumberblock(value, { x: 0, z: -5 });
                
                // Position it randomly, away from the player
                let posX, posZ;
                do {
                    posX = (Math.random() * 40) - 20;
                    posZ = (Math.random() * 40) - 20;
                } while (
                    Math.abs(posX - playerNumberblock.mesh.position.x) < 5 && 
                    Math.abs(posZ - playerNumberblock.mesh.position.z) < 5
                );
                
                staticNumberblock.mesh.position.set(posX, staticNumberblock.blockSize / 2, posZ);
                scene.add(staticNumberblock.mesh);
                
                if (typeof addCollidableObject === 'function') {
                    addCollidableObject(staticNumberblock.mesh);
                }
            }
        }
    }
    
    // Check collisions with random Numberblocks
    for (let i = numberblocks.length - 1; i >= 0; i--) {
        const numberblock = numberblocks[i];
        if (!numberblock || !numberblock.mesh) continue;
        
        const blockBox = new THREE.Box3().setFromObject(numberblock.mesh);
        if (playerBox.intersectsBox(blockBox)) {
            // Only handle collision if we have an operator
            if (operatorManager && operatorManager.getHeldOperator()) {
                handleNumberblockCollision(numberblock);
                
                // Remove the collided Numberblock
                scene.remove(numberblock.mesh);
                numberblocks.splice(i, 1);
                
                // Create a new Numberblock to replace it
                const value = Math.floor(Math.random() * 20) + 1;
                const newBlock = new Numberblock(value);
                
                // Position it randomly, away from the player
                let posX, posZ;
                do {
                    posX = (Math.random() * 40) - 20;
                    posZ = (Math.random() * 40) - 20;
                } while (
                    Math.abs(posX - playerNumberblock.mesh.position.x) < 5 && 
                    Math.abs(posZ - playerNumberblock.mesh.position.z) < 5
                );
                
                newBlock.mesh.position.set(posX, newBlock.blockSize / 2, posZ);
                scene.add(newBlock.mesh);
                numberblocks.push(newBlock);
                
                if (typeof addCollidableObject === 'function') {
                    addCollidableObject(newBlock.mesh);
                }
            }
        }
    }
}

// Handle collision with a Numberblock
function handleNumberblockCollision(hitNumberblock) {
    // Only apply operation if we have an operator
    const operatorType = operatorManager.getHeldOperator();
    if (operatorType) {
        const oldValue = playerNumberblock.value;
        let newValue;
        
        if (operatorType === 'plus') {
            newValue = oldValue + hitNumberblock.value;
        } else {
            newValue = oldValue - hitNumberblock.value;
        }
        
        // Ensure value stays positive
        newValue = Math.max(1, newValue);
        
        // Update player's Numberblock
        playerNumberblock.setValue(newValue);
        updatePlayerDisplay(newValue);
        
        // Clear the held operator
        operatorManager.clearHeldOperator();
        updateOperatorDisplay(null);
        
        // Update camera position for new height
        updateCameraForNumberblockChange();
        
        console.log(`Applied ${operatorType} operation: ${oldValue} ${operatorType === 'plus' ? '+' : '-'} ${hitNumberblock.value} = ${newValue}`);
    }
}

// Update camera position after Numberblock changes size
function updateCameraForNumberblockChange() {
    if (controls && playerNumberblock) {
        const controlsObject = controls.getObject();
        const numberblockHeight = playerNumberblock.getHeight();
        
        // Calculate new appropriate camera height
        const verticalOffset = Math.max(1.5, numberblockHeight * 0.6);
        const desiredCameraHeight = playerNumberblock.mesh.position.y + verticalOffset;
        
        // Set camera to new height
        controlsObject.position.y = desiredCameraHeight;
        
        // Ensure camera doesn't go below minimum height
        const minCameraHeight = 1.0;
        if (controlsObject.position.y < minCameraHeight) {
            controlsObject.position.y = minCameraHeight;
        }
    }
}

// Check for collisions between player's Numberblock and operators
function checkOperatorCollisions() {
    try {
        if (!playerNumberblock || !operatorManager) return;
        
        const playerBox = new THREE.Box3().setFromObject(playerNumberblock.mesh);
        if (!playerBox) {
            console.warn("Could not create player's bounding box");
            return;
        }
        
        // Get all operators
        const operators = operatorManager.getOperators();
        
        // Check collision with each operator
        operators.forEach(operator => {
            const operatorBox = new THREE.Box3().setFromObject(operator.mesh);
            if (playerBox.intersectsBox(operatorBox)) {
                // Set the held operator and update display
                operatorManager.setHeldOperator(operator, playerNumberblock);
                updateOperatorDisplay(operator.type);
            }
        });
    } catch (error) {
        console.error("Error in checkOperatorCollisions:", error);
    }
}

// Add view toggle with V key
document.addEventListener('keydown', (event) => {
    if (event.code === 'KeyV') {
        window.isFirstPerson = !window.isFirstPerson;

        const controlsInfo = document.getElementById('controls-info');
        if (controlsInfo) controlsInfo.style.display = 'none'; // Always hide in both modes

        if (window.isFirstPerson) {
            // Switch to first-person view
            
            // Remove any third-person mouse control listeners if they exist
            if (window.thirdPersonMouseControlsActive) {
                document.removeEventListener('mousemove', window.thirdPersonMouseHandler);
                window.thirdPersonMouseControlsActive = false;
            }
            
            // Reset camera and attach to controls
            scene.remove(camera);
            controls.getObject().add(camera);
            camera.position.set(0, 0, 0);
            camera.rotation.set(0, 0, 0);
            
            // Position controls at Numberblock's head position
            controls.getObject().position.copy(playerNumberblock.mesh.position);
            controls.getObject().position.y += playerNumberblock.getHeight() / 2;
            
            // Set rotation to match Numberblock exactly
            controls.getObject().rotation.y = playerNumberblock.mesh.rotation.y;
            
            // Make sure pointer is locked
            if (!controls.isLocked) {
                controls.lock();
            }
        } else {
            // Use dedicated function for switching to third-person
            switchToThirdPersonView();
        }

        camera.updateProjectionMatrix();

        // Update HUD view mode display
        const viewModeDisplay = document.getElementById('view-mode-display');
        if (viewModeDisplay) {
            viewModeDisplay.textContent = window.isFirstPerson ? 'First Person View' : 'Third Person View';
            viewModeDisplay.style.opacity = '1';
            setTimeout(() => viewModeDisplay.style.opacity = '0', 2000);
        }
    }
});

// Initialize the scene when the page loads
document.addEventListener('DOMContentLoaded', init);
