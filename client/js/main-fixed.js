// Numberblocks game - Main game logic

// Debug support
const DEBUG = true;
const debugPanel = document.getElementById('debug-panel');

function debug(message, isError = false) {
    if (!DEBUG) return;
    
    console.log(`[DEBUG] ${message}`);
    
    if (debugPanel) {
        const messageElement = document.createElement('div');
        messageElement.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        if (isError) {
            messageElement.style.color = '#ff5555';
            console.error(`[ERROR] ${message}`);
        }
        debugPanel.appendChild(messageElement);
        debugPanel.scrollTop = debugPanel.scrollHeight;
    }
}

// Game variables
let scene, camera, renderer;
let controls;
let playerNumberblock;
let operatorManager;
let prevTime = performance.now();
let playerValue = 1;

// Movement keys state
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let turnLeft = false;
let turnRight = false;

// Physics variables
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let canJump = true;

// Rotation variables for Q/E keys
const rotationQuaternion = new THREE.Quaternion();
const worldUp = new THREE.Vector3(0, 1, 0);
const rotationAxis = new THREE.Vector3();

// Add global variable for tracking view mode
window.isFirstPerson = true;

// HUD elements
const gameHUD = document.getElementById('game-hud');

// Initialize the game
window.onload = function() {
    debug('Window loaded, initializing game...');
    
    // Add view toggle button
    addViewToggleButton();
    
    init();
};

// Add view toggle button to switch between first and third person
function addViewToggleButton() {
    const viewToggleBtn = document.createElement('button');
    viewToggleBtn.id = 'view-toggle';
    viewToggleBtn.innerText = 'Switch to Third Person';
    viewToggleBtn.style.position = 'absolute';
    viewToggleBtn.style.bottom = '20px';
    viewToggleBtn.style.right = '20px';
    viewToggleBtn.style.zIndex = '1000';
    viewToggleBtn.style.padding = '10px';
    viewToggleBtn.style.backgroundColor = 'rgba(0,0,0,0.7)';
    viewToggleBtn.style.color = 'white';
    viewToggleBtn.style.border = 'none';
    viewToggleBtn.style.borderRadius = '5px';
    viewToggleBtn.style.cursor = 'pointer';
    
    // Append to body
    document.body.appendChild(viewToggleBtn);
    
    // Add toggle functionality
    viewToggleBtn.addEventListener('click', toggleCameraView);
}

// Toggle between first and third person views
function toggleCameraView() {
    window.isFirstPerson = !window.isFirstPerson;
    
    const viewToggleBtn = document.getElementById('view-toggle');
    if (viewToggleBtn) {
        viewToggleBtn.innerText = window.isFirstPerson ? 'Switch to Third Person' : 'Switch to First Person';
    }
    
    if (window.isFirstPerson) {
        debug('Switched to first-person view');
        switchToFirstPersonView();
    } else {
        debug('Switched to third-person view');
        switchToThirdPersonView();
    }
}

// Switch to first-person view
function switchToFirstPersonView() {
    // Make sure camera is only in one place
    if (camera.parent === scene) {
        scene.remove(camera);
    }
    
    // Add camera to controls
    if (camera.parent !== controls.getObject()) {
        // First reset camera position and rotation to avoid invalid transforms
        camera.position.set(0, 0, 0);
        camera.rotation.set(0, 0, 0);
        controls.getObject().add(camera);
    }
    
    // Remove third-person mouse handler if active
    if (window.thirdPersonMouseHandler) {
        document.removeEventListener('mousemove', window.thirdPersonMouseHandler);
        window.thirdPersonMouseControlsActive = false;
    }
}

// Switch to third-person view
function switchToThirdPersonView() {
    // Make sure the camera is only in one place at a time
    if (camera.parent === controls.getObject()) {
        // If camera is attached to controls, remove it first
        controls.getObject().remove(camera);
    }
    
    // Only add to scene if it's not already there
    if (camera.parent !== scene) {
        scene.add(camera);
    }
    
    // Reset camera's up vector to ensure correct orientation
    camera.up.set(0, 1, 0);
    
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
    const targetY = playerPos.y + (playerNumberblock.getHeight ? playerNumberblock.getHeight() / 2 : 1);
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

// Main initialization function
function init() {
    try {
        debug('Starting initialization...');
        
        // Create the scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87CEEB); // Sky blue
        debug('Scene created');
        
        // Create the camera
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 2, 5);
        debug('Camera created');
        
        // Create the renderer
        renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('game-canvas'),
            antialias: true
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        debug('Renderer created');
        
        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        scene.add(directionalLight);
        debug('Lights added');
        
        // Create a test cube to verify rendering
        const testCube = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshStandardMaterial({ color: 0xff0000 })
        );
        testCube.position.set(0, 0, -5);
        scene.add(testCube);
        debug('Test cube created');
        
        // Render the test cube to verify rendering is working
        renderer.render(scene, camera);
        debug('Initial render completed');
        
        // Setup Pointer Lock Controls
        setupPointerLockControls();
        
        // Initialize floor
        initFloor();
        
        // Initialize player Numberblock
        initPlayerNumberblock();
        
        // Initialize networking
        initNetworkingSystem();
        
        // Event listeners
        window.addEventListener('resize', onWindowResize);
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        
        // Start the animation loop
        debug('Starting animation loop');
        animate();
    } catch (error) {
        debug(`Initialization error: ${error.message}`, true);
        console.error(error);
        emergencyRender();
    }
}

// Setup Pointer Lock Controls
function setupPointerLockControls() {
    debug('Setting up PointerLock controls');
    
    try {
        controls = new THREE.PointerLockControls(camera, document.body);
        scene.add(controls.getObject());
        
        const onPointerLockChange = function() {
            if (document.pointerLockElement === document.body) {
                debug('Pointer Lock enabled');
                controls.enabled = true;
            } else {
                debug('Pointer Lock disabled');
                controls.enabled = false;
            }
        };
        
        // Add event listeners for pointer lock
        document.addEventListener('pointerlockchange', onPointerLockChange);
        document.addEventListener('pointerlockerror', () => {
            debug('Pointer Lock error');
        });
        
        // Click to enable pointer lock
        document.addEventListener('click', () => {
            if (document.pointerLockElement !== document.body) {
                controls.lock();
            }
        });
    } catch (error) {
        debug(`Error setting up PointerLock controls: ${error.message}`, true);
    }
}

// Function to create the floor
function initFloor() {
    debug('Creating floor');
    
    try {
        const floorGeometry = new THREE.PlaneGeometry(100, 100);
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x7EC0EE, // Light blue color that matches sky theme
            roughness: 0.8
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2; // Rotate to be horizontal
        floor.position.y = -0.5; // Position below the player
        scene.add(floor);
        debug('Floor created');
    } catch (error) {
        debug(`Error creating floor: ${error.message}`, true);
    }
}

// Initialize the player's Numberblock
function initPlayerNumberblock() {
    debug('Creating player Numberblock');
    
    try {
        playerNumberblock = new Numberblock(playerValue);
        scene.add(playerNumberblock.mesh);
        playerNumberblock.mesh.position.set(0, 0, 0);
        debug('Player Numberblock created');
        
        // Update HUD
        updateHUD();
    } catch (error) {
        debug(`Error creating player Numberblock: ${error.message}`, true);
    }
}

// Initialize networking for multiplayer
function initNetworkingSystem() {
    debug('Initializing networking system');
    
    try {
        // Check if initNetworking is defined in network.js
        if (typeof window.initNetworking === 'function') {
            debug('Found networking module, attempting to connect...');
            window.initNetworking()
                .then(() => {
                    debug('Networking initialized successfully');
                })
                .catch(error => {
                    debug(`Networking error: ${error.message}`, true);
                });
        } else {
            debug('Networking module not detected, continuing in local mode');
        }
    } catch (error) {
        debug(`Error initializing networking: ${error.message}`, true);
    }
}

// Emergency render function - displays a simple scene if initialization fails
function emergencyRender() {
    debug('Attempting emergency render', true);
    
    try {
        // Create a very basic scene
        const emergencyScene = new THREE.Scene();
        emergencyScene.background = new THREE.Color(0x333333);
        
        const emergencyCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10);
        emergencyCamera.position.z = 2;
        
        const emergencyGeometry = new THREE.BoxGeometry(1, 1, 1);
        const emergencyMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
        const emergencyCube = new THREE.Mesh(emergencyGeometry, emergencyMaterial);
        emergencyScene.add(emergencyCube);
        
        // Add text to indicate error
        const textDiv = document.createElement('div');
        textDiv.style.position = 'absolute';
        textDiv.style.top = '10px';
        textDiv.style.left = '10px';
        textDiv.style.color = 'white';
        textDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
        textDiv.style.padding = '10px';
        textDiv.style.fontFamily = 'monospace';
        textDiv.textContent = 'Initialization Error! Check console for details.';
        document.body.appendChild(textDiv);
        
        // Render the emergency scene
        renderer.render(emergencyScene, emergencyCamera);
        debug('Emergency render complete');
    } catch (error) {
        debug(`Emergency render failed: ${error.message}`, true);
        alert('Critical rendering error: ' + error.message);
    }
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Handle keyboard input
function onKeyDown(event) {
    try {
        if (document.activeElement !== document.body) return; // Skip if focused on input
        
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                moveForward = true;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                moveLeft = true;
                break;
            case 'ArrowDown':
            case 'KeyS':
                moveBackward = true;
                break;
            case 'ArrowRight':
            case 'KeyD':
                moveRight = true;
                break;
            case 'Space':
                if (canJump) {
                    velocity.y = 5.0;
                    canJump = false;
                }
                break;
            case 'KeyV':
                // Toggle between first and third person view
                toggleCameraView();
                break;
            case 'KeyQ':
                // Turn left
                turnLeft = true;
                if (window.isFirstPerson) {
                    // Use quaternion rotation around world up axis (y-axis)
                    rotationAxis.copy(worldUp);
                    const rotationAngle = 0.05; // Same amount as before
                    rotationQuaternion.setFromAxisAngle(rotationAxis, rotationAngle);
                    
                    // Apply to the camera object - this matches how PointerLockControls works
                    controls.getObject().quaternion.premultiply(rotationQuaternion);
                }
                break;
            case 'KeyE':
                // Turn right
                turnRight = true;
                if (window.isFirstPerson) {
                    // Use quaternion rotation around world up axis (y-axis)
                    rotationAxis.copy(worldUp);
                    const rotationAngle = -0.05; // Negative for right turn
                    rotationQuaternion.setFromAxisAngle(rotationAxis, rotationAngle);
                    
                    // Apply to the camera object - this matches how PointerLockControls works
                    controls.getObject().quaternion.premultiply(rotationQuaternion);
                }
                break;
        }
    } catch (error) {
        debug(`KeyDown error: ${error.message}`, true);
    }
}

function onKeyUp(event) {
    try {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                moveForward = false;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                moveLeft = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                moveBackward = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                moveRight = false;
                break;
            case 'KeyQ':
                turnLeft = false;
                break;
            case 'KeyE':
                turnRight = false;
                break;
        }
    } catch (error) {
        debug(`KeyUp error: ${error.message}`, true);
    }
}

// Animation loop
function animate() {
    try {
        requestAnimationFrame(animate);
        
        if (controls) {
            // Only update player position if pointer lock is enabled
            if (controls.isLocked) {
                if (window.isFirstPerson) {
                    updatePlayerPosition();
                } else {
                    updatePlayerPositionThirdPerson();
                    updateThirdPersonCamera();
                }
            }
        }
        
        // Rotate operators to face player
        updateOperators();
        
        // Check for collisions
        checkCollisions();
        
        // Render the scene
        renderer.render(scene, camera);
    } catch (error) {
        debug(`Animation error: ${error.message}`, true);
    }
}

// Update player position in third-person mode
function updatePlayerPositionThirdPerson() {
    try {
        if (!playerNumberblock || !controls) return;
        
        const time = performance.now();
        
        if (!prevTime) {
            prevTime = time;
            return;
        }
        
        const delta = (time - prevTime) / 1000;
        const moveSpeed = 5.0; // Movement speed as specified in memory
        const rotationSpeed = 2.0; // Rotation speed for Q/E keys
        
        // Get camera's current direction vectors, using proper forward/right orientation
        const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        
        // Project to horizontal plane by zeroing Y and normalizing
        const forward = cameraDirection.clone().setY(0).normalize();
        const right = cameraRight.clone().setY(0).normalize();
        
        // Calculate desired movement direction from keyboard input
        const movement = new THREE.Vector3();
        if (moveForward) movement.add(forward);
        if (moveBackward) movement.sub(forward);
        if (moveLeft) movement.sub(right);
        if (moveRight) movement.add(right);
        
        // Apply gravity
        velocity.y -= 9.8 * delta;
        
        if (movement.length() > 0) {
            movement.normalize().multiplyScalar(moveSpeed * delta);
            
            // Update player position
            playerNumberblock.mesh.position.add(movement);
            
            // Rotate player to face movement direction if moving (and no manual rotation with Q/E)
            if (!turnLeft && !turnRight) {
                const targetAngle = Math.atan2(movement.x, movement.z);
                playerNumberblock.mesh.rotation.y = targetAngle;
            }
        }
        
        // Update vertical position with gravity
        playerNumberblock.mesh.position.y += velocity.y * delta;
        
        // Check for floor collision
        if (playerNumberblock.mesh.position.y < 0.5) {
            velocity.y = 0;
            playerNumberblock.mesh.position.y = 0.5;
            canJump = true;
        }
        
        // Rotate player using Q/E keys
        if (turnLeft) playerNumberblock.mesh.rotation.y += rotationSpeed * delta;
        if (turnRight) playerNumberblock.mesh.rotation.y -= rotationSpeed * delta;
        
        // Send position to server for multiplayer
        if (typeof window.room !== 'undefined' && window.room) {
            window.room.send("updatePosition", {
                x: playerNumberblock.mesh.position.x,
                y: playerNumberblock.mesh.position.y,
                z: playerNumberblock.mesh.position.z,
                rotation: playerNumberblock.mesh.rotation.y
            });
        }
        
        prevTime = time;
    } catch (error) {
        debug(`Error in updatePlayerPositionThirdPerson: ${error.message}`, true);
    }
}

// Update third-person camera position
function updateThirdPersonCamera() {
    try {
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
        if (turnLeft) window.thirdPersonCameraAngle += rotationSpeed;
        if (turnRight) window.thirdPersonCameraAngle -= rotationSpeed;
        
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
        const heightAdjustment = playerNumberblock.getHeight ? playerNumberblock.getHeight() / 2 : 1;
        camera.lookAt(
            playerNumberblock.mesh.position.x,
            targetY - (heightOffset / 2),
            playerNumberblock.mesh.position.z
        );
    } catch (error) {
        debug(`Error in updateThirdPersonCamera: ${error.message}`, true);
    }
}

// Update player position based on controls (first-person mode)
function updatePlayerPosition() {
    const time = performance.now();
    
    if (!prevTime) {
        prevTime = time;
        return;
    }
    
    const delta = (time - prevTime) / 1000;
    
    // Apply movement damping
    velocity.x -= velocity.x * 5.0 * delta; 
    velocity.z -= velocity.z * 5.0 * delta;
    
    // Apply gravity (9.8 as specified in memory)
    velocity.y -= 9.8 * delta;
    
    // Calculate movement direction based on input
    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize(); // Ensure consistent movement regardless of direction
    
    // Apply movement force (scaled to achieve 5.0 units/sec)
    if (moveForward || moveBackward) velocity.z -= direction.z * 5.0 * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * 5.0 * delta;
    
    // Apply velocity to controls for movement
    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
    
    // Apply jump physics
    controls.getObject().position.y += velocity.y * delta;
    
    // Check for floor collision
    if (controls.getObject().position.y < 1.0) { // Player height is 2.0 units
        velocity.y = 0;
        controls.getObject().position.y = 1.0;
        canJump = true;
    }
    
    // Update position of player's Numberblock to match camera in first-person view
    if (playerNumberblock) {
        // Copy position with an adjustment for height
        const controlsPosition = controls.getObject().position.clone();
        playerNumberblock.mesh.position.set(
            controlsPosition.x,
            controlsPosition.y - 1.0, // Position below camera
            controlsPosition.z
        );
        
        // Make Numberblock rotation exactly match camera rotation
        const euler = new THREE.Euler().setFromQuaternion(controls.getObject().quaternion, 'YXZ');
        playerNumberblock.mesh.rotation.y = euler.y; // Only use Y rotation
    }
    
    // Send position to server for multiplayer
    if (typeof window.room !== 'undefined' && window.room) {
        window.room.send("updatePosition", {
            x: playerNumberblock.mesh.position.x,
            y: playerNumberblock.mesh.position.y,
            z: playerNumberblock.mesh.position.z,
            rotation: controls.getObject().rotation.y
        });
    }
    
    prevTime = time;
}

// Check for collisions with operators and other Numberblocks
function checkCollisions() {
    // Will be implemented with proper collision detection
}

// Update and rotate all operators to face the player
function updateOperators() {
    // To be implemented
}

// Update player's Numberblock value
function updatePlayerValue(newValue) {
    try {
        playerValue = newValue;
        
        // Update the Numberblock
        if (playerNumberblock) {
            scene.remove(playerNumberblock.mesh);
            playerNumberblock = new Numberblock(playerValue);
            scene.add(playerNumberblock.mesh);
            
            // Position it correctly based on camera/controls
            if (window.isFirstPerson) {
                playerNumberblock.mesh.position.copy(controls.getObject().position);
                playerNumberblock.mesh.position.y -= 1.0; // Position below camera
                playerNumberblock.mesh.rotation.y = controls.getObject().rotation.y;
            }
        }
        
        // Update HUD
        updateHUD();
        
        debug(`Player value updated to ${playerValue}`);
    } catch (error) {
        debug(`Error updating player value: ${error.message}`, true);
    }
}

// Update the HUD display
function updateHUD() {
    if (gameHUD) {
        gameHUD.innerHTML = `<div class="hud-value">Number: ${playerValue}</div>`;
    }
}

// For Numberblock prototype to enable getHeight() method
if (typeof window.Numberblock === 'undefined') {
    window.Numberblock = function() {};
    window.Numberblock.prototype.getHeight = function() {
        // Default height if not available
        return 2;
    };
}
