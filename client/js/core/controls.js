// Numberblocks game - First-person controls implementation

// Global variables
window.moveForward = false;
window.moveBackward = false;
window.moveLeft = false;
window.moveRight = false;
window.turnLeft = false;    // For diagonal movement forward-left
window.turnRight = false;   // For diagonal movement forward-right
window.canJump = false;
// isFirstPerson is a global variable attached to the window object in game-engine.js
window.prevTime = performance.now();
window.velocity = new THREE.Vector3();
window.direction = new THREE.Vector3();

// Add input state object for server-based movement
window.inputState = {
  keys: { w: false, a: false, s: false, d: false, space: false, q: false, e: false, shift: false },
  mouseDelta: { x: 0, y: 0 }
};

// Add variable for right mouse button state tracking
window.rightMouseDown = false;
window.middleMouseDown = false;

// Player settings
window.playerHeight = 2.0;             // Height of camera from ground
window.moveSpeed = 50.0;                // Units per second
window.turnSpeed = 2.0;                // Rotation speed for Q/E turning
window.jumpHeight = 2.0;               // Jump height in units
window.jumpPressed = false;            // Track jump button press

// Third-person camera settings
window.thirdPersonCameraDistance = 5;  // Distance for the third person camera
window.thirdPersonCameraMinDistance = 2; // Minimum zoom distance
window.thirdPersonCameraMaxDistance = 10; // Maximum zoom distance
window.thirdPersonCameraZoomSpeed = 0.5; // Zoom speed multiplier
window.thirdPersonCameraOrbitSpeed = 0.003; // Orbit speed multiplier
window.thirdPersonCameraHeight = 3.0; // Height of camera above player 
window.thirdPersonCameraOrbitX = 0; // Horizontal orbit angle (left/right)
window.thirdPersonCameraOrbitY = 0.5; // Vertical orbit angle (up/down) 
window.thirdPersonCameraMinY = -0.3; // Minimum vertical orbit angle
window.thirdPersonCameraMaxY = 1.0; // Maximum vertical orbit angle

// Add variables for free camera mode
window.freeCameraSpeed = 0.3;         // Speed for free camera movement
window.freeCameraRotationSpeed = 0.003; // Rotation speed for free camera
window.freeCameraPitch = 0;          // Vertical rotation of free camera
window.freeCameraYaw = 0;            // Horizontal rotation of free camera

// Mouse sensitivity settings
window.mouseSensitivity = {
  firstPerson: 1.0,    // Sensitivity multiplier in first-person
  thirdPerson: 0.7,    // Sensitivity multiplier in third-person (slightly lower for smoother movement)
  current: 1.0         // Current sensitivity based on view mode
};

// Add a global viewMode state variable
window.viewMode = 'firstPerson'; // Values: 'firstPerson', 'thirdPerson', 'freeCamera'

// Initialize controls for the camera
window.initControls = function(camera, domElement) {
    console.log("Initializing PointerLockControls properly...");

    const controls = new THREE.PointerLockControls(camera, domElement);
    
    // We don't need a click listener here anymore - it's handled in game-engine.js

    controls.addEventListener('lock', () => {
        const instructions = document.getElementById('lock-instructions');
        if (instructions) {
            instructions.style.display = 'none';
        }
        
        // Update mouse sensitivity based on current view mode
        updateMouseSensitivity();
    });
    
    controls.addEventListener('unlock', () => {
        const instructions = document.getElementById('lock-instructions');
        if (instructions) {
            instructions.style.display = 'block';
        }
        
        if (window.isFirstPerson) {
            const controlsInfo = document.getElementById('controls-info');
            if (controlsInfo) {
                controlsInfo.style.display = 'block';
            }
        }
        // Always show cursor when unlocked, regardless of view mode
        document.body.style.cursor = 'auto';
    });

    // Keyboard listeners for movement remain as-is
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    
    // Mouse button handlers for classic third-person orbital controls
    document.addEventListener('mousedown', (event) => {
        if (event.button === 2) { // Right mouse button
            window.rightMouseDown = true;
        } else if (event.button === 1) { // Middle mouse button (scroll wheel click)
            window.middleMouseDown = true;
        }
    });
    
    document.addEventListener('mouseup', (event) => {
        if (event.button === 2) { // Right mouse button
            window.rightMouseDown = false;
        } else if (event.button === 1) { // Middle mouse button
            window.middleMouseDown = false;
        }
    });
    
    // Prevent context menu from appearing on right-click
    document.addEventListener('contextmenu', (event) => {
        event.preventDefault();
    });

    // Add mouse movement tracking with sensitivity adjustment and fix inversion
    document.addEventListener('mousemove', (event) => {
        if (document.pointerLockElement) {
            // Apply sensitivity adjustment to mouse movements
            const sensitivity = window.mouseSensitivity.current;
            
            if (window.isFirstPerson && !window.isFreeCameraMode) {
                // First-person: Standard FPS mouse look - rotate with mouse movement
                // Store movement for server synchronization
                window.inputState.mouseDelta.x += event.movementX * sensitivity;
                window.inputState.mouseDelta.y -= event.movementY * sensitivity;
                
                // Apply rotation locally for immediate response
                const rotationX = event.movementY * 0.002 * sensitivity; // Vertical rotation (pitch)
                const rotationY = event.movementX * 0.002 * sensitivity; // Horizontal rotation (yaw)
                
                // Update local camera rotation immediately
                if (window.camera) {
                    // Update the camera's pitch (looking up/down)
                    window.firstPersonCameraPitch = window.firstPersonCameraPitch || 0;
                    window.firstPersonCameraPitch -= rotationX;
                    
                    // Clamp the pitch to prevent looking too far up or down
                    window.firstPersonCameraPitch = THREE.MathUtils.clamp(
                        window.firstPersonCameraPitch,
                        -Math.PI/2 + 0.1,  // Slightly less than straight down
                        Math.PI/2 - 0.1    // Slightly less than straight up
                    );
                    
                    // Update the player's rotation around Y axis
                    window.playerRotationY = window.playerRotationY || 0;
                    window.playerRotationY -= rotationY;
                    
                    // Apply the rotations to the camera
                    window.camera.quaternion.setFromEuler(new THREE.Euler(
                        window.firstPersonCameraPitch,
                        window.playerRotationY,
                        0,
                        'YXZ'  // Important for proper FPS controls
                    ));
                    
                    // Also update player mesh rotation immediately for seamless transition to third-person
                    if (window.myPlayer && window.myPlayer.mesh) {
                        window.myPlayer.mesh.rotation.y = window.playerRotationY;
                    }
                }
            } else if (!window.isFirstPerson && !window.isFreeCameraMode) {
                // Third-person: Only rotate camera when right mouse button is held (classic behavior)
                if (window.rightMouseDown || window.middleMouseDown) {
                    // X movement orbits camera horizontally around player
                    window.thirdPersonCameraOrbitX += event.movementX * window.thirdPersonCameraOrbitSpeed;
                    
                    // Y movement changes camera height/angle (with limits to prevent flipping)
                    window.thirdPersonCameraOrbitY -= event.movementY * window.thirdPersonCameraOrbitSpeed;
                    window.thirdPersonCameraOrbitY = THREE.MathUtils.clamp(
                        window.thirdPersonCameraOrbitY,
                        window.thirdPersonCameraMinY,
                        window.thirdPersonCameraMaxY
                    );
                }
            } else if (window.isFreeCameraMode) {
                // Free camera mode: Standard FPS-style look with mouse
                window.freeCameraYaw -= event.movementX * window.freeCameraRotationSpeed;
                window.freeCameraPitch -= event.movementY * window.freeCameraRotationSpeed;
                
                // Limit pitch to avoid flipping
                window.freeCameraPitch = THREE.MathUtils.clamp(
                    window.freeCameraPitch,
                    -Math.PI / 2 + 0.1,  // Avoid looking straight down
                    Math.PI / 2 - 0.1    // Avoid looking straight up
                );
                
                // Apply rotation to camera using quaternions for proper rotation
                window.camera.quaternion.setFromEuler(new THREE.Euler(
                    window.freeCameraPitch,
                    window.freeCameraYaw,
                    0,
                    'YXZ'  // Important for proper FPS controls
                ));
            }
        }
    });
    
    // Add mouse wheel zoom for third-person view
    document.addEventListener('wheel', (event) => {
        // Only handle zoom in third-person mode and not affect the server state
        if (!window.isFirstPerson) {
            // Normalize wheel delta across browsers (positive = zoom in, negative = zoom out)
            const zoomAmount = -Math.sign(event.deltaY) * window.thirdPersonCameraZoomSpeed;
            
            // Apply zoom to the camera distance
            window.thirdPersonCameraDistance = THREE.MathUtils.clamp(
                window.thirdPersonCameraDistance - zoomAmount,
                window.thirdPersonCameraMinDistance,
                window.thirdPersonCameraMaxDistance
            );
            
            console.log(`Third-person camera zoom: ${window.thirdPersonCameraDistance.toFixed(1)}`);
        }
    });

    return controls;
}

// Update mouse sensitivity based on current view mode
function updateMouseSensitivity() {
    if (window.viewMode === 'firstPerson') {
        window.mouseSensitivity.current = window.mouseSensitivity.firstPerson;
    } else if (window.viewMode === 'thirdPerson') {
        window.mouseSensitivity.current = window.mouseSensitivity.thirdPerson;
    } else {
        // Free camera uses first-person sensitivity
        window.mouseSensitivity.current = window.mouseSensitivity.firstPerson;
    }
    console.log(`Updated mouse sensitivity to ${window.mouseSensitivity.current} (${window.viewMode} mode)`);
}

// Function to get the forward direction based on camera orientation in third-person mode
window.getThirdPersonForwardDirection = function() {
    const angle = window.thirdPersonCameraOrbitX;
    return new THREE.Vector3(-Math.sin(angle), 0, -Math.cos(angle));
}

// Key down event handler
function onKeyDown(event) {
    // Skip if we're in an input field or textarea
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
    }
    
    // Map key code to action
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            window.moveForward = true;
            window.inputState.keys.w = true;
            break;
            
        case 'ArrowLeft':
        case 'KeyA':
            window.moveLeft = true;
            window.inputState.keys.a = true;
            break;
            
        case 'ArrowDown':
        case 'KeyS':
            window.moveBackward = true;
            window.inputState.keys.s = true;
            break;
            
        case 'ArrowRight':
        case 'KeyD':
            window.moveRight = true;
            window.inputState.keys.d = true;
            break;
            
        case 'KeyQ':
            window.turnLeft = true;
            window.inputState.keys.q = true;
            break;
            
        case 'KeyE':
            window.turnRight = true;
            window.inputState.keys.e = true;
            break;
            
        case 'Space':
            window.canJump = false; // Reset jump ability until ground collision
            window.inputState.keys.space = true;
            // Client-side jump for prediction - server will override with authority
            if (window.velocity) {
                window.velocity.y = Math.sqrt(window.jumpHeight * 2 * 9.8);
            }
            break;

        case 'KeyV':
            window.toggleCameraView(); // Call the global toggleCameraView function
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            window.shiftPressed = true;
            window.inputState.keys.shift = true;
            break;
    }
    
    // Force an immediate input update to minimize latency
    if (window.sendInputUpdate && 
        (event.code === 'KeyW' || event.code === 'KeyA' || 
         event.code === 'KeyS' || event.code === 'KeyD' || 
         event.code === 'KeyQ' || event.code === 'KeyE' || 
         event.code === 'Space')) {
        window.sendInputUpdate();
    }
}

// Key up event handler
function onKeyUp(event) {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            window.moveForward = false;
            window.inputState.keys.w = false;
            break;
            
        case 'ArrowLeft':
        case 'KeyA':
            window.moveLeft = false;
            window.inputState.keys.a = false;
            break;
            
        case 'ArrowDown':
        case 'KeyS':
            window.moveBackward = false;
            window.inputState.keys.s = false;
            break;
            
        case 'ArrowRight':
        case 'KeyD':
            window.moveRight = false;
            window.inputState.keys.d = false;
            break;
            
        case 'KeyQ':
            window.turnLeft = false;
            window.inputState.keys.q = false;
            break;
            
        case 'KeyE':
            window.turnRight = false;
            window.inputState.keys.e = false;
            break;
            
        case 'Space':
            window.inputState.keys.space = false;
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            window.shiftPressed = false;
            window.inputState.keys.shift = false;
            break;
    }
    
    // Force an immediate input update to minimize latency
    if (window.sendInputUpdate && 
        (event.code === 'KeyW' || event.code === 'KeyA' || 
         event.code === 'KeyS' || event.code === 'KeyD' || 
         event.code === 'KeyQ' || event.code === 'KeyE' || 
         event.code === 'Space')) {
        window.sendInputUpdate();
    }
}

// Update controls - call this in the animation loop
window.updateControls = function(controls, delta) {
    if (!controls.isLocked) return;

    // If we're in free camera mode, handle movement without updating the server
    if (window.isFreeCameraMode) {
        updateFreeCameraMovement(delta);
        return;
    }

    // Only perform client-side movement prediction 
    // Actual position updates will be driven by the server
    
    // Handle directional movement - scaled by delta for consistent speed
    if (window.moveForward) controls.moveForward(window.moveSpeed * delta);
    if (window.moveBackward) controls.moveForward(-window.moveSpeed * delta);
    if (window.moveLeft) controls.moveRight(-window.moveSpeed * delta);
    if (window.moveRight) controls.moveRight(window.moveSpeed * delta);
    
    // Handle Q/E keys for diagonal movement (forward + turning)
    if (window.turnLeft) {
        // Move diagonally forward-left
        const diagonalSpeed = window.moveSpeed * 0.7 * delta; // Scale down for diagonal
        controls.moveForward(diagonalSpeed);
        controls.moveRight(-diagonalSpeed);
    }
    if (window.turnRight) {
        // Move diagonally forward-right
        const diagonalSpeed = window.moveSpeed * 0.7 * delta; // Scale down for diagonal
        controls.moveForward(diagonalSpeed);
        controls.moveRight(diagonalSpeed);
    }

    // Apply gravity
    window.velocity.y -= 9.8 * delta;
    controls.getObject().position.y += window.velocity.y * delta;

    // Ground collision
    if (controls.getObject().position.y < window.playerHeight) {
        window.velocity.y = 0;
        controls.getObject().position.y = window.playerHeight;
        window.canJump = true;
    }
}

// Handle free camera movement independent of player
function updateFreeCameraMovement(delta) {
    // Calculate movement speed with delta time for consistent speed
    const moveSpeed = window.freeCameraSpeed * delta * 60; // Base speed adjusted for frame rate
    
    // Create movement vectors using quaternion-based direction
    // This ensures movement always follows the camera's view direction
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(window.camera.quaternion).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(window.camera.quaternion).normalize();
    
    // Remove any Y component to keep movement horizontal (along XZ plane) for WASD
    forward.y = 0;
    forward.normalize();
    right.y = 0;
    right.normalize();
    
    // Apply movement based on keys
    if (window.moveForward) {
        window.camera.position.addScaledVector(forward, moveSpeed);
    }
    if (window.moveBackward) {
        window.camera.position.addScaledVector(forward, -moveSpeed);
    }
    if (window.moveLeft) {
        window.camera.position.addScaledVector(right, -moveSpeed);
    }
    if (window.moveRight) {
        window.camera.position.addScaledVector(right, moveSpeed);
    }
    
    // Handle vertical movement (space and shift)
    const up = new THREE.Vector3(0, 1, 0);
    if (window.inputState.keys.space) {
        window.camera.position.addScaledVector(up, moveSpeed);
    }
    if (window.shiftPressed) { 
        window.camera.position.addScaledVector(up, -moveSpeed);
    }
}

// Function to toggle between camera views
window.toggleCameraView = function() {
    if (window.viewMode === 'firstPerson') {
        window.viewMode = 'thirdPerson';
        window.isFirstPerson = false;
        window.isFreeCameraMode = false;
        if (typeof window.switchToThirdPersonView === 'function') {
            window.switchToThirdPersonView();
        }
        console.log("[DEBUG] Switched to third-person view");
    } else if (window.viewMode === 'thirdPerson') {
        window.viewMode = 'freeCamera';
        window.isFirstPerson = false;
        window.isFreeCameraMode = true;
        // Save player position for free camera starting point
        if (window.playerNumberblock && window.playerNumberblock.mesh) {
            const pos = window.playerNumberblock.mesh.position.clone();
            pos.y += 3; // Start slightly above the player
            window.camera.position.copy(pos);
        }
        if (typeof window.switchToFreeCameraView === 'function') {
            window.switchToFreeCameraView();
        }
        console.log("[DEBUG] Switched to free camera view");
    } else {
        window.viewMode = 'firstPerson';
        window.isFirstPerson = true;
        window.isFreeCameraMode = false;
        if (typeof window.switchToFirstPersonView === 'function') {
            window.switchToFirstPersonView();
        }
        console.log("[DEBUG] Switched back to first-person view");
    }
    
    // Update mouse sensitivity for the new view mode
    updateMouseSensitivity();
    
    // Update UI for new view mode
    updateViewModeUI();
    
    // Update view toggle button with current mode
    const viewToggleBtn = document.getElementById('view-toggle');
    if (viewToggleBtn) {
        if (window.viewMode === 'firstPerson') {
            viewToggleBtn.textContent = 'First-Person View';
        } else if (window.viewMode === 'thirdPerson') {
            viewToggleBtn.textContent = 'Third-Person View';
        } else {
            viewToggleBtn.textContent = 'Free Camera View';
        }
    }
    
    // Return to prevent recursion
    return window.viewMode;
};

// Function to update the UI based on view mode
function updateViewModeUI() {
    // Do NOT show click instructions/overlay when switching views
    const instructions = document.getElementById('lock-instructions');
    if (instructions) {
        instructions.style.display = 'none';
    }
}
