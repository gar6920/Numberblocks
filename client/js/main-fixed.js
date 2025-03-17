// Numberblocks game - Main game logic

// Debug support
const DEBUG = false;

function debug(message, isError = false) {
    if (!DEBUG) return;
    
    // Log to console only when debug is enabled
    if (isError) {
        console.error(`[ERROR] ${message}`);
    } else {
        console.log(`[DEBUG] ${message}`);
    }
}

// Game variables
let scene, camera, renderer, controls;
let playerNumberblock;
let operatorManager;
let playerValue = 1;

// Add operator tracking without redeclaring variables
let heldOperator = null;
let lastOperatorSpawn = 0;

// Rotation variables for Q/E keys
let rotationQuaternion = new THREE.Quaternion();
let worldUp = new THREE.Vector3(0, 1, 0);
let rotationAxis = new THREE.Vector3();

// Add global variable for tracking view mode
window.isFirstPerson = true;

// HUD elements
const gameHUD = document.getElementById('game-hud');

// Global variables and UI elements
let viewToggleBtn = null; // Global reference for the view toggle button

// Initialize networking variables
let lastSentPosition = new THREE.Vector3();
let lastSentRotation = 0;
let positionUpdateInterval = 100; // ms between position updates
let lastPositionUpdate = 0;

// Initialize the game
window.onload = function() {
    debug('Window loaded, initializing game...');
    
    // Add view toggle button
    addViewToggleButton();
    
    init();
};

// Add view toggle button to switch between first and third person
function addViewToggleButton() {
    try {
        // Create button if it doesn't exist
        viewToggleBtn = document.getElementById('view-toggle');
        
        if (!viewToggleBtn) {
            viewToggleBtn = document.createElement('button');
            viewToggleBtn.id = 'view-toggle';
            viewToggleBtn.textContent = 'Third Person View';
            viewToggleBtn.style.position = 'absolute';
            viewToggleBtn.style.bottom = '20px';
            viewToggleBtn.style.left = '20px';
            viewToggleBtn.style.zIndex = '100';
            viewToggleBtn.style.padding = '8px 12px';
            viewToggleBtn.style.backgroundColor = '#4CAF50';
            viewToggleBtn.style.color = 'white';
            viewToggleBtn.style.border = 'none';
            viewToggleBtn.style.borderRadius = '4px';
            viewToggleBtn.style.cursor = 'pointer';
            document.body.appendChild(viewToggleBtn);
        }
        
        // Add click event listener
        viewToggleBtn.addEventListener('click', toggleCameraView);
        
        debug('View toggle button added');
    } catch (error) {
        debug(`Error adding view toggle button: ${error.message}`, true);
    }
}

// Toggle between first and third person views
function toggleCameraView() {
    window.isFirstPerson = !window.isFirstPerson;
    
    const viewToggleBtn = document.getElementById('view-toggle');
    if (viewToggleBtn) {
        viewToggleBtn.innerText = window.isFirstPerson ? 'Switch to Third Person' : 'Switch to First Person';
    }
    
    // Store the current position before switching views to ensure consistency
    const currentPosition = playerNumberblock ? playerNumberblock.mesh.position.clone() : null;
    const currentRotation = playerNumberblock ? playerNumberblock.mesh.rotation.y : 0;
    
    if (window.isFirstPerson) {
        debug('Switched to first-person view');
        switchToFirstPersonView();
    } else {
        debug('Switched to third-person view');
        switchToThirdPersonView();
    }
    
    // After switching views, ensure position consistency
    if (currentPosition && playerNumberblock) {
        playerNumberblock.mesh.position.copy(currentPosition);
        playerNumberblock.mesh.rotation.y = currentRotation;
        
        // If in first-person mode, also update controls position
        if (window.isFirstPerson && controls) {
            controls.getObject().position.set(
                currentPosition.x,
                currentPosition.y + 1.0, // Adjust for eye height
                currentPosition.z
            );
        }
        
        // Force a position update to the server to ensure sync
        if (typeof window.room !== 'undefined' && window.room) {
            window.room.send("updatePosition", {
                x: playerNumberblock.mesh.position.x,
                y: playerNumberblock.mesh.position.y,
                z: playerNumberblock.mesh.position.z,
                rotation: playerNumberblock.mesh.rotation.y
            });
        }
    }
}

// Switch to first-person view
function switchToFirstPersonView() {
    try {
        debug('Switched to first-person view');
        
        // Set global flag
        window.isFirstPerson = true;
        
        // Check if camera is already a child of controls
        // First make sure we're not trying to add camera as a child of itself
        if (camera.parent !== controls.getObject() && camera !== controls.getObject()) {
            // Remove camera from any previous parent
            if (camera.parent) {
                camera.parent.remove(camera);
            }
            
            // Add camera to controls (only if not already there)
            controls.getObject().add(camera);
        }
        
        // Reset camera position relative to controls
        camera.position.set(0, 0, 0);
        
        // Update button text
        if (viewToggleBtn) {
            viewToggleBtn.textContent = 'Third Person View';
        }
    } catch (error) {
        debug(`Error switching to first-person view: ${error.message}`, true);
    }
}

// Switch to third-person view
function switchToThirdPersonView() {
    try {
        debug('Switched to third-person view');
        
        // Set global flag
        window.isFirstPerson = false;
        
        // Remove camera from controls
        if (camera.parent) {
            const cameraWorldPosition = new THREE.Vector3();
            camera.getWorldPosition(cameraWorldPosition);
            camera.parent.remove(camera);
            
            // Add camera directly to scene
            scene.add(camera);
            
            // Maintain world position
            camera.position.copy(cameraWorldPosition);
        }
        
        // Set up third-person mouse handler if it doesn't exist
        if (!window.thirdPersonMouseHandler) {
            window.thirdPersonMouseHandler = function(event) {
                // Only process if we're in third-person mode and pointer is locked
                if (!window.isFirstPerson && controls.isLocked) {
                    // Skip processing extremely small movements to prevent drift
                    if (Math.abs(event.movementX) > 0.5) {
                        window.thirdPersonCameraAngle -= event.movementX * 0.002;
                    }
                }
            };
        }
        
        // Add mouse movement handler
        document.addEventListener('mousemove', window.thirdPersonMouseHandler);
        
        // Initialize camera angle if it's not set yet
        if (typeof window.thirdPersonCameraAngle === 'undefined') {
            window.thirdPersonCameraAngle = playerNumberblock.mesh.rotation.y + Math.PI;
        }
        
        // Update button text
        if (viewToggleBtn) {
            viewToggleBtn.textContent = 'First Person View';
        }
    } catch (error) {
        debug(`Error switching to third-person view: ${error.message}`, true);
    }
}

// Main initialization function
function init() {
    try {
        debug('Initializing game');
        
        // Initialize scene
        initScene();
        
        // Create the camera
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 2, 5); // Start a bit back to see the player
        
        // Setup renderer
        debug('Setting up renderer');
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputEncoding = THREE.sRGBEncoding; // Better color representation
        renderer.gammaFactor = 2.2; // Standard gamma correction
        
        // Add renderer to document
        document.body.appendChild(renderer.domElement);
        
        // Make renderer globally available
        window.renderer = renderer;
        
        // Initialize the floor
        initFloor();
        
        // Add decorative objects back
        addDecorativeObjects();
        
        // Add static Numberblocks
        addStaticNumberblocks();
        
        // Create player's Numberblock
        initPlayerNumberblock();
        
        // Setup event listeners
        window.addEventListener('resize', onWindowResize, false);
        
        // Setup controls based on the view mode
        debug('Setting up controls for initial view mode');
        setupPointerLockControls();
        
        // Initialize networking for multiplayer
        initNetworkingSystem();
        
        // Add button to toggle between first and third person
        addViewToggleButton();
        
        // Start the animation loop
        requestAnimationFrame(animate);
        
        debug('Game successfully initialized');
    } catch (error) {
        debug(`Full initialization error: ${error.message}`, true);
        console.error('Full initialization error:', error);
        emergencyRender();
    }
}

// Initialize the scene
function initScene() {
    try {
        debug('Creating scene');
        
        // Create the scene
        scene = new THREE.Scene();
        
        // Make scene globally available
        window.scene = scene;
        
        // Set background color
        scene.background = new THREE.Color(0x87CEEB); // Sky blue
        
        // Add fog for depth perception
        scene.fog = new THREE.Fog(0x87CEEB, 10, 100);
        
        // Add proper lighting with reduced intensity
        // Ambient light - provides overall illumination to the scene
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // Reduced from 0.8
        scene.add(ambientLight);
        
        // Directional light - mimics sunlight
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6); // Reduced from 1.0
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        scene.add(directionalLight);
        
        // Hemisphere light - for natural outdoor lighting (sky/ground gradient)
        const hemisphereLight = new THREE.HemisphereLight(0xddeeff, 0x3e2200, 0.4); // Reduced from 0.7
        scene.add(hemisphereLight);
        
        debug('Scene created successfully with softer lighting');
    } catch (error) {
        debug(`Error creating scene: ${error.message}`, true);
    }
}

// Initialize the floor
function initFloor() {
    try {
        debug('Creating floor');
        
        // Create a larger green floor with even darker color
        const floorGeometry = new THREE.PlaneGeometry(100, 100); // Extended size
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x114411,  // Much darker green color (almost forest green)
            roughness: 0.8, 
            metalness: 0.2 
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        
        // Rotate and position the floor
        floor.rotation.x = -Math.PI / 2; // Rotate to be horizontal
        floor.position.y = 0;
        floor.receiveShadow = true;
        scene.add(floor);
        
        // Add a grid helper for visual reference
        const gridHelper = new THREE.GridHelper(100, 100, 0x000000, 0x444444);
        scene.add(gridHelper);
        
        debug('Floor and grid created successfully');
    } catch (error) {
        debug(`Error creating floor: ${error.message}`, true);
    }
}

// Setup PointerLock controls
function setupPointerLockControls() {
    debug('Setting up PointerLock controls');
    
    try {
        // Create controls
        controls = new THREE.PointerLockControls(camera, document.body);
        debug('PointerLockControls initialized: ' + controls);
        
        // Make controls globally available
        window.controls = controls;
        
        // Use the existing instructions element from HTML
        let instructions = document.getElementById('lock-instructions');
        
        // Function to handle pointer lock change - simplified
        function onPointerLockChange() {
            if (document.pointerLockElement === document.body || 
                document.mozPointerLockElement === document.body ||
                document.webkitPointerLockElement === document.body) {
                
                // Pointer is locked, hide instructions
                if (instructions) {
                    instructions.style.display = 'none';
                }
                
                // Set first person active flag
                window.isFirstPerson = true;
                debug('Pointer is locked - first person active');
                
                // Ensure player starts on the ground when re-entering
                if (controls && controls.getObject()) {
                    // Only reset the Y position, not X and Z
                    const currentPos = controls.getObject().position;
                    if (currentPos.y > 5) { // If they're way up in the air
                        currentPos.y = 1.0; // Set to floor level + player height
                        window.velocity.y = 0;     // Reset vertical velocity
                    }
                }
            } else {
                // Only show instructions if we're not in preview mode
                if (!window.previewControlsMode && instructions) {
                    instructions.style.display = 'block';
                }
                debug('Pointer is unlocked');
            }
        }
        
        // Function to handle pointer lock error - simplified
        function onPointerLockError() {
            debug('Pointer lock error', true);
            
            // Enable preview controls without extra messages
            window.previewControlsMode = true;
            
            // Hide instructions after a delay
            setTimeout(() => {
                if (instructions) {
                    instructions.style.display = 'none';
                }
            }, 3000);
        }
        
        // Add event listeners for pointer lock
        document.addEventListener('click', function() {
            if (instructions && instructions.style.display !== 'none') {
                controls.lock();
            }
        });
        
        // Add pointer lock change and error event listeners
        document.addEventListener('pointerlockchange', onPointerLockChange);
        document.addEventListener('mozpointerlockchange', onPointerLockChange);
        document.addEventListener('webkitpointerlockchange', onPointerLockChange);
        
        document.addEventListener('pointerlockerror', onPointerLockError);
        document.addEventListener('mozpointerlockerror', onPointerLockError);
        document.addEventListener('webkitpointerlockerror', onPointerLockError);
        
        // Add controls to scene
        scene.add(controls.getObject());
        
        // Setup movement
        window.moveForward = false;
        window.moveBackward = false;
        window.moveLeft = false;
        window.moveRight = false;
        window.canJump = false;
        
        // Set up keyboard event listeners
        document.addEventListener('keydown', onKeyDown, false);
        document.addEventListener('keyup', onKeyUp, false);
        
        debug('PointerLock controls setup complete');
    } catch (error) {
        debug(`Error setting up PointerLock controls: ${error.message}`, true);
    }
}

// Update player movement physics
function updatePlayerPhysics(delta) {
    try {
        // Skip if controls are disabled or not initialized
        if (!controls) {
            console.log("Controls disabled or not initialized");
            return;
        }
        
        // Allow movement in preview mode even without pointer lock
        const isPreviewMode = window.previewControlsMode === true;
        
        // Skip if not locked (unless in preview mode)
        if (!controls.isLocked && !isPreviewMode) {
            return;
        }

        // Access variables from controls.js via window
        // Apply movement damping
        window.velocity.x -= window.velocity.x * 10.0 * delta; 
        window.velocity.z -= window.velocity.z * 10.0 * delta;
        
        // Apply gravity (9.8 as specified in memory)
        window.velocity.y -= 9.8 * delta;
        
        // Calculate movement direction based on input
        window.direction.z = Number(window.moveForward) - Number(window.moveBackward);
        window.direction.x = Number(window.moveRight) - Number(window.moveLeft);
        
        // Only normalize if we're actually moving
        if (window.direction.x !== 0 || window.direction.z !== 0) {
            window.direction.normalize(); // Ensure consistent movement regardless of direction
        }
        
        // Apply movement force (scaled to achieve 5.0 units/sec)
        // Using a higher value to compensate for damping
        // const moveSpeed = 50.0; // Using from controls.js
        
        if (window.moveForward || window.moveBackward) {
            window.velocity.z -= window.direction.z * window.moveSpeed * delta;
        }
        
        if (window.moveLeft || window.moveRight) {
            window.velocity.x -= window.direction.x * window.moveSpeed * delta;
        }
        
        // Handle Q/E rotation - turn left/right
        if (window.turnLeft) {
            // Calculate rotation amount
            const turnAmount = window.turnSpeed * delta;
            
            // Rotate the camera
            controls.getObject().rotation.y += turnAmount;
        }
        else if (window.turnRight) {
            // Calculate rotation amount
            const turnAmount = window.turnSpeed * delta;
            
            // Rotate the camera
            controls.getObject().rotation.y -= turnAmount;
        }
        
        // Handle jumping - only if on ground
        if (window.canJump && controls.getObject().position.y <= window.playerHeight) {
            if (window.jumpPressed) {
                window.velocity.y = Math.sqrt(2 * 9.8 * window.jumpHeight);
                window.canJump = false;
            }
        }
        
        // Apply velocity to controls for movement
        controls.moveRight(-window.velocity.x * delta);
        controls.moveForward(-window.velocity.z * delta);
        
        // Apply jump physics
        controls.getObject().position.y += window.velocity.y * delta;
        
        // Check for floor collision
        if (controls.getObject().position.y < 1.0) { // Player height is 2.0 units
            window.velocity.y = 0;
            controls.getObject().position.y = 1.0;
            window.canJump = true;
        }
        
        // Update player numberblock position AND ROTATION to match camera
        if (playerNumberblock) {
            // Update position
            playerNumberblock.mesh.position.copy(controls.getObject().position);
            
            // Get camera rotation (from controls quaternion)
            const cameraQuaternion = controls.getObject().quaternion;
            const euler = new THREE.Euler().setFromQuaternion(cameraQuaternion, 'YXZ');
            
            // Update numberblock rotation to match camera's Y rotation (yaw)
            playerNumberblock.mesh.rotation.y = euler.y;
            
            // Offset the numberblock to be at the player's feet
            const numberblockHeight = playerNumberblock.getHeight ? playerNumberblock.getHeight() : 1;
            playerNumberblock.mesh.position.y -= (window.playerHeight / 2) + (numberblockHeight / 2);
            
            // Force numberblock to be visible in first-person mode
            playerNumberblock.mesh.visible = true;
        }
        
        // Send movement to server
        sendRegularPositionUpdate();
    } catch (error) {
        console.error(`Error updating player movement: ${error.message}`);
    }
}

// Main animation loop
function animate() {
    try {
        // Request next animation frame 
        requestAnimationFrame(animate);
        
        // Calculate delta time
        const time = performance.now();
        const delta = Math.min((time - prevTime) / 1000, 0.1); // Cap delta to avoid large jumps
        
        // Update player movement based on view mode
        if (window.isFirstPerson) {
            updatePlayerPhysics(delta);
        } else {
            updatePlayerPositionThirdPerson(time, delta);
            updateThirdPersonCamera();
        }
        
        // Force position updates periodically for network
        if (time - lastPositionUpdate > positionUpdateInterval) {
            sendRegularPositionUpdate();
            lastPositionUpdate = time;
        }
        
        // Update operators
        updateOperators();
        
        // Check for collisions
        if (playerNumberblock) {
            checkCollisions();
        }
        
        // Render the scene
        renderer.render(scene, camera);
        
        // Update game loop vars
        prevTime = time;
    } catch (error) {
        debug(`Error in animate loop: ${error.message}`, true);
    }
}

// Send regular position updates to the server for multiplayer synchronization
function sendRegularPositionUpdate() {
    try {
        if (!window.room || typeof window.sendPlayerUpdate !== 'function') {
            return;
        }
        
        let currentPos, currentRot;
        
        // Get current position and rotation based on view mode
        if (window.isFirstPerson && controls) {
            currentPos = controls.getObject().position;
            currentRot = controls.getObject().rotation.y;
        } else if (playerNumberblock && playerNumberblock.mesh) {
            currentPos = playerNumberblock.mesh.position;
            currentRot = playerNumberblock.mesh.rotation.y;
        } else {
            return; // No valid position
        }
        
        // Always send updates (remove threshold check to ensure frequent updates)
        // This ensures other players always see your current position
        
        // Send update to server
        window.sendPlayerUpdate(
            currentPos,
            currentRot,
            window.isFirstPerson ? camera.rotation.x : 0,
            playerValue
        );
        
        // Update last sent values
        lastSentPosition.copy(currentPos);
        lastSentRotation = currentRot;
        
        // Debug log to confirm sending
        if (DEBUG) {
            console.log(`Position update sent: ${currentPos.x.toFixed(2)}, ${currentPos.y.toFixed(2)}, ${currentPos.z.toFixed(2)}`);
        }
    } catch (error) {
        console.error("Error sending regular position update:", error);
    }
}

// Update player position in third-person mode
function updatePlayerPositionThirdPerson(time, delta) {
    try {
        if (!playerNumberblock || !controls) return;
        
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
        if (window.moveForward) movement.add(forward);
        if (window.moveBackward) movement.sub(forward);
        if (window.moveLeft) movement.sub(right);
        if (window.moveRight) movement.add(right);
        
        // Apply gravity
        window.velocity.y -= 9.8 * delta;
        
        if (movement.length() > 0) {
            movement.normalize().multiplyScalar(moveSpeed * delta);
            
            // Update player position
            playerNumberblock.mesh.position.add(movement);
            
            // Rotate player to face movement direction if moving (and no manual rotation with Q/E)
            if (!window.turnLeft && !window.turnRight) {
                const targetAngle = Math.atan2(movement.x, movement.z);
                playerNumberblock.mesh.rotation.y = targetAngle;
            }
        }
        
        // Update vertical position with gravity
        playerNumberblock.mesh.position.y += window.velocity.y * delta;
        
        // Check for floor collision
        if (playerNumberblock.mesh.position.y < 0.5) {
            window.velocity.y = 0;
            playerNumberblock.mesh.position.y = 0.5;
            window.canJump = true;
        }
        
        // Rotate player using Q/E keys
        if (window.turnLeft) playerNumberblock.mesh.rotation.y += rotationSpeed * delta;
        if (window.turnRight) playerNumberblock.mesh.rotation.y -= rotationSpeed * delta;
        
        // Send position to server for multiplayer
        if (typeof window.room !== 'undefined' && window.room) {
            window.sendPlayerUpdate(
                playerNumberblock.mesh.position, 
                playerNumberblock.mesh.rotation.y,
                0, // pitch not used in third-person
                playerValue
            );
        }
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
        if (window.turnLeft) window.thirdPersonCameraAngle += rotationSpeed;
        if (window.turnRight) window.thirdPersonCameraAngle -= rotationSpeed;
        
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

// Update operators (animate them)
function updateOperators() {
    try {
        if (!window.visuals || !window.visuals.operators) {
            return;
        }
        
        // Get all operator visuals
        const operators = window.visuals.operators;
        
        // Calculate deltaTime (approximate)
        const deltaTime = 1/60;
        
        // Animate each operator
        for (const operatorId in operators) {
            const operator = operators[operatorId];
            if (operator && typeof operator.animate === 'function') {
                operator.animate(deltaTime);
            }
        }
    } catch (error) {
        debug(`Error updating operators: ${error.message}`, true);
    }
}

// Check for collisions with operators and other Numberblocks
function checkCollisions() {
    // Will be implemented with proper collision detection
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
                window.moveForward = true;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                window.moveLeft = true;
                break;
            case 'ArrowDown':
            case 'KeyS':
                window.moveBackward = true;
                break;
            case 'ArrowRight':
            case 'KeyD':
                window.moveRight = true;
                break;
            case 'Space':
                if (window.canJump) {
                    window.velocity.y = 5.0;
                    window.canJump = false;
                }
                break;
            case 'KeyV':
                // Toggle between first and third person view
                toggleCameraView();
                break;
            case 'KeyQ':
                // Turn left
                window.turnLeft = true;
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
                window.turnRight = true;
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
                window.moveForward = false;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                window.moveLeft = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                window.moveBackward = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                window.moveRight = false;
                break;
            case 'KeyQ':
                window.turnLeft = false;
                break;
            case 'KeyE':
                window.turnRight = false;
                break;
        }
    } catch (error) {
        debug(`KeyUp error: ${error.message}`, true);
    }
}

// Add static Numberblocks of various values
function addStaticNumberblocks() {
    debug('Adding static Numberblocks');
    
    try {
        // Define positions and values for static Numberblocks
        const numberblockData = [
            { value: 2, x: 8, z: 3 },
            { value: 3, x: -5, z: 8 },
            { value: 4, x: 15, z: -5 },
            { value: 5, x: -12, z: -8 },
            { value: 6, x: 5, z: -15 }
        ];
        
        // Create each Numberblock
        numberblockData.forEach(data => {
            try {
                const numberblock = new Numberblock(data.value);
                scene.add(numberblock.mesh);
                
                // Fix positioning: Set Y to half the value so bottom is at ground level (y=0)
                // For a block of value 5, the height is 5, so y=2.5 puts the bottom at ground level
                numberblock.mesh.position.set(data.x, data.value / 2, data.z);
                
                // Rotate randomly for variety
                numberblock.mesh.rotation.y = Math.random() * Math.PI * 2;
                
                // Add a small bounce animation
                const initialY = numberblock.mesh.position.y;
                const bounceSpeed = 0.5 + Math.random() * 0.5;
                const bounceHeight = 0.15;
                
                // Store animation data on the mesh for use in animate loop
                numberblock.mesh.userData = {
                    initialY: initialY,
                    bounceSpeed: bounceSpeed,
                    bounceHeight: bounceHeight,
                    bounceOffset: Math.random() * Math.PI * 2 // Random offset for varied motion
                };
            } catch (error) {
                debug(`Error creating static Numberblock: ${error.message}`, true);
            }
        });
        
        debug('Static Numberblocks added');
    } catch (error) {
        debug(`Error adding static Numberblocks: ${error.message}`, true);
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
        
        // Make player Numberblock globally available for networking
        window.playerNumberblock = playerNumberblock;
        
        // Update HUD
        updateHUD();
        
        // Make Numberblock class available globally
        window.Numberblock = Numberblock;
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
                .then((roomInstance) => {
                    debug('Networking initialized successfully');
                    window.gameRoom = roomInstance; // Store room instance globally
                    
                    // Manually trigger player list update after successful connection
                    if (typeof window.updatePlayerListUI === 'function') {
                        setTimeout(window.updatePlayerListUI, 500);
                        setTimeout(window.updatePlayerListUI, 2000);
                    }
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

// Add decorative objects to the scene
function addDecorativeObjects() {
    try {
        debug('Adding decorative objects');
        
        // Add multiple trees scattered around
        for (let i = 0; i < 20; i++) {
            // Randomize positions but keep away from center
            const distance = 15 + Math.random() * 30;
            const angle = Math.random() * Math.PI * 2;
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            
            // Create tree
            createTree(x, 0, z);
        }
        
        // Add some rocks
        for (let i = 0; i < 15; i++) {
            // Randomize positions
            const distance = 10 + Math.random() * 40;
            const angle = Math.random() * Math.PI * 2;
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            
            // Create rock
            createRock(x, 0, z);
        }
        
        debug('Decorative objects added successfully');
    } catch (error) {
        debug(`Error adding decorative objects: ${error.message}`, true);
    }
}

// Helper function to create a tree
function createTree(x, y, z) {
    // Create tree trunk (cylinder)
    const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 5, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Brown
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(x, y + 2.5, z);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    scene.add(trunk);
    
    // Create tree top (cone for evergreen tree)
    const topGeometry = new THREE.ConeGeometry(2, 6, 8);
    const topMaterial = new THREE.MeshStandardMaterial({ color: 0x228822 }); // Green
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.set(x, y + 6, z);
    top.castShadow = true;
    top.receiveShadow = true;
    scene.add(top);
}

// Helper function to create a rock
function createRock(x, y, z) {
    // Randomly scale the rock
    const scale = 0.5 + Math.random() * 1.5;
    
    // Create irregular rock shape using a scaled sphere
    const rockGeometry = new THREE.SphereGeometry(1, 6, 4);
    
    // Randomly deform vertices to make it look more like a rock
    const vertices = rockGeometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
        const x = vertices.getX(i);
        const y = vertices.getY(i);
        const z = vertices.getZ(i);
        
        // Apply random offset to vertex
        vertices.setX(i, x + (Math.random() - 0.5) * 0.3);
        vertices.setY(i, y + (Math.random() - 0.5) * 0.3);
        vertices.setZ(i, z + (Math.random() - 0.5) * 0.3);
    }
    
    // Update normals after vertex modification
    rockGeometry.computeVertexNormals();
    
    // Create rock material with random gray shade
    const grayShade = 0.4 + Math.random() * 0.3;
    const rockMaterial = new THREE.MeshStandardMaterial({ 
        color: new THREE.Color(grayShade, grayShade, grayShade),
        roughness: 0.9,
        metalness: 0.1
    });
    
    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    rock.scale.set(scale, scale * 0.7, scale);
    rock.position.set(x, y + (scale * 0.35), z);
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
}
