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
    if (window.playerEntity && window.playerEntity.mesh) {
        window.playerEntity.mesh.visible = false;
    }
    
    // Hide selection rings in first-person view
    if (window.rtsSelectionRings) {
        window.rtsSelectionRings.forEach(ring => {
            if (ring) ring.visible = false;
        });
    }
    
    // Reset free camera variables
    window.freeCameraYaw = 0;
    window.freeCameraPitch = 0;
    
    // Hide RTS cursor when switching to first-person view
    if (document.getElementById('rts-cursor')) {
        document.getElementById('rts-cursor').style.display = 'none';
    }
    
    // Reset cursor styles that might have been set in RTS mode
    document.body.style.cursor = 'default';
    document.documentElement.style.cursor = 'default';
    renderer.domElement.style.cursor = 'default';
    
    // Then relock pointer for first-person view
    if (controls && !controls.isLocked) {
        controls.lock();
    }
    
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
    else if (window.playerEntity && window.playerEntity.mesh) {
        playerX = window.playerEntity.mesh.position.x;
        playerY = window.playerEntity.mesh.position.y;
        playerZ = window.playerEntity.mesh.position.z;
        rotationY = window.playerEntity.mesh.rotation.y || 0;
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
    if (window.playerEntity && window.playerEntity.mesh) {
        window.playerEntity.mesh.visible = true;
    }
    
    // Hide selection rings in third-person view
    if (window.rtsSelectionRings) {
        window.rtsSelectionRings.forEach(ring => {
            if (ring) ring.visible = false;
        });
    }
    
    // Hide RTS cursor when switching to third-person view
    if (document.getElementById('rts-cursor')) {
        document.getElementById('rts-cursor').style.display = 'none';
    }
    
    // Reset cursor styles that might have been set in RTS mode
    document.body.style.cursor = 'default';
    document.documentElement.style.cursor = 'default';
    renderer.domElement.style.cursor = 'default';
    
    // Relock pointer for third-person view
    if (controls && !controls.isLocked) {
        controls.lock();
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
    if (window.playerEntity && window.playerEntity.mesh) {
        window.playerEntity.mesh.visible = true;
    }
    
    // Hide selection rings in free camera view
    if (window.rtsSelectionRings) {
        window.rtsSelectionRings.forEach(ring => {
            if (ring) ring.visible = false;
        });
    }
    
    // Hide RTS cursor when switching to free camera view
    if (document.getElementById('rts-cursor')) {
        document.getElementById('rts-cursor').style.display = 'none';
    }
    
    // Reset cursor styles that might have been set in RTS mode
    document.body.style.cursor = 'default';
    document.documentElement.style.cursor = 'default';
    renderer.domElement.style.cursor = 'default';
    
    // Relock pointer for free camera view
    if (controls && !controls.isLocked) {
        controls.lock();
    }
    
    // Keep pointer lock active but disable normal controls
    controls.enabled = false;
    
    // Initialize free camera movement speed
    window.freeCameraSpeed = 0.5;
    
    console.log("Switched to free camera view");
};

// RTS view setup
window.switchToRTSView = function() {
    // Show player mesh since we're viewing from above
    if (window.playerEntity && window.playerEntity.mesh) {
        window.playerEntity.mesh.visible = true;
    }
    
    // Show selection rings in RTS view if there are selected units
    if (window.rtsSelectionRings) {
        window.rtsSelectionRings.forEach(ring => {
            if (ring) ring.visible = true;
        });
    }
    
    // For RTS view, we need to see the cursor and keep it unlocked
    if (controls && controls.isLocked) {
        controls.unlock();
    }
    controls.enabled = false;
    
    // Set a timeout to ensure we stay unlocked if the browser is slow to respond
    setTimeout(() => {
        // Double check that we're still in RTS mode
        if (window.isRTSMode && controls && controls.isLocked) {
            controls.unlock();
        }
    }, 100);
    
    // Initialize RTS selection box variables
    window.rtsSelectionBoxActive = false;
    window.rtsSelectionStartX = 0;
    window.rtsSelectionStartY = 0;
    window.rtsSelectionEndX = 0;
    window.rtsSelectionEndY = 0;
    
    // Create selection box element if it doesn't exist
    if (!document.getElementById('rts-selection-box')) {
        const selectionBox = document.createElement('div');
        selectionBox.id = 'rts-selection-box';
        selectionBox.style.position = 'fixed';
        selectionBox.style.border = '2px solid #00ff00';
        selectionBox.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
        selectionBox.style.pointerEvents = 'none';
        selectionBox.style.display = 'none';
        selectionBox.style.zIndex = '9998'; // Just below cursor
        document.body.appendChild(selectionBox);
    }
    
    // Add specific RTS mode keyboard listener
    if (!window.rtsKeyboardListenerAdded) {
        document.addEventListener('keydown', function rtsKeyboardHandler(event) {
            if (!window.isRTSMode) return;
            
            // Log key presses in RTS mode for debugging
            console.log("RTS Mode Key Pressed:", event.code);
            
            switch (event.code) {
                case 'KeyW':
                    window.inputState.keys.w = true;
                    console.log("W key pressed in RTS mode");
                    break;
                case 'KeyA':
                    window.inputState.keys.a = true;
                    console.log("A key pressed in RTS mode");
                    break;
                case 'KeyS':
                    window.inputState.keys.s = true;
                    console.log("S key pressed in RTS mode");
                    break;
                case 'KeyD':
                    window.inputState.keys.d = true;
                    console.log("D key pressed in RTS mode");
                    break;
                case 'KeyQ':
                    window.inputState.keys.q = true;
                    console.log("Q key pressed in RTS mode");
                    break;
                case 'KeyE':
                    window.inputState.keys.e = true;
                    console.log("E key pressed in RTS mode");
                    break;
            }
        });
        
        document.addEventListener('keyup', function rtsKeyboardHandler(event) {
            if (!window.isRTSMode) return;
            
            switch (event.code) {
                case 'KeyW':
                    window.inputState.keys.w = false;
                    break;
                case 'KeyA':
                    window.inputState.keys.a = false;
                    break;
                case 'KeyS':
                    window.inputState.keys.s = false;
                    break;
                case 'KeyD':
                    window.inputState.keys.d = false;
                    break;
                case 'KeyQ':
                    window.inputState.keys.q = false;
                    break;
                case 'KeyE':
                    window.inputState.keys.e = false;
                    break;
            }
        });
        
        window.rtsKeyboardListenerAdded = true;
    }
    
    // Set initial camera position - start above the player
    let playerX = 0, playerZ = 0;
    
    // Try to get player position from server or local object
    if (window.room && window.room.state && window.room.state.players) {
        const playerState = window.room.state.players.get(window.room.sessionId);
        if (playerState) {
            playerX = playerState.x;
            playerZ = playerState.z;
        }
    }
    // Fallback to local player object
    else if (window.playerEntity && window.playerEntity.mesh) {
        playerX = window.playerEntity.mesh.position.x;
        playerZ = window.playerEntity.mesh.position.z;
    }
    
    // Position camera above player
    window.camera.position.set(playerX, window.rtsCameraHeight, playerZ);
    
    // Set camera to look straight down
    window.camera.quaternion.setFromEuler(new THREE.Euler(-Math.PI/2, 0, 0, 'YXZ'));
    
    // Force an immediate render to update the view
    if (window.renderer && window.scene) {
        window.renderer.render(window.scene, window.camera);
    }
    
    // Add RTS cursor unless it already exists
    if (!document.getElementById('rts-cursor')) {
        createRTSCursor();
    }
    
    // Show our custom RTS cursor and hide system cursor
    const rtsCursor = document.getElementById('rts-cursor');
    rtsCursor.style.display = 'block';
    rtsCursor.style.transform = 'translate(-50%, -50%)';
    
    // Get current mouse position from system
    const mouseX = window.lastMouseX || window.innerWidth / 2;
    const mouseY = window.lastMouseY || window.innerHeight / 2;
    
    // Position cursor at current mouse position
    rtsCursor.style.left = mouseX + 'px';
    rtsCursor.style.top = mouseY + 'px';
    
    // Apply cursor hiding to all relevant elements
    document.body.style.cursor = 'none';
    document.documentElement.style.cursor = 'none';
    renderer.domElement.style.cursor = 'none';
    
    // Hide pointer lock instructions if they're visible
    const instructions = document.getElementById('lock-instructions');
    if (instructions) {
        instructions.style.display = 'none';
    }
    
    console.log("Switched to RTS view");
};

// Handle mouse movement for free camera
function onMouseMove(event) {
    // In RTS mode, handle selection box if active
    if (window.isRTSMode) {
        if (window.rtsSelectionBoxActive) {
            window.rtsSelectionEndX = event.clientX;
            window.rtsSelectionEndY = event.clientY;
            updateSelectionBox();
        }
        
        // Ensure pointer lock is off and just update our custom cursor
        if (controls && controls.isLocked) {
            controls.unlock();
        }
        
        // Update our custom cursor position
        if (document.getElementById('rts-cursor')) {
            updateRTSCursorPosition(event);
        }
        return;
    }
    
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
    
    // In RTS mode, camera rotation with mouse is disabled
    // as the camera always looks straight down
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
    if (window.playerEntity && window.playerEntity.mesh) {
        window.playerEntity.mesh.visible = true;
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
            // Don't lock pointer if in RTS mode
            if (window.isRTSMode) {
                return;
            }
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
                
                // Create the player's entity if not already created
                if (!window.playerLoaded) {
                    debug('Creating player entity after click to play');
                    // Initialize the player
                    window.playerEntity = window.createPlayerEntity(scene);
                    window.player = window.playerEntity;
                    window.playerLoaded = true;
                    
                    // Make sure player mesh is invisible in first-person view
                    if (window.playerEntity && window.playerEntity.mesh) {
                        window.playerEntity.mesh.visible = false;
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
                // If we were in RTS mode, don't show instructions on unlock
                if (window.isRTSMode) {
                    instructions.style.display = 'none';
                    
                    // Make sure RTS cursor is still visible
                    if (document.getElementById('rts-cursor')) {
                        document.getElementById('rts-cursor').style.display = 'block';
                    }
                } else {
                    // Only show instructions if we're not in free camera mode AND not already playing
                    if (!window.isFreeCameraMode && !window.playerLoaded) {
                        instructions.style.display = 'block';
                    } else {
                        instructions.style.display = 'none';
                    }
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
            
            // Update player entity position and scale to match player value
            if (typeof updatePlayerEntity === 'function') {
                updatePlayerEntity(player.value);
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
window.visuals = window.visuals || { players: {}, operators: {}, staticEntities: {} };

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
    } else if (window.isRTSMode) {
        // Update RTS camera movement - call directly instead of through updateControls
        updateRTSCameraMovement(delta);
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
            if (window.playerEntity && window.playerEntity.mesh) {
                window.playerEntity.mesh.position.set(playerState.x, playerState.y, playerState.z);
                window.playerEntity.mesh.rotation.y = playerState.rotationY;
                window.playerEntity.mesh.visible = window.isFreeCameraMode || window.isRTSMode || !window.isFirstPerson;
            }
            
            // Only update camera for first/third person modes
            if (!window.isFreeCameraMode && !window.isRTSMode) {
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
        window.updateRemotePlayers(delta); // Pass delta time
    }
    
    // <<< ADDED: Update local player animations & mixer >>>
    if (window.playerEntity && typeof window.playerEntity.update === 'function') {
        window.playerEntity.update(delta); // Update mixer
    }
    if (window.playerEntity && typeof window.playerEntity.updateAnimationBasedOnState === 'function') {
        window.playerEntity.updateAnimationBasedOnState(); // Update animation based on input
    }
    // <<< END ADDED >>>
    
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function sendInputUpdate() {
    // Don't send updates if we're in free camera mode or RTS mode or if player isn't loaded yet
    if (window.isFreeCameraMode || window.isRTSMode || !window.playerLoaded) {
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
        if (window.playerEntity && window.playerEntity.mesh) {
            window.playerEntity.mesh.visible = false;
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
    if (window.playerEntity && window.playerEntity.mesh) {
        window.playerEntity.mesh.visible = true;
        
        // Update position
        window.playerEntity.mesh.position.set(playerState.x, playerState.y, playerState.z);
        
        // Smooth rotation
        const currentRot = window.playerEntity.mesh.rotation.y;
        const targetRot = playerState.rotationY;
        
        // Find the shortest rotation path
        let rotDiff = targetRot - currentRot;
        if (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
        if (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
        
        // Apply smooth rotation
        window.playerEntity.mesh.rotation.y += rotDiff * 0.1;
    }
}

// Mouse down event handler
function onMouseDown(event) {
    // For RTS mode, handle without pointer lock
    if (window.isRTSMode) {
        // Left button: start selection box or select unit
        if (event.button === 0) {
            // Start selection box
            window.rtsSelectionBoxActive = true;
            window.rtsSelectionStartX = event.clientX;
            window.rtsSelectionStartY = event.clientY;
            window.rtsSelectionEndX = event.clientX;
            window.rtsSelectionEndY = event.clientY;
            
            // Show selection box
            updateSelectionBox();
        }
        // Right button: move selected unit(s)
        else if (event.button === 2) {
            moveSelectedUnits();
        }
        return;
    }
    
    // Original behavior for other modes (which require pointer lock)
    if (!document.pointerLockElement) return;
    
    // Left button: 0, Middle: 1, Right: 2
    if (event.button === 2) {
        window.rightMouseDown = true;
    } else if (event.button === 1) {
        window.middleMouseDown = true;
    }
}

// Mouse up event handler
function onMouseUp(event) {
    // For RTS mode, handle specially
    if (window.isRTSMode) {
        // Left button: complete selection box
        if (event.button === 0 && window.rtsSelectionBoxActive) {
            window.rtsSelectionBoxActive = false;
            
            // Hide selection box
            const selectionBox = document.getElementById('rts-selection-box');
            if (selectionBox) {
                selectionBox.style.display = 'none';
            }
            
            // Get final selection area
            window.rtsSelectionEndX = event.clientX;
            window.rtsSelectionEndY = event.clientY;
            
            // If selection area is very small, treat as a single click
            const selectionWidth = Math.abs(window.rtsSelectionEndX - window.rtsSelectionStartX);
            const selectionHeight = Math.abs(window.rtsSelectionEndY - window.rtsSelectionStartY);
            
            if (selectionWidth < 5 && selectionHeight < 5) {
                // Single click - select individual unit
                selectUnitInRTSMode();
            } else {
                // Box selection - select all units in box
                selectUnitsInBoxRTSMode();
            }
        }
        
        // Just ensure cursor is still visible
        if (document.getElementById('rts-cursor')) {
            document.getElementById('rts-cursor').style.display = 'block';
            
            // Update cursor position for consistency
            updateRTSCursorPosition({
                clientX: event.clientX,
                clientY: event.clientY
            });
        }
        return;
    }
    
    // Standard handling for other modes
    if (event.button === 2) {
        window.rightMouseDown = false;
    } else if (event.button === 1) {
        window.middleMouseDown = false;
    }
}

// Mouse move event handler for RTS mode selection box
function onMouseMove(event) {
    // In RTS mode, handle selection box if active
    if (window.isRTSMode) {
        if (window.rtsSelectionBoxActive) {
            window.rtsSelectionEndX = event.clientX;
            window.rtsSelectionEndY = event.clientY;
            updateSelectionBox();
        }
        
        // Ensure pointer lock is off and just update our custom cursor
        if (controls && controls.isLocked) {
            controls.unlock();
        }
        
        // Update our custom cursor position
        if (document.getElementById('rts-cursor')) {
            updateRTSCursorPosition(event);
        }
        return;
    }
    
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
    
    // In RTS mode, camera rotation with mouse is disabled
    // as the camera always looks straight down
}

// Perform unit selection in RTS mode using raycasting
function selectUnitInRTSMode() {
    if (!window.isRTSMode) return;
    
    // Ensure pointer is unlocked in RTS mode
    if (controls && controls.isLocked) {
        controls.unlock();
    }
    
    // Get the current mouse position
    const cursor = document.getElementById('rts-cursor');
    if (!cursor) return;
    
    // Get cursor position and renderer bounds
    const rect = renderer.domElement.getBoundingClientRect();
    const cursorX = parseInt(cursor.style.left);
    const cursorY = parseInt(cursor.style.top);
    
    // Create a raycaster for the cursor position
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    // Calculate mouse position in normalized device coordinates
    // Use the cursor's center point for more accurate picking
    mouse.x = ((cursorX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((cursorY - rect.top) / rect.height) * 2 + 1;
    
    // Update the raycaster with the camera and mouse position
    raycaster.setFromCamera(mouse, window.camera);
    
    // Get all objects that could be selected
    const selectableObjects = [];
    
    // Add the player's mesh
    if (window.playerEntity && window.playerEntity.mesh) {
        selectableObjects.push(window.playerEntity.mesh);
    }
    
    // Add other selectable units if any
    // For future: Add enemy units, resources, buildings, etc.
    
    // Perform the raycast
    const intersects = raycaster.intersectObjects(selectableObjects, true);
    
    // If an object was hit, select it
    if (intersects.length > 0) {
        let selectedMesh = intersects[0].object;
        
        // Find the top-level mesh (for models with nested meshes)
        while (selectedMesh.parent && selectedMesh.parent !== scene) {
            selectedMesh = selectedMesh.parent;
        }
        
        // Determine which entity this belongs to
        let selectedEntity = null;
        
        // Check if it's the player
        if (window.playerEntity && window.playerEntity.mesh && 
            (window.playerEntity.mesh === selectedMesh || 
            window.playerEntity.mesh.id === selectedMesh.id)) {
            selectedEntity = window.playerEntity;
        }
        
        // If we found a valid entity, select it
        if (selectedEntity) {
            // Add to the selected units array
            window.rtsSelectedUnits.push(selectedEntity);
            
            // Also maintain backward compatibility with single-selection
            window.rtsSelectedUnit = selectedEntity;
            
            // Apply visual highlight
            highlightSelectedUnit(selectedEntity);
            
            console.log("[RTS] Selected unit:", selectedEntity);
        }
    } else {
        console.log("[RTS] No unit selected");
    }
    
    // Ensure cursor is up to date after selection
    // This prevents cursor from "freezing" after clicking
    requestAnimationFrame(() => {
        updateRTSCursorPosition({
            clientX: window.lastMouseX || window.innerWidth / 2,
            clientY: window.lastMouseY || window.innerHeight / 2
        });
    });
}

// Create a selection ring for a specific unit
function createSelectionRingForUnit(unit) {
    if (!unit || !unit.mesh) return;
    
    // Create a ring geometry
    const radius = 1.2; // Slightly larger than the unit
    const innerRadius = radius * 0.8;
    const segments = 32;
    
    const ringGeometry = new THREE.RingGeometry(innerRadius, radius, segments);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
    });
    
    // Create the ring mesh
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    
    // Position it flat on the ground but slightly above to avoid z-fighting
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    ring.position.x = unit.mesh.position.x;
    ring.position.z = unit.mesh.position.z;
    
    // Add the ring to the scene
    scene.add(ring);
    
    // Save reference to the unit this ring belongs to
    ring.userData.unitId = unit.id || unit.mesh.id;
    
    // Add to the ring array for management
    if (!window.rtsSelectionRings) {
        window.rtsSelectionRings = [];
    }
    window.rtsSelectionRings.push(ring);
    
    // Register animation callback for the ring if it doesn't exist
    if (!window.rtsRingAnimationAdded) {
        window.registerAnimationCallback(animateSelectionRings);
        window.rtsRingAnimationAdded = true;
    }
}

// Animate all selection rings
function animateSelectionRings(delta) {
    // Skip if no rings
    if (!window.rtsSelectionRings || window.rtsSelectionRings.length === 0) return;
    
    // Animation time
    const time = performance.now() * 0.001;
    
    // Update all rings
    window.rtsSelectionRings.forEach(ring => {
        // Skip if ring was deleted
        if (!ring || !ring.material) return;
        
        // Find the unit this ring belongs to
        const unitId = ring.userData.unitId;
        let unitMesh = null;
        
        // Check if it's the player
        if (window.playerEntity && window.playerEntity.mesh && 
            (window.playerEntity.id === unitId || window.playerEntity.mesh.id === unitId)) {
            unitMesh = window.playerEntity.mesh;
        }
        
        // Future: Check other units
        
        // Update ring position to follow unit
        if (unitMesh) {
            ring.position.x = unitMesh.position.x;
            ring.position.z = unitMesh.position.z;
        }
        
        // Rotate and pulse opacity for effect
        ring.rotation.z += delta * 0.5;
        ring.material.opacity = 0.5 + 0.3 * Math.sin(time * 2);
    });
}

// Move selected units to clicked position in RTS mode
function moveSelectedUnits() {
    if (!window.isRTSMode) return;
    
    // Ensure pointer is unlocked in RTS mode
    if (controls && controls.isLocked) {
        controls.unlock();
    }
    
    // Only proceed if we have selected units
    if (!window.rtsSelectedUnits || window.rtsSelectedUnits.length === 0) {
        console.log("[RTS] No units selected to move");
        return;
    }
    
    // Get the current mouse position
    const cursor = document.getElementById('rts-cursor');
    if (!cursor) return;
    
    // Get cursor position and renderer bounds
    const rect = renderer.domElement.getBoundingClientRect();
    const cursorX = parseInt(cursor.style.left);
    const cursorY = parseInt(cursor.style.top);
    
    // Create a raycaster for the cursor position
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    // Calculate mouse position in normalized device coordinates
    mouse.x = ((cursorX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((cursorY - rect.top) / rect.height) * 2 + 1;
    
    // Update the raycaster with the camera and mouse position
    raycaster.setFromCamera(mouse, window.camera);
    
    // Get all objects we can move onto (usually just the floor)
    const floor = scene.children.find(child => 
        child instanceof THREE.Mesh && 
        child.rotation.x === -Math.PI / 2
    );
    
    const moveTargets = [floor];
    
    // Perform the raycast
    const intersects = raycaster.intersectObjects(moveTargets, false);
    
    // If we hit the floor, move the selected units there
    if (intersects.length > 0) {
        const targetPosition = intersects[0].point;
        
        // Create a move command and send it to the server
        if (window.room) {
            // Send move command for each selected unit
            window.rtsSelectedUnits.forEach(unit => {
                window.room.send("moveCommand", {
                    x: targetPosition.x,
                    z: targetPosition.z,
                    unitId: unit.id || unit.mesh.id // Include unit ID if we have multiple units
                });
            });
            
            // Visual feedback - create a temporary marker at the clicked position
            createMoveMarker(targetPosition);
            
            console.log("[RTS] Moving units to:", targetPosition);
        }
    }
    
    // Ensure cursor is up to date after move command
    requestAnimationFrame(() => {
        updateRTSCursorPosition({
            clientX: window.lastMouseX || window.innerWidth / 2,
            clientY: window.lastMouseY || window.innerHeight / 2
        });
    });
}

// Create a visual marker for move commands
function createMoveMarker(position) {
    // Create a simple circular marker
    const markerGeometry = new THREE.CircleGeometry(0.5, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00ff00,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    
    // Position slightly above the ground to prevent z-fighting
    marker.position.set(position.x, 0.01, position.z);
    marker.rotation.x = -Math.PI / 2; // Rotate to be flat on the ground
    
    scene.add(marker);
    
    // Add a slight pulsing animation
    let pulseTime = 0;
    
    function animateMarker(delta) {
        pulseTime += delta;
        
        // Pulse the opacity
        marker.material.opacity = 0.7 * (0.5 + 0.5 * Math.sin(pulseTime * 5));
        
        // Scale down over time
        const scale = Math.max(0.1, 1 - pulseTime);
        marker.scale.set(scale, scale, scale);
        
        // Remove when animation completes
        if (pulseTime > 1) {
            window.unregisterAnimationCallback(animateMarker);
            scene.remove(marker);
            marker.geometry.dispose();
            marker.material.dispose();
        }
    }
    
    // Register the animation
    window.registerAnimationCallback(animateMarker);
}

// Create a custom cursor for RTS mode
function createRTSCursor() {
    // Create a div element for our custom cursor
    const cursor = document.createElement('div');
    cursor.id = 'rts-cursor';
    
    // Set style for the cursor
    cursor.style.position = 'fixed';
    cursor.style.width = '32px';
    cursor.style.height = '32px';
    cursor.style.pointerEvents = 'none'; // Prevent the cursor from intercepting clicks
    cursor.style.zIndex = '9999'; // Ensure cursor is on top of everything
    // SVG with crosshair cursor design - exact center is the intersection point
    cursor.style.backgroundImage = 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'><circle cx=\'16\' cy=\'16\' r=\'14\' fill=\'none\' stroke=\'white\' stroke-width=\'2\'/><circle cx=\'16\' cy=\'16\' r=\'2\' fill=\'white\'/><path d=\'M16 8 L16 2\' stroke=\'white\' stroke-width=\'2\'/><path d=\'M16 30 L16 24\' stroke=\'white\' stroke-width=\'2\'/><path d=\'M8 16 L2 16\' stroke=\'white\' stroke-width=\'2\'/><path d=\'M30 16 L24 16\' stroke=\'white\' stroke-width=\'2\'/></svg>")';
    cursor.style.backgroundSize = 'contain';
    cursor.style.display = 'none'; // Initially hidden
    
    // Position the cursor so its center is at the mouse position
    cursor.style.left = '0';
    cursor.style.top = '0';
    cursor.style.transform = 'translate(-50%, -50%)';
    
    // Add cursor element to the document
    document.body.appendChild(cursor);
    
    // Initialize cursor at center of screen
    updateRTSCursorPosition({
        clientX: window.innerWidth / 2,
        clientY: window.innerHeight / 2
    });
    
    // Add mousemove listener to update custom cursor position
    document.addEventListener('mousemove', updateRTSCursorPosition);
    
    return cursor;
}

// Update the RTS cursor position
function updateRTSCursorPosition(event) {
    // Store last mouse position for reference
    window.lastMouseX = event.clientX;
    window.lastMouseY = event.clientY;
    
    const cursor = document.getElementById('rts-cursor');
    if (!cursor) return;
    
    // Only update cursor position if it's visible (RTS mode)
    if (cursor.style.display === 'none') return;
    
    // Update cursor position to follow mouse exactly
    // Position is set so the center of the cursor is at the mouse position
    cursor.style.left = event.clientX + 'px';
    cursor.style.top = event.clientY + 'px';
    
    // Make sure transform is applied for centering
    cursor.style.transform = 'translate(-50%, -50%)';
    
    // When in RTS mode, update ray cast for hover effects
    if (window.isRTSMode) {
        updateRTSHoverEffects(event);
    }
}

// Update hover effects for RTS mode
function updateRTSHoverEffects(event) {
    // Create a raycaster for mouse position
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const rect = renderer.domElement.getBoundingClientRect();
    
    // Calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Update the raycaster with the camera and mouse position
    raycaster.setFromCamera(mouse, window.camera);
    
    // Get all selectable objects
    const selectableObjects = [];
    
    // Add the player's mesh
    if (window.playerEntity && window.playerEntity.mesh) {
        selectableObjects.push(window.playerEntity.mesh);
    }
    
    // For future: Add other selectable units, buildings, etc.
    
    // Perform the raycast
    const intersects = raycaster.intersectObjects(selectableObjects, true);
    
    const cursor = document.getElementById('rts-cursor');
    
    // If hovering over a selectable object, change cursor
    if (intersects.length > 0) {
        // Change cursor to selection cursor (green highlight)
        cursor.style.backgroundImage = 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'><circle cx=\'16\' cy=\'16\' r=\'14\' fill=\'none\' stroke=\'%2300ff00\' stroke-width=\'2\'/><circle cx=\'16\' cy=\'16\' r=\'2\' fill=\'%2300ff00\'/><path d=\'M16 8 L16 2\' stroke=\'%2300ff00\' stroke-width=\'2\'/><path d=\'M16 30 L16 24\' stroke=\'%2300ff00\' stroke-width=\'2\'/><path d=\'M8 16 L2 16\' stroke=\'%2300ff00\' stroke-width=\'2\'/><path d=\'M30 16 L24 16\' stroke=\'%2300ff00\' stroke-width=\'2\'/></svg>")';
    } else {
        // Reset to default cursor (white)
        cursor.style.backgroundImage = 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'><circle cx=\'16\' cy=\'16\' r=\'14\' fill=\'none\' stroke=\'white\' stroke-width=\'2\'/><circle cx=\'16\' cy=\'16\' r=\'2\' fill=\'white\'/><path d=\'M16 8 L16 2\' stroke=\'white\' stroke-width=\'2\'/><path d=\'M16 30 L16 24\' stroke=\'white\' stroke-width=\'2\'/><path d=\'M8 16 L2 16\' stroke=\'white\' stroke-width=\'2\'/><path d=\'M30 16 L24 16\' stroke=\'white\' stroke-width=\'2\'/></svg>")';
    }
}

// Update the display of the selection box
function updateSelectionBox() {
    const selectionBox = document.getElementById('rts-selection-box');
    if (!selectionBox) return;
    
    // Calculate box coordinates
    const left = Math.min(window.rtsSelectionStartX, window.rtsSelectionEndX);
    const top = Math.min(window.rtsSelectionStartY, window.rtsSelectionEndY);
    const width = Math.abs(window.rtsSelectionEndX - window.rtsSelectionStartX);
    const height = Math.abs(window.rtsSelectionEndY - window.rtsSelectionStartY);
    
    // Update box position and size
    selectionBox.style.left = left + 'px';
    selectionBox.style.top = top + 'px';
    selectionBox.style.width = width + 'px';
    selectionBox.style.height = height + 'px';
    
    // Show the box
    selectionBox.style.display = 'block';
}

// Select all units within the selection box
function selectUnitsInBoxRTSMode() {
    // Get the renderer bounds for coordinate conversion
    const rect = renderer.domElement.getBoundingClientRect();
    
    // Convert box coordinates to normalized device coordinates (-1 to 1)
    const left = Math.min(window.rtsSelectionStartX, window.rtsSelectionEndX);
    const right = Math.max(window.rtsSelectionStartX, window.rtsSelectionEndX);
    const top = Math.min(window.rtsSelectionStartY, window.rtsSelectionEndY);
    const bottom = Math.max(window.rtsSelectionStartY, window.rtsSelectionEndY);
    
    // Get an array of all selectable units in the scene
    const selectableUnits = [];
    
    // Add the player's unit
    if (window.playerEntity && window.playerEntity.mesh) {
        selectableUnits.push(window.playerEntity);
    }
    
    // TODO: Add other selectable units (allied units) when they're implemented
    
    // Clear previous selections
    clearAllSelections();
    
    // Check each unit to see if it's in the selection box
    selectableUnits.forEach(unit => {
        if (!unit.mesh) return;
        
        // Project unit position to screen coordinates
        const position = new THREE.Vector3();
        position.copy(unit.mesh.position);
        
        // Convert 3D position to screen position
        position.project(window.camera);
        
        // Convert to pixel coordinates
        const screenX = ((position.x + 1) / 2) * rect.width + rect.left;
        const screenY = ((-position.y + 1) / 2) * rect.height + rect.top;
        
        // Check if the unit is inside the selection box
        if (screenX >= left && screenX <= right && screenY >= top && screenY <= bottom) {
            // Add to selection
            window.rtsSelectedUnits.push(unit);
            
            // Apply visual selection to the unit
            highlightSelectedUnit(unit);
            
            console.log("[RTS] Added unit to selection:", unit);
        }
    });
    
    console.log("[RTS] Total units selected:", window.rtsSelectedUnits.length);
}

// Clear all current selections
function clearAllSelections() {
    // Clear the single selected unit reference
    window.rtsSelectedUnit = null;
    
    // Remove highlights from all previously selected units
    if (window.rtsSelectedUnits && window.rtsSelectedUnits.length > 0) {
        window.rtsSelectedUnits.forEach(unit => {
            // Restore original material if saved
            if (unit.rtsMaterial && unit.mesh) {
                unit.mesh.material = unit.rtsMaterial;
            }
        });
    }
    
    // Clear the selection array
    window.rtsSelectedUnits = [];
    
    // Remove any selection rings
    if (window.rtsSelectionRing) {
        scene.remove(window.rtsSelectionRing);
        if (window.rtsSelectionRing.geometry) window.rtsSelectionRing.geometry.dispose();
        if (window.rtsSelectionRing.material) window.rtsSelectionRing.material.dispose();
    }
    
    // Remove all selection rings from the ring array
    if (window.rtsSelectionRings && window.rtsSelectionRings.length > 0) {
        window.rtsSelectionRings.forEach(ring => {
            scene.remove(ring);
            if (ring.geometry) ring.geometry.dispose();
            if (ring.material) ring.material.dispose();
        });
    }
    
    // Initialize the selection rings array if it doesn't exist
    window.rtsSelectionRings = [];
}

// Apply visual highlight to a selected unit
function highlightSelectedUnit(unit) {
    if (!unit || !unit.mesh) return;

    // Ensure the material exists before cloning
    if (unit.mesh.material) {
        // Save original material for later restoration only if it hasn't been saved yet
        if (!unit.rtsMaterial) {
            unit.rtsMaterial = unit.mesh.material.clone();
        }

        // Create highlight material only if the original exists
        const highlightMaterial = unit.mesh.material.clone();
        highlightMaterial.emissive = new THREE.Color(0x333333);
        highlightMaterial.emissiveIntensity = 0.5;

        // Apply highlight to indicate selection
        unit.mesh.material = highlightMaterial;
    } else {
        console.warn("[highlightSelectedUnit] Unit mesh has no material:", unit);
    }

    // Create a selection ring for this unit
    createSelectionRingForUnit(unit);
}
