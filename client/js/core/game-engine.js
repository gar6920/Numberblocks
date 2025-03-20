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
    
    // Add keyboard shortcut for camera toggle (V key)
    document.addEventListener('keydown', function(event) {
        if (event.code === 'KeyV') {
            toggleCameraView();
        }
    });
    
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
        
        // Add click event listener
        viewToggleBtn.addEventListener('click', toggleCameraView);
        
        debug('View toggle button added');
    } catch (error) {
        debug(`Error adding view toggle button: ${error.message}`, true);
    }
}

// Toggle between first-person and third-person view
function toggleCameraView() {
    // Toggle between first-person, third-person, and free camera modes
    if (window.viewMode === 'firstPerson') {
        window.viewMode = 'thirdPerson';
        window.isFirstPerson = false;
        window.isFreeCameraMode = false;
        switchToThirdPersonView();
    } else if (window.viewMode === 'thirdPerson') {
        window.viewMode = 'freeCamera';
        window.isFirstPerson = false;
        window.isFreeCameraMode = true;
        switchToFreeCameraView();
    } else {
        window.viewMode = 'firstPerson';
        window.isFirstPerson = true;
        window.isFreeCameraMode = false;
        switchToFirstPersonView();
    }
    
    // Update UI elements to match the new view mode
    updateViewModeUI();
    
    // Update mouse sensitivity based on new view mode
    updateMouseSensitivity();
    
    console.log(`View mode changed to ${window.viewMode}`);
}

// First-person setup
function switchToFirstPersonView() {
    // Restore player visibility
    if (window.myPlayer && window.myPlayer.mesh) {
        window.myPlayer.mesh.visible = false;
    }
    
    // Reset free camera variables
    window.freeCameraYaw = 0;
    window.freeCameraPitch = 0;
    
    if (controls && window.room && window.room.state.players) {
        // Position camera at player's head
        const playerState = window.room.state.players.get(window.room.sessionId);
        if (playerState) {
            camera.position.set(
                playerState.x,
                playerState.y + window.playerHeight,
                playerState.z
            );
            
            // Set camera rotation using quaternions to prevent gimbal lock
            camera.quaternion.setFromEuler(new THREE.Euler(
                playerState.pitch,
                playerState.rotationY + Math.PI,
                0,
                'YXZ'  // Important for proper FPS controls
            ));
            
            // Update controls position
            controls.getObject().position.copy(camera.position);
        }
    }
    
    // If we were in free camera mode, tell the server we're back
    if (window.isFreeCameraMode) {
        // Send an immediate input update to refresh server state
        window.isFreeCameraMode = false;
        sendInputUpdate();
    }
    
    // Update mouse sensitivity
    updateMouseSensitivity();
    
    // Update UI
    const instructions = document.getElementById('lock-instructions');
    if (instructions) {
        instructions.innerHTML = "WASD to move, Mouse to look<br>Press V to switch to third-person view";
    }
}

// Third-person setup
function switchToThirdPersonView() {
    // Position camera behind player, use thirdPersonDistance as the distance
    if (window.myPlayer && window.myPlayer.mesh) {
        window.myPlayer.mesh.visible = true;
    }
    
    // Initialize orbit angles to position camera behind the player
    if (window.room && window.room.state.players) {
        const playerState = window.room.state.players.get(window.room.sessionId);
        if (playerState) {
            // Set the horizontal orbit angle to match the player's rotation
            // Adding PI places it directly behind the player
            window.thirdPersonCameraOrbitX = playerState.rotationY + Math.PI;
            
            // Set vertical orbit angle to be slightly elevated (positive value)
            window.thirdPersonCameraOrbitY = 0.4; // Slightly elevated position
        }
    } else {
        // Fallback if player state is unavailable
        window.thirdPersonCameraOrbitX = Math.PI; // Behind player
        window.thirdPersonCameraOrbitY = 0.4;     // Slightly elevated
    }
    
    // Update camera position based on orbit angles
    updateThirdPersonCameraPosition();
    
    // Update mouse sensitivity
    updateMouseSensitivity();
    
    // Update UI
    const instructions = document.getElementById('lock-instructions');
    if (instructions) {
        instructions.innerHTML = "WASD to move, Right-click + Mouse to orbit camera<br>Press V to switch to free camera view";
    }
}

// Position camera behind player for third-person view
function positionCameraBehindPlayer(playerState) {
    if (!playerState) return;
    
    // Calculate camera position based on orbit angles
    // Start with a position vector at the desired distance
    const distance = window.thirdPersonCameraDistance;
    
    // Calculate horizontal position using orbit X angle
    const horizontalX = Math.sin(window.thirdPersonCameraOrbitX) * distance;
    const horizontalZ = Math.cos(window.thirdPersonCameraOrbitX) * distance;
    
    // Apply vertical orbit angle for height
    const verticalFactor = Math.sin(window.thirdPersonCameraOrbitY) * distance;
    const distanceFactor = Math.cos(window.thirdPersonCameraOrbitY);
    
    // Calculate final camera position
    const cameraPosition = new THREE.Vector3(
        playerState.x + horizontalX * distanceFactor,
        playerState.y + window.playerHeight + verticalFactor,
        playerState.z + horizontalZ * distanceFactor
    );
    
    // Set camera position
    camera.position.copy(cameraPosition);
    
    // Calculate look direction (from camera to player)
    const lookDirection = new THREE.Vector3();
    lookDirection.subVectors(new THREE.Vector3(playerState.x, playerState.y + window.playerHeight * 0.6, playerState.z), camera.position).normalize();
    
    // Calculate the correct up vector (always world up)
    const up = new THREE.Vector3(0, 1, 0);
    
    // Create quaternion from lookAt matrix
    const quaternion = new THREE.Quaternion();
    const lookAtMatrix = new THREE.Matrix4().lookAt(
        camera.position,
        new THREE.Vector3(playerState.x, playerState.y + window.playerHeight * 0.6, playerState.z),
        up
    );
    quaternion.setFromRotationMatrix(lookAtMatrix);
    camera.quaternion.copy(quaternion);
}

// Function to fix camera orientation in third-person view
function setThirdPersonCameraOrientation(camera, targetPos, playerPos) {
    // Calculate look at position (upper part of the player)
    const lookAtPosition = new THREE.Vector3(
        playerPos.x,
        playerPos.y + window.playerHeight * 0.6, // Look at upper body
        playerPos.z
    );
    
    // Calculate the correct up vector (always world up)
    const worldUp = new THREE.Vector3(0, 1, 0);
    
    // Create a matrix for the camera to look at the player
    const lookAtMatrix = new THREE.Matrix4();
    lookAtMatrix.lookAt(camera.position, lookAtPosition, worldUp);
    
    // Set quaternion from the matrix
    const quaternion = new THREE.Quaternion();
    quaternion.setFromRotationMatrix(lookAtMatrix);
    camera.quaternion.copy(quaternion);
}

// Free camera view setup
function switchToFreeCameraView() {
    // Make sure player is visible
    if (window.myPlayer && window.myPlayer.mesh) {
        window.myPlayer.mesh.visible = true;
    }
    
    // Unlock camera from pointer controls to allow free movement
    if (controls && controls.isLocked) {
        controls.unlock();
    }
    
    // Initialize free camera orientation from player's current orientation
    if (window.room && window.room.state.players) {
        const playerState = window.room.state.players.get(window.room.sessionId);
        if (playerState) {
            window.freeCameraYaw = playerState.rotationY;
            window.freeCameraPitch = playerState.pitch;
        }
    }
    
    // Position camera at a slight offset from the player
    if (window.playerPosition) {
        camera.position.set(
            window.playerPosition.x + 5,
            window.playerPosition.y + 5,
            window.playerPosition.z + 5
        );
        
        // Set initial camera orientation using quaternions
        camera.quaternion.setFromEuler(new THREE.Euler(
            window.freeCameraPitch,
            window.freeCameraYaw,
            0,
            'YXZ'  // Important for proper FPS controls
        ));
    }
    
    // Update UI
    const instructions = document.getElementById('lock-instructions');
    if (instructions) {
        instructions.innerHTML = "WASD to move, Mouse to look, Space/Shift for up/down<br>Press V to return to first-person view";
    }
}

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
        camera.position.set(0, 2, 5); // Start a bit back to see the player
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
        
        // Initialize the player
        debug('Initializing Player');
        playerNumberblock = window.createPlayerNumberblock(scene);
        window.playerNumberblock = playerNumberblock;
        debug('Player successfully initialized');
       
        // Initialize networking for multiplayer
        window.initNetworking().then((roomInstance) => {
            window.gameRoom = roomInstance;
            window.room = roomInstance;
        
            setInterval(sendInputUpdate, 1000 / 30);
                        
            animate(); // Explicitly start animation here if needed
        }).catch((error) => {
            debug(`Networking error: ${error.message}`, true);
        });
                
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
        window.playerNumberblock = playerNumberblock;
        window.playerValue = playerValue;
        
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
            instructions.innerHTML = '<p>Click to enable controls</p>';
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

                if (!window.isAnimating) {
                    window.isAnimating = true;
                    animate();
                }
            } else {
                instructions.style.display = 'block';
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

// Update player movement physics
function updatePlayerPhysics(delta) {
    if (!controls || !scene || !controls.isLocked) return;
    
    const controlsObject = controls.getObject();
    let playerMoved = false;
    
    // Get current player state from server if available
    if (window.room && window.room.state && window.room.state.players) {
        const player = window.room.state.players.get(window.room.sessionId);
        if (player) {
            // Update the player's position based on the server position
            // This ensures server authority while allowing client-side prediction
            const lerpFactor = 0.1; // Lower value = smoother but more latent transition
            
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
                
            if (distanceSquared > 10) { // More than ~3 units away
                controlsObject.position.x = player.x;
                controlsObject.position.z = player.z;
                controlsObject.position.y = player.y;
                console.log("Significant position correction applied");
            }
            
            // Update the player's velocity
            velocity.y = player.velocityY;
            
            // Update Numberblock position and scale to match player value
            updatePlayerNumberblock(player.value);
            
            // Update player info in UI if available
            if (window.playerUI && typeof window.playerUI.updatePlayerListUI === 'function') {
                window.playerUI.updatePlayerListUI();
            }
            
            playerMoved = true;
        }
    }
    
    // Use client-side physics for prediction, but will be overridden by server
    if (!playerMoved) {
        // Apply gravity
        velocity.y -= 9.8 * delta;
        controlsObject.position.y += velocity.y * delta;
        
        // Basic ground collision
        if (controlsObject.position.y < 1) {
            velocity.y = 0;
            controlsObject.position.y = 1;
            window.canJump = true;
        }
    }
}

// initialize your global visuals safely if not done already
window.visuals = window.visuals || { players: {}, operators: {}, staticNumberblocks: {} };

// animate loop (exactly like this)
function animate() {
    requestAnimationFrame(animate);

    const currentTime = performance.now();
    const delta = (currentTime - window.prevTime) / 1000;
    window.prevTime = currentTime;

    // Only update local controls if we have pointer lock
    if (controls && controls.isLocked) {
        window.updateControls(controls, delta);
    }

    // Update player physics (server-driven movement)
    updatePlayerPhysics(delta);

    // Check if we have our player state from the server
    if (window.room && window.room.state && window.room.state.players) {
        const playerState = window.room.state.players.get(window.room.sessionId);
        if (playerState) {
            // Always update player mesh position based on server state
            if (window.playerNumberblock && window.playerNumberblock.mesh) {
                // Update the player mesh position
                window.playerNumberblock.mesh.position.set(playerState.x, playerState.y, playerState.z);
                window.playerNumberblock.mesh.rotation.y = playerState.rotationY;
                
                // Make sure player visibility is properly set based on view mode
                window.playerNumberblock.mesh.visible = !window.isFirstPerson;
            }

            // Update the camera based on the current view mode
            if (window.isFirstPerson && !window.isFreeCameraMode) {
                // First-person camera updates
                updateFirstPersonCamera();
            } else if (window.isFreeCameraMode) {
                // Free camera mode - no update needed, handled by controls
            } else {
                // Third-person camera updates
                updateThirdPersonCamera();
            }
        }
    }

    // Update other players in the scene if available
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
    // Don't send updates if we're in free camera mode
    if (window.isFreeCameraMode) {
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

// Handle view-specific camera updates
function updateFirstPersonCamera() {
    // First-person: Directly update camera with player state
    const playerState = window.room.state.players.get(window.room.sessionId);
    
    if (playerState) {
        // Update the camera position to match the server player position
        camera.position.set(
            playerState.x, 
            playerState.y + window.playerHeight, 
            playerState.z
        );
        
        // Apply rotation from the server OR from local client
        // We'll use a hybrid approach: server position with client-side rotation for responsiveness
        // If playerRotationY exists, use that (client-side), otherwise fall back to server
        const rotationY = (typeof window.playerRotationY !== 'undefined') 
            ? window.playerRotationY 
            : playerState.rotationY;
            
        const pitch = (typeof window.firstPersonCameraPitch !== 'undefined')
            ? window.firstPersonCameraPitch
            : playerState.pitch;
            
        // Apply rotation using quaternion to prevent gimbal lock
        camera.quaternion.setFromEuler(new THREE.Euler(
            pitch,
            rotationY,
            0,
            'YXZ'  // Important for proper FPS controls
        ));
        
        // Make sure player mesh is invisible in first-person mode
        if (window.playerNumberblock && window.playerNumberblock.mesh) {
            window.playerNumberblock.mesh.visible = false;
            
            // Make sure it stays updated with position though
            window.playerNumberblock.mesh.position.set(playerState.x, playerState.y, playerState.z);
            window.playerNumberblock.mesh.rotation.y = rotationY;
        }
        
        // Update controls position
        controls.getObject().position.copy(camera.position);
    }
}

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

// Create player's block
debug('Initializing Player');
player = window.createPlayerNumberblock(scene);
window.player = player;
debug('Player successfully initialized');

// Mouse move event handler - capture mouse movement for camera rotation
function onMouseMove(event) {
    if (window.controls && window.controls.isLocked) {
        // Store mouse movement for input state
        window.inputState.mouseDelta.x += event.movementX;
        window.inputState.mouseDelta.y += event.movementY;
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
