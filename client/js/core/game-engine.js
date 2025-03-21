// 3D Game Platform - Game Engine
// Handles 3D scene, rendering, game loop, and core gameplay

// Debug support
const DEBUG = false; // Set to false to disable debug messages

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
let player;  // Player object
let playerValue = 1;

// Add operator tracking without redeclaring variables
let heldOperator = null;
let lastOperatorSpawn = 0;

// Rotation variables for Q/E keys
let rotationQuaternion = new THREE.Quaternion();
let worldUp = new THREE.Vector3(0, 1, 0);
let rotationAxis = new THREE.Vector3();

// Global view mode tracking
window.isFirstPerson = true;  // Start in first-person view
window.isFreeCameraMode = false; // Not in free camera mode initially
window.playerPosition = null; // Store player position for returning from free camera mode

// HUD elements
const gameHUD = document.getElementById('game-hud');

// Global variables and UI elements
let viewToggleBtn = null; // Global reference for the view toggle button

// Initialize networking variables
let lastSentPosition = new THREE.Vector3();
let lastSentRotation = 0;
let positionUpdateInterval = 100; // ms between position updates
let lastPositionUpdate = 0;
let inputUpdateInterval = 1000 / 30; // 30Hz input updates
let lastInputUpdate = 0;

// Add variables for input throttling
window.inputThrottleMs = 16; // Send inputs roughly every frame (60fps = 16.67ms)
window.lastInputTime = 0;

// Array to store animation callbacks
window.animationCallbacks = [];

// Function to register callbacks to be executed during the animation loop
window.registerAnimationCallback = function(callback) {
    if (typeof callback === 'function' && !window.animationCallbacks.includes(callback)) {
        window.animationCallbacks.push(callback);
        console.log("Registered animation callback:", callback.name || "anonymous");
        return true;
    }
    return false;
};

// Function to unregister a callback from the animation loop
window.unregisterAnimationCallback = function(callback) {
    const index = window.animationCallbacks.indexOf(callback);
    if (index !== -1) {
        window.animationCallbacks.splice(index, 1);
        console.log("Unregistered animation callback:", callback.name || "anonymous");
        return true;
    }
    return false;
};

// Initialize physics variables and flags
function initPhysics() {
    try {
        debug('Initializing physics');
        
        // Basic physics setup
        window.velocity = new THREE.Vector3(0, 0, 0);
        window.direction = new THREE.Vector3(0, 0, 0);
        window.canJump = false;
        
        // Setup movement flags
        window.moveForward = false;
        window.moveBackward = false;
        window.moveLeft = false;
        window.moveRight = false;
        window.turnLeft = false;
        window.turnRight = false;
        
        // Setup rotation utilities
        window.worldUp = new THREE.Vector3(0, 1, 0);
        window.rotationAxis = new THREE.Vector3();
        window.rotationQuaternion = new THREE.Quaternion();
        
        debug('Physics initialized successfully');
    } catch (error) {
        debug(`Error initializing physics: ${error.message}`, true);
    }
}

// Initialize the floor
function initFloor() {
    try {
        debug('Creating floor');
        
        // Create a larger green floor with darker color
        const floorGeometry = new THREE.PlaneGeometry(100, 100);
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x114411,
            roughness: 0.8, 
            metalness: 0.2 
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        
        // Rotate and position the floor
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        floor.receiveShadow = true;
        scene.add(floor);
        
        // Add a grid helper for visual reference
        const gridHelper = new THREE.GridHelper(100, 100, 0x000000, 0x444444);
        scene.add(gridHelper);
        
        debug('Floor created successfully');
    } catch (error) {
        debug(`Error creating floor: ${error.message}`, true);
    }
}

// Initialize the game
window.onload = function() {
    debug('Window loaded, initializing game...');
    
    // Add view toggle button
    addViewToggleButton();
    
    // Create a dummy OperatorManager if not defined (for default implementation)
    if (typeof OperatorManager === 'undefined') {
        window.OperatorManager = class OperatorManager {
            constructor() {
                this.operators = {};
            }
            
            createOperator() { return null; }
            updateOperator() {}
            removeOperator() {}
            createOperatorFromServer() { return { group: new THREE.Group() }; }
            updateOperatorFromServer() {}
            removeOperatorByServerId() {}
        };
    }
    
    // Initialize with window.viewMode and window.isFirstPerson set to first-person
    window.viewMode = 'firstPerson';
    window.isFirstPerson = true;
    window.isFreeCameraMode = false;
    window.playerLoaded = false; // Track if player has been created
    
    // Note: The 'v' keypress listener has been removed as it's handled in controls.js
    
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
            viewToggleBtn.textContent = 'First-Person View';  // Default view mode
            viewToggleBtn.style.position = 'absolute';
            viewToggleBtn.style.bottom = '20px';
            viewToggleBtn.style.right = '20px';
            viewToggleBtn.style.zIndex = '100';
            viewToggleBtn.style.padding = '8px 12px';
            viewToggleBtn.style.backgroundColor = 'rgba(0,0,0,0.6)';
            viewToggleBtn.style.color = 'white';
            viewToggleBtn.style.border = 'none';
            viewToggleBtn.style.borderRadius = '4px';
            viewToggleBtn.style.cursor = 'pointer';
            document.body.appendChild(viewToggleBtn);
        }
        
        // Add click event listener to use the function from controls.js
        viewToggleBtn.addEventListener('click', window.toggleCameraView);
        
        debug('View toggle button added');
    } catch (error) {
        debug(`Error adding view toggle button: ${error.message}`, true);
    }
}

// Toggle between first-person, third-person and free camera view functions have been moved to controls.js

// First-person setup
window.switchToFirstPersonView = function() {
    // Hide player's mesh in first-person
    if (window.myPlayer && window.myPlayer.mesh) {
        window.myPlayer.mesh.visible = false;
    }
    
    if (window.playerNumberblock && window.playerNumberblock.mesh) {
        window.playerNumberblock.mesh.visible = false;
    }
    
    // Reset free camera variables
    window.freeCameraYaw = 0;
    window.freeCameraPitch = 0;
    
    // Set camera position based on the available player information
    // Try multiple sources to ensure we always have a position
    let playerX = 0, playerY = 0, playerZ = 0, rotationY = 0, pitch = 0;
    
    // First check server state if available
    if (window.room && window.room.state && window.room.state.players) {
        const playerState = window.room.state.players.get(window.room.sessionId);
        if (playerState) {
            playerX = playerState.x;
            playerY = playerState.y;
            playerZ = playerState.z;
            rotationY = playerState.rotationY || 0;
            pitch = playerState.pitch || 0;
        }
    }
    // Fallback to local player object if server state not available
    else if (window.playerNumberblock && window.playerNumberblock.mesh) {
        playerX = window.playerNumberblock.mesh.position.x;
        playerY = window.playerNumberblock.mesh.position.y;
        playerZ = window.playerNumberblock.mesh.position.z;
        rotationY = window.playerNumberblock.mesh.rotation.y || 0;
    }
    
    // Position camera at player's head
    if (window.camera) {
        window.camera.position.set(
            playerX,
            playerY + (window.playerHeight || 2.0),
            playerZ
        );
        
        // Set camera rotation using quaternions to prevent gimbal lock
        window.camera.quaternion.setFromEuler(new THREE.Euler(
            pitch,
            rotationY + Math.PI,
            0,
            'YXZ'  // Important for proper FPS controls
        ));
        
        // Update controls position if available
        if (controls) {
            controls.getObject().position.copy(window.camera.position);
        }
        
        // Force an immediate render to show the new view
        if (window.renderer && window.scene) {
            window.renderer.render(window.scene, window.camera);
        }
    }
    
    // If we were in free camera mode, tell the server we're back
    if (window.isFreeCameraMode) {
        window.isFreeCameraMode = false;
        if (window.sendInputUpdate) {
            window.sendInputUpdate();
        }
    }
    
    console.log("Switched to first-person view. Camera at:", window.camera.position);
};

// Third-person setup
window.switchToThirdPersonView = function() {
    // Show player's mesh in third-person
    if (window.myPlayer && window.myPlayer.mesh) {
        window.myPlayer.mesh.visible = true;
    }
    
    if (window.playerNumberblock && window.playerNumberblock.mesh) {
        window.playerNumberblock.mesh.visible = true;
    }
    
    // Reset orbit angles if they don't exist
    window.thirdPersonCameraOrbitX = window.thirdPersonCameraOrbitX || 0;
    window.thirdPersonCameraOrbitY = window.thirdPersonCameraOrbitY || 0.5;
    
    // Make sure player state exists
    if (window.room && window.room.state && window.room.state.players) {
        const playerState = window.room.state.players.get(window.room.sessionId);
        if (playerState) {
            // Position camera based on player's current position/rotation
            const offsetX = window.thirdPersonCameraDistance * Math.sin(playerState.rotationY) * Math.cos(window.thirdPersonCameraOrbitY);
            const offsetZ = window.thirdPersonCameraDistance * Math.cos(playerState.rotationY) * Math.cos(window.thirdPersonCameraOrbitY);
            const offsetY = window.thirdPersonCameraDistance * Math.sin(window.thirdPersonCameraOrbitY);
            
            // Immediately position camera with offset for immediate visual feedback
            window.camera.position.set(
                playerState.x + offsetX,
                playerState.y + window.thirdPersonCameraHeight + offsetY,
                playerState.z + offsetZ
            );
            
            // Set camera to look at player
            const lookTarget = new THREE.Vector3(
                playerState.x, 
                playerState.y + window.thirdPersonCameraHeight * 0.8, // Look at upper body
                playerState.z
            );
            
            // Create look direction and rotation
            const direction = new THREE.Vector3().subVectors(lookTarget, window.camera.position).normalize();
            const quaternion = new THREE.Quaternion().setFromUnitVectors(
                new THREE.Vector3(0, 0, -1),
                direction
            );
            
            // Apply rotation to camera immediately
            window.camera.quaternion.copy(quaternion);
            
            // Force an immediate render to update the view
            if (window.renderer && window.scene) {
                window.renderer.render(window.scene, window.camera);
            }
        }
    }
    
    console.log("Switched to third-person view. Camera at:", window.camera.position);
};

// Free camera setup
window.switchToFreeCameraView = function() {
    // Store current camera position for when we return
    window.playerPosition = camera.position.clone();
    window.isFreeCameraMode = true;
    
    // Show player mesh since we're viewing from outside
    if (window.playerNumberblock && window.playerNumberblock.mesh) {
        window.playerNumberblock.mesh.visible = true;
    }
    
    // Keep pointer lock active but disable normal controls
    if (controls) {
        if (!controls.isLocked) {
            controls.lock();
        }
        controls.enabled = false;
    }
    
    // Initialize free camera movement speed
    window.freeCameraSpeed = 0.5;
    
    console.log("Switched to free camera view");
};

// Handle mouse movement for free camera
function onMouseMove(event) {
    if (!window.controls || !window.controls.isLocked) return;
    
    // Store mouse movement for input state
    window.inputState.mouseDelta.x += event.movementX;
    window.inputState.mouseDelta.y += event.movementY;
    
    if (window.isFreeCameraMode) {
        // Initialize Euler angles if they don't exist
        if (!window.freeCameraEuler) {
            window.freeCameraEuler = new THREE.Euler(0, 0, 0, 'YXZ');
        }
        
        // Update rotation with mouse movement
        const rotationSpeed = 0.002;
        
        // Update yaw (left/right) and pitch (up/down)
        window.freeCameraEuler.y -= event.movementX * rotationSpeed;
        window.freeCameraEuler.x = Math.max(
            -Math.PI/2,
            Math.min(Math.PI/2,
                window.freeCameraEuler.x - event.movementY * rotationSpeed
            )
        );
        
        // Keep roll (z-axis) at 0 to prevent tilting
        window.freeCameraEuler.z = 0;
        
        // Apply rotation to camera, maintaining upright orientation
        camera.quaternion.setFromEuler(window.freeCameraEuler);
    }
}

// Handle keyboard movement for free camera
function updateFreeCameraMovement() {
    if (!window.isFreeCameraMode) return;
    
    const speed = window.freeCameraSpeed;
    const moveVector = new THREE.Vector3();
    
    // Get camera's forward and right vectors
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    
    // WASD movement
    if (window.inputState.keys.w) moveVector.add(forward.multiplyScalar(speed));
    if (window.inputState.keys.s) moveVector.sub(forward);
    if (window.inputState.keys.a) moveVector.sub(right);
    if (window.inputState.keys.d) moveVector.add(right);
    
    // Up/Down movement with Q/E
    if (window.inputState.keys.q) moveVector.y += speed;
    if (window.inputState.keys.e) moveVector.y -= speed;
    
    // Apply movement
    camera.position.add(moveVector.multiplyScalar(speed));
}

// Position camera behind player for third-person view - more responsive
window.updateThirdPersonCamera = function() {
    if (!window.room || !window.room.state || !window.room.state.players) return;
    
    const playerState = window.room.state.players.get(window.room.sessionId);
    if (!playerState) return;
    
    // Calculate offset based on orbit angles
    const offsetX = window.thirdPersonCameraDistance * Math.sin(window.thirdPersonCameraOrbitX) * Math.cos(window.thirdPersonCameraOrbitY);
    const offsetZ = window.thirdPersonCameraDistance * Math.cos(window.thirdPersonCameraOrbitX) * Math.cos(window.thirdPersonCameraOrbitY);
    const offsetY = window.thirdPersonCameraDistance * Math.sin(window.thirdPersonCameraOrbitY);
    
    // Calculate target camera position
    const targetX = playerState.x + offsetX;
    const targetY = playerState.y + window.thirdPersonCameraHeight + offsetY;
    const targetZ = playerState.z + offsetZ;
    
    // Use faster lerp for more responsive camera movement
    const lerpFactor = 0.3; // Higher = more responsive
    
    // Apply smooth but responsive camera movement
    window.camera.position.x = THREE.MathUtils.lerp(window.camera.position.x, targetX, lerpFactor);
    window.camera.position.y = THREE.MathUtils.lerp(window.camera.position.y, targetY, lerpFactor);
    window.camera.position.z = THREE.MathUtils.lerp(window.camera.position.z, targetZ, lerpFactor);
    
    // Instant position correction if too far away (prevents extreme lag)
    const distSq = Math.pow(window.camera.position.x - targetX, 2) +
                   Math.pow(window.camera.position.y - targetY, 2) +
                   Math.pow(window.camera.position.z - targetZ, 2);
                   
    if (distSq > 25) { // About 5 units away - immediately snap to correct position
        window.camera.position.set(targetX, targetY, targetZ);
    }
    
    // Point camera at player
    const lookTarget = new THREE.Vector3(
        playerState.x, 
        playerState.y + window.thirdPersonCameraHeight * 0.8, // Look at upper body
        playerState.z
    );
    
    // Create look direction and rotation
    const direction = new THREE.Vector3().subVectors(lookTarget, window.camera.position).normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, -1),
        direction
    );
    
    // Apply rotation to camera immediately for responsive look
    window.camera.quaternion.copy(quaternion);
    
    // Ensure player mesh is visible in third-person view
    if (window.playerNumberblock && window.playerNumberblock.mesh) {
        window.playerNumberblock.mesh.visible = true;
    }
};

// Main initialization function
function init() {
    try {
        debug('Initializing game');
        
        // Create the scene first
        initScene();
        
        // Initialize physics variables and flags
        initPhysics();
        
        // Create the camera
        debug('Creating camera');
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        // Only initialize with temporary position - actual position will be set when player is created
        camera.position.set(0, 0, 0);
        window.camera = camera; // Make globally available
        
        // Setup renderer
        debug('Setting up renderer');
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.gammaFactor = 2.2;
        
        // Add renderer to document
        document.body.appendChild(renderer.domElement);
        window.renderer = renderer;
        
        // Initialize the floor
        initFloor();

        // Explicitly set camera mode before initializing controls
        window.isFirstPerson = true;  

        // Setup controls for player movement
        setupPointerLockControls();
        
        // Player will be created after clicking "Click to play"
        
        // Add resize event listener
        window.addEventListener('resize', onWindowResize, false);
        
        // Make key handlers available for player movement
        document.addEventListener('keydown', onKeyDown, false);
        document.addEventListener('keyup', onKeyUp, false);
        
        // Add mouse event listeners
        document.addEventListener('mousedown', onMouseDown, false);
        document.addEventListener('mouseup', onMouseUp, false);
        document.addEventListener('mousemove', onMouseMove, false);
        
        // Handle page visibility changes to reset input state when tab is not active
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Reset input state when tab loses focus
                window.moveForward = false;
                window.moveBackward = false;
                window.moveLeft = false;
                window.moveRight = false;
                window.turnLeft = false;
                window.turnRight = false;
                window.inputState.keys = { 
                    w: false, a: false, s: false, d: false, 
                    space: false, q: false, e: false, shift: false 
                };
                // Force an immediate input update
                if (window.sendInputUpdate) {
                    window.sendInputUpdate();
                }
            }
        });
        
        // Make sure global variables are properly declared
        window.scene = scene;
        window.camera = camera;
        window.renderer = renderer;
        window.controls = controls;
        
        // Expose sendInputUpdate to window for access from other modules
        window.sendInputUpdate = sendInputUpdate;
        
        // Start the animation loop
        requestAnimationFrame(animate);
        
        debug('Game successfully initialized');
    } catch (error) {
        debug(`Full initialization error: ${error.message}`, true);
        console.error('Full initialization error:', error);
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
        
        // Add fog for depth perception - COMMENTED OUT client-side terrain setting
        // scene.fog = new THREE.Fog(0x87CEEB, 10, 100);
        
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
        
        // Initialize operator manager and make it globally available
        operatorManager = new OperatorManager(scene);
        window.operatorManager = operatorManager;
        
        debug('Scene created successfully');
    } catch (error) {
        debug(`Error creating scene: ${error.message}`, true);
    }
}

// Setup PointerLock controls
function setupPointerLockControls() {
    debug('Setting up PointerLock controls');
    
    try {
        controls = window.initControls(camera, renderer.domElement);
        
        let instructions = document.getElementById('lock-instructions');
        
        if (!instructions) {
            console.warn('Lock instructions element not found, creating one');
            instructions = document.createElement('div');
            instructions.id = 'lock-instructions';
            instructions.style.position = 'absolute';
            instructions.style.width = '100%';
            instructions.style.height = '100%';
            instructions.style.top = '0';
            instructions.style.left = '0';
            instructions.style.display = 'flex';
            instructions.style.flexDirection = 'column';
            instructions.style.justifyContent = 'center';
            instructions.style.alignItems = 'center';
            instructions.style.color = '#ffffff';
            instructions.style.textAlign = 'center';
            instructions.style.backgroundColor = 'rgba(0,0,0,0.5)';
            instructions.style.cursor = 'pointer';
            instructions.style.zIndex = '1000';
            instructions.innerHTML = '<p>Click to play</p>';
            document.body.appendChild(instructions);
        }

        // Add click event to the entire document
        document.addEventListener('click', () => {
            controls.lock();
        }, false);

        // Handle pointer lock change explicitly
        function onPointerLockChange() {
            if (document.pointerLockElement === renderer.domElement || 
                document.mozPointerLockElement === renderer.domElement ||
                document.webkitPointerLockElement === renderer.domElement) {
                
                debug('Pointer is now locked');
                instructions.style.display = 'none';
                document.body.classList.add('controls-enabled');
                window.canJump = true;
                window.isControlsEnabled = true;
                
                // Create the player's block if not already created
                if (!window.playerLoaded) {
                    debug('Creating player block after click to play');
                    // Initialize the player
                    window.playerNumberblock = window.createPlayerNumberblock(scene);
                    window.player = window.playerNumberblock;
                    window.playerLoaded = true;
                    
                    // Make sure player mesh is invisible in first-person view
                    if (window.playerNumberblock && window.playerNumberblock.mesh) {
                        window.playerNumberblock.mesh.visible = false;
                    }
                    
                    // Initialize networking if not already done
                    if (!window.room) {
                        window.initNetworking().then((roomInstance) => {
                            window.gameRoom = roomInstance;
                            window.room = roomInstance;
                            
                            // Start getting updates from the server
                            setInterval(sendInputUpdate, 1000 / 30);
                            
                            // Apply the first-person view once the room is joined
                            if (window.switchToFirstPersonView) {
                                window.switchToFirstPersonView();
                            }
                        }).catch((error) => {
                            debug(`Networking error: ${error.message}`, true);
                        });
                    } else {
                        // Apply the first-person view if we already have a room
                        if (window.switchToFirstPersonView) {
                            window.switchToFirstPersonView();
                        }
                    }
                }

                if (!window.isAnimating) {
                    window.isAnimating = true;
                    animate();
                }
            } else {
                // Only show instructions if we're not in free camera mode AND not already playing
                if (!window.isFreeCameraMode && !window.playerLoaded) {
                    instructions.style.display = 'block';
                } else {
                    instructions.style.display = 'none';
                }
                debug('Pointer is unlocked');
            }
        }

        // Attach pointer lock event listeners clearly to the document
        document.addEventListener('pointerlockchange', onPointerLockChange, false);
        document.addEventListener('mozpointerlockchange', onPointerLockChange, false);
        document.addEventListener('webkitpointerlockchange', onPointerLockChange, false);

        scene.add(controls.getObject());
        window.isFirstPerson = true;

        debug('PointerLock controls setup complete');
    } catch (error) {
        debug(`Error setting up PointerLock controls: ${error.message}`, true);
    }
}

// Update player movement physics with more responsive server sync
function updatePlayerPhysics(delta) {
    if (!controls || !scene || !controls.isLocked) return;
    
    const controlsObject = controls.getObject();
    
    // Get current player state from server if available
    if (window.room && window.room.state && window.room.state.players) {
        const player = window.room.state.players.get(window.room.sessionId);
        if (player) {
            // Update the player's position based on the server position
            // Higher lerpFactor means more responsive but potentially less smooth
            const lerpFactor = 0.3; // Increased for more responsive movement
            
            // Smoothly interpolate to the server position
            controlsObject.position.x = THREE.MathUtils.lerp(
                controlsObject.position.x, 
                player.x, 
                lerpFactor
            );
            
            controlsObject.position.z = THREE.MathUtils.lerp(
                controlsObject.position.z, 
                player.z, 
                lerpFactor
            );
            
            // Use server Y position for jumping/falling
            controlsObject.position.y = THREE.MathUtils.lerp(
                controlsObject.position.y, 
                player.y, 
                lerpFactor * 2  // Faster vertical correction
            );
            
            // If there's a significant desync, instantly correct position
            const distanceSquared = 
                Math.pow(controlsObject.position.x - player.x, 2) + 
                Math.pow(controlsObject.position.z - player.z, 2);
                
            if (distanceSquared > 5) { // Lowered threshold for quicker corrections
                controlsObject.position.x = player.x;
                controlsObject.position.z = player.z;
                controlsObject.position.y = player.y;
                console.log("Position correction applied");
            }
            
            // Update the player's velocity
            window.velocity.y = player.velocityY;
            
            // Update Numberblock position and scale to match player value
            if (typeof updatePlayerNumberblock === 'function') {
                updatePlayerNumberblock(player.value);
            }
            
            // Update player info in UI if available
            if (window.playerUI && typeof window.playerUI.updatePlayerListUI === 'function') {
                window.playerUI.updatePlayerListUI();
            }
            
            // Force camera to update based on view mode for immediate feedback
            if (window.isFirstPerson && !window.isFreeCameraMode) {
                window.updateFirstPersonCamera();
            } else if (!window.isFreeCameraMode) {
                window.updateThirdPersonCamera();
            }
        }
    } else {
        // Use client-side physics for prediction if server data not available
        // Apply gravity
        window.velocity.y -= 9.8 * delta;
        controlsObject.position.y += window.velocity.y * delta;
        
        // Basic ground collision
        if (controlsObject.position.y < 1) {
            window.velocity.y = 0;
            controlsObject.position.y = 1;
            window.canJump = true;
        }
    }
}

// initialize your global visuals safely if not done already
window.visuals = window.visuals || { players: {}, operators: {}, staticNumberblocks: {} };

// Animation loop
function animate(currentTime) {
    requestAnimationFrame(animate);
    
    if (!window.prevTime) window.prevTime = performance.now();
    if (!currentTime) currentTime = performance.now();
    
    const delta = Math.min((currentTime - window.prevTime) / 1000, 0.1);
    window.prevTime = currentTime;
    
    // Handle different camera modes
    if (window.isFreeCameraMode) {
        // Update free camera movement
        updateFreeCameraMovement();
    } else if (controls && controls.isLocked) {
        // Normal controls update for first/third person
        window.updateControls(controls, delta);
        updatePlayerPhysics(delta);
    }
    
    // Update player state from server
    if (window.room && window.room.state && window.room.state.players) {
        const playerState = window.room.state.players.get(window.room.sessionId);
        if (playerState) {
            // Update player mesh
            if (window.playerNumberblock && window.playerNumberblock.mesh) {
                window.playerNumberblock.mesh.position.set(playerState.x, playerState.y, playerState.z);
                window.playerNumberblock.mesh.rotation.y = playerState.rotationY;
                window.playerNumberblock.mesh.visible = window.isFreeCameraMode || !window.isFirstPerson;
            }
            
            // Only update camera for first/third person modes
            if (!window.isFreeCameraMode) {
                if (window.isFirstPerson) {
                    window.updateFirstPersonCamera();
                } else {
                    window.updateThirdPersonCamera();
                }
            }
        }
    }
    
    // Execute all registered animation callbacks
    if (window.animationCallbacks && window.animationCallbacks.length > 0) {
        for (let i = 0; i < window.animationCallbacks.length; i++) {
            try {
                window.animationCallbacks[i](delta);
            } catch (error) {
                console.error("Error in animation callback:", error);
            }
        }
    }
    
    // Explicitly call updateRemotePlayers to ensure other players are always rendered
    if (typeof window.updateRemotePlayers === 'function') {
        window.updateRemotePlayers();
    }
    
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function sendInputUpdate() {
    // Don't send updates if we're in free camera mode or if player isn't loaded yet
    if (window.isFreeCameraMode || !window.playerLoaded) {
        return;
    }

    if (window.room) {
        const now = performance.now();
        if ((now - window.lastInputTime) > window.inputThrottleMs) {
            window.lastInputTime = now;
            
            // Make sure all key states are properly set before sending
            const keyStates = {
                w: window.moveForward,
                a: window.moveLeft, 
                s: window.moveBackward,
                d: window.moveRight,
                space: window.inputState.keys.space || false,
                q: window.turnLeft || window.inputState.keys.q || false,
                e: window.turnRight || window.inputState.keys.e || false,
                shift: window.shiftPressed || false
            };
            
            // Update the global input state to ensure everything is in sync
            window.inputState.keys = keyStates;
            
            // Send the updated input state to server
            window.room.send("updateInput", {
                keys: keyStates,
                mouseDelta: {
                    x: window.isFirstPerson ? window.inputState.mouseDelta.x : 0,
                    y: window.isFirstPerson ? window.inputState.mouseDelta.y : 0
                },
                viewMode: window.isFirstPerson ? "first-person" : "third-person",
                thirdPersonCameraAngle: window.thirdPersonCameraOrbitX,
                // Send direct rotation values for immediate application on server
                clientRotation: {
                    rotationY: window.playerRotationY || 0,
                    pitch: window.firstPersonCameraPitch || 0
                }
            });
            
            // Reset mouse delta after sending
            window.inputState.mouseDelta.x = 0;
            window.inputState.mouseDelta.y = 0;
            
            // Debug output to confirm inputs are sent
            if (keyStates.w || keyStates.a || keyStates.s || keyStates.d || keyStates.q || keyStates.e) {
                console.log("Sending input to server:", keyStates);
            }
        }
    }
}

setInterval(sendInputUpdate, 1000 / 30);

window.thirdPersonCameraDistance = 5;
window.thirdPersonCameraOrbitX = 0;
window.thirdPersonCameraOrbitY = 0;

// Update third-person camera position based on orbit angles
function updateThirdPersonCameraPosition() {
    if (!window.room || !window.room.state || !window.room.state.players) return;
    const playerState = window.room.state.players.get(window.room.sessionId);
    if (!playerState) return;
    
    // Get camera reference
    const camera = window.camera;
    
    // Calculate theta (horizontal orbit angle) and phi (vertical orbit angle)
    const theta = window.thirdPersonCameraOrbitX;
    const phi = window.thirdPersonCameraOrbitY;
    
    // Calculate camera position based on spherical coordinates
    const distance = window.thirdPersonCameraDistance;
    const offsetX = distance * Math.sin(theta) * Math.cos(phi);
    const offsetY = distance * Math.sin(phi);
    const offsetZ = distance * Math.cos(theta) * Math.cos(phi);
    
    // Calculate camera position relative to player
    const cameraPosition = new THREE.Vector3(
        playerState.x + offsetX,
        playerState.y + window.playerHeight / 2 + offsetY,
        playerState.z + offsetZ
    );
    
    // Set camera position
    camera.position.copy(cameraPosition);
    
    // Use our helper function to fix orientation
    setThirdPersonCameraOrientation(
        camera,
        cameraPosition,
        new THREE.Vector3(playerState.x, playerState.y, playerState.z)
    );
}

// Make updateFirstPersonCamera globally accessible
window.updateFirstPersonCamera = function() {
    if (!window.room || !window.room.state || !window.room.state.players) return;
    
    const playerState = window.room.state.players.get(window.room.sessionId);
    if (!playerState) return;
    
    // Update camera position to be exactly at player's position (with head height)
    if (window.camera && controls) {
        // Position camera exactly at player position with head height
        window.camera.position.set(
            playerState.x,
            playerState.y + (window.playerHeight || 2.0),
            playerState.z
        );
        
        // Apply proper rotation using player's server-side rotation values
        // and any local camera pitch changes for immediate feedback
        const pitch = typeof window.firstPersonCameraPitch !== 'undefined' 
            ? window.firstPersonCameraPitch 
            : (playerState.pitch || 0);
            
        const rotationY = typeof window.playerRotationY !== 'undefined'
            ? window.playerRotationY
            : (playerState.rotationY || 0);
            
        window.camera.quaternion.setFromEuler(new THREE.Euler(
            pitch,
            rotationY,
            0,
            'YXZ' // Important for proper FPS rotation order
        ));
        
        // Update the controls object to match camera position
        if (controls.getObject) {
            controls.getObject().position.copy(window.camera.position);
        }
        
        // Make sure the player mesh is invisible in first-person
        if (window.playerNumberblock && window.playerNumberblock.mesh) {
            window.playerNumberblock.mesh.visible = false;
        }
    }
};

// Handle view-specific camera updates
function updateThirdPersonCamera() {
    // Get player state
    const playerState = window.room.state.players.get(window.room.sessionId);
    if (!playerState) return;
    
    // Third-person: Position camera behind player with smooth follow
    
    // First, update the camera orbit angle to match the player's rotation
    // This makes the camera follow behind the player when they rotate with Q and E
    window.thirdPersonCameraOrbitX = playerState.rotationY;
    
    // Calculate ideal camera position based on orbit angles
    const theta = window.thirdPersonCameraOrbitX;
    const phi = window.thirdPersonCameraOrbitY;
    
    // Calculate camera position based on spherical coordinates
    const distance = window.thirdPersonCameraDistance;
    const offsetX = distance * Math.sin(theta) * Math.cos(phi);
    const offsetY = distance * Math.sin(phi);
    const offsetZ = distance * Math.cos(theta) * Math.cos(phi);
    
    // Target position (slightly above player's head)
    const lookAtPosition = new THREE.Vector3(
        playerState.x,
        playerState.y + window.playerHeight * 0.7, // Look at player's upper body
        playerState.z
    );
    
    // Set camera position
    const targetCameraPos = new THREE.Vector3(
        playerState.x + offsetX,
        playerState.y + offsetY + window.playerHeight * 0.5,
        playerState.z + offsetZ
    );
    
    // Smooth camera movement
    camera.position.lerp(targetCameraPos, 0.2);
    
    // Fix camera orientation
    setThirdPersonCameraOrientation(camera, lookAtPosition, playerState);
    
    // Show player mesh in third-person and make sure it's updated
    if (window.playerNumberblock && window.playerNumberblock.mesh) {
        window.playerNumberblock.mesh.visible = true;
        
        // Update position and rotation
        window.playerNumberblock.mesh.position.set(playerState.x, playerState.y, playerState.z);
        
        // Add subtle rotation smoothing for player mesh
        const currentRot = window.playerNumberblock.mesh.rotation.y;
        const targetRot = playerState.rotationY;
        
        // Ensure we rotate the shortest way around (handling -π to π transition)
        let rotDiff = targetRot - currentRot;
        if (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
        if (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
        
        // Apply smooth rotation
        window.playerNumberblock.mesh.rotation.y += rotDiff * 0.1;
    }
}

// Mouse down event handler
function onMouseDown(event) {
    // Left button: 0, Middle: 1, Right: 2
    if (event.button === 2) {
        window.rightMouseDown = true;
    } else if (event.button === 1) {
        window.middleMouseDown = true;
    }
}

// Mouse up event handler
function onMouseUp(event) {
    if (event.button === 2) {
        window.rightMouseDown = false;
    } else if (event.button === 1) {
        window.middleMouseDown = false;
    }
}
