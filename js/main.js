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
    
    // Calculate time delta for smooth movement
    const delta = clock.getDelta();
    
    // Always update controls for movement
    if (controls && typeof updateControls === 'function') {
        updateControls(controls, delta);
    }
    
    // Update player position based on view mode
    if (window.isFirstPerson) {
        // First-person: Numberblock follows the camera/controls
        updatePlayerPosition();
    } else {
        // Third-person: Camera follows the Numberblock
        updateThirdPersonCamera();
    }
    
    // Update operator system
    if (operatorManager) {
        operatorManager.update(delta);
    }
    
    // Check for collisions
    checkOperatorCollisions();
    checkNumberblockCollisions();
    
    // Render the scene
    renderer.render(scene, camera);
}

// Update player position in first-person mode
function updatePlayerPosition() {
    if (playerNumberblock && controls) {
        const controlsObject = controls.getObject();
        
        // Update Numberblock position to match controls
        playerNumberblock.mesh.position.x = controlsObject.position.x;
        playerNumberblock.mesh.position.z = controlsObject.position.z;
        
        // Adjust Y position based on Numberblock height
        const yOffset = playerNumberblock.getHeight() / 2;
        playerNumberblock.mesh.position.y = controlsObject.position.y - yOffset;
        
        // Match ONLY horizontal rotation to camera's direction (Y-axis)
        playerNumberblock.mesh.rotation.y = controlsObject.rotation.y;
        
        // We do NOT modify camera rotation here, allowing PointerLockControls to handle it
    }
}

// Update camera position in third-person mode
function updateThirdPersonCamera() {
    if (playerNumberblock && playerNumberblock.mesh) {
        // Make sure camera is detached from controls in third-person
        if (camera.parent !== scene) {
            const worldPosition = new THREE.Vector3();
            const worldQuaternion = new THREE.Quaternion();
            camera.getWorldPosition(worldPosition);
            camera.getWorldQuaternion(worldQuaternion);
            
            camera.parent.remove(camera);
            scene.add(camera);
            camera.position.copy(worldPosition);
            camera.quaternion.copy(worldQuaternion);
        }
        
        // Position camera behind and above the Numberblock
        const distance = 12;
        const height = 10;
        
        // Get Numberblock's forward direction from rotation
        const playerAngle = playerNumberblock.mesh.rotation.y;
        const offsetX = Math.sin(playerAngle) * distance;
        const offsetZ = Math.cos(playerAngle) * distance;
        
        camera.position.x = playerNumberblock.mesh.position.x - offsetX;
        camera.position.z = playerNumberblock.mesh.position.z - offsetZ;
        camera.position.y = playerNumberblock.mesh.position.y + height;
        
        // Look at the Numberblock
        camera.lookAt(
            playerNumberblock.mesh.position.x,
            playerNumberblock.mesh.position.y + playerNumberblock.getHeight() / 2,
            playerNumberblock.mesh.position.z
        );
    }
}

// Check for collisions between player Numberblock and other Numberblocks
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
        console.log('View mode toggled to: ' + (window.isFirstPerson ? 'first-person' : 'third-person'));
        
        // Always hide the controls info
        const controlsInfo = document.getElementById('controls-info');
        if (controlsInfo) {
            controlsInfo.style.display = 'none';
        }
        
        if (window.isFirstPerson) {
            // First-person: Properly reattach camera to controls
            if (controls && playerNumberblock) {
                // Store the current player position
                const playerPosition = playerNumberblock.mesh.position.clone();
                const playerRotation = playerNumberblock.mesh.rotation.y;
                
                // Detach camera from scene and reattach to controls if needed
                if (camera.parent === scene) {
                    scene.remove(camera);
                    
                    // Reset camera local position and rotation
                    camera.position.set(0, 0, 0);
                    camera.rotation.set(0, 0, 0);
                    
                    // Add back to controls
                    controls.getObject().add(camera);
                }
                
                // Reposition controls object at the player's head
                const numberblockHeight = playerNumberblock.getHeight();
                const verticalOffset = Math.max(1.5, numberblockHeight * 0.6);
                
                controls.getObject().position.copy(playerNumberblock.mesh.position);
                controls.getObject().position.y += verticalOffset;
                
                // Match rotation with playerNumberblock but flip 180 degrees to face forward
                controls.getObject().rotation.y = playerNumberblock.mesh.rotation.y + Math.PI;
                
                // Keep controls locked in first-person
                if (typeof controls.lock === 'function') {
                    // We call lock() but don't allow it to show the instructions
                    // This maintains pointer capture without showing the message
                    controls.isLocked = true; // Manually set locked state
                    
                    // Perform lock without showing instructions
                    if (document.pointerLockElement !== controls.domElement && 
                        document.mozPointerLockElement !== controls.domElement) {
                        controls.domElement.requestPointerLock();
                    }
                }
            }
        } else {
            // Third-person: Properly detach camera while maintaining control
            
            // Detach camera from controls and add to scene
            if (camera.parent !== scene) {
                // Get the world position before detaching
                const worldPosition = new THREE.Vector3();
                const worldQuaternion = new THREE.Quaternion();
                camera.getWorldPosition(worldPosition);
                camera.getWorldQuaternion(worldQuaternion);
                
                // Remove camera from parent (controls)
                camera.parent.remove(camera);
                
                // Add to scene at the world position
                scene.add(camera);
                camera.position.copy(worldPosition);
                camera.quaternion.copy(worldQuaternion);
            }
            
            // Force immediate update of camera position for third-person
            if (playerNumberblock && playerNumberblock.mesh) {
                // Position camera behind and above the Numberblock
                const distance = 12;
                const height = 10;
                
                const playerAngle = playerNumberblock.mesh.rotation.y;
                const offsetX = Math.sin(playerAngle) * distance;
                const offsetZ = Math.cos(playerAngle) * distance;
                
                camera.position.x = playerNumberblock.mesh.position.x - offsetX;
                camera.position.z = playerNumberblock.mesh.position.z - offsetZ;
                camera.position.y = playerNumberblock.mesh.position.y + height;
                
                camera.lookAt(
                    playerNumberblock.mesh.position.x,
                    playerNumberblock.mesh.position.y + playerNumberblock.getHeight() / 2,
                    playerNumberblock.mesh.position.z
                );
            }
        }
        
        // Show view mode message
        const viewModeDisplay = document.getElementById('view-mode-display');
        if (viewModeDisplay) {
            viewModeDisplay.innerHTML = window.isFirstPerson ? 'First Person View' : 'Third Person View';
            viewModeDisplay.style.opacity = '1';
            
            // Hide the message after 2 seconds
            setTimeout(() => {
                viewModeDisplay.style.opacity = '0';
            }, 2000);
        }
    }
});

// Initialize the scene when the page loads
document.addEventListener('DOMContentLoaded', init);
