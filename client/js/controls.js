// Numberblocks game - First-person controls implementation

// Global variables
window.moveForward = false;
window.moveBackward = false;
window.moveLeft = false;
window.moveRight = false;
window.turnLeft = false;    // New variable for Q key turning
window.turnRight = false;   // New variable for E key turning
window.canJump = false;
// isFirstPerson is a global variable attached to the window object in main.js

window.prevTime = performance.now();
window.velocity = new THREE.Vector3();
window.direction = new THREE.Vector3();

// Player settings
window.playerHeight = 2.0;             // Height of camera from ground
window.moveSpeed = 50.0;                // Units per second
window.turnSpeed = 2.0;                // Rotation speed for Q/E turning
window.jumpHeight = 2.0;               // Jump height in units
window.jumpPressed = false;            // Track jump button press

// Add variable for third person camera
window.thirdPersonCameraAngle = 0;  // Angle for the third person camera (in radians)
window.thirdPersonCameraDistance = 5;  // Distance for the third person camera

// Initialize controls for the camera
window.initControls = function(camera, domElement) {
    console.log("Initializing PointerLockControls properly...");

    const controls = new THREE.PointerLockControls(camera, domElement);

    domElement.addEventListener('click', () => {
        controls.lock();
    });

    controls.addEventListener('lock', () => {
        if (window.isFirstPerson) {
            document.getElementById('controls-info').style.display = 'none';
        }
        // Always hide cursor when locked, regardless of view mode
        document.body.style.cursor = 'none';
    });

    controls.addEventListener('unlock', () => {
        if (window.isFirstPerson) {
            document.getElementById('controls-info').style.display = 'block';
        }
        // Always show cursor when unlocked, regardless of view mode
        document.body.style.cursor = 'auto';
    });

    // Keyboard listeners for movement remain as-is
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    return controls;
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
            
        case 'KeyQ':
            window.turnLeft = true;
            break;
            
        case 'KeyE':
            window.turnRight = true;
            break;
            
        case 'Space':
            if (window.canJump) {
                // Apply a physically accurate jump velocity
                window.velocity.y = Math.sqrt(window.jumpHeight * 2 * 9.8);
                window.canJump = false;
            }
            break;
    }
}

// Key up event handler
function onKeyUp(event) {
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
}

// Update controls - call this in the animation loop
window.updateControls = function(controls, delta) {
    if (!controls.isLocked) return;

    // Handle directional movement
    if (window.moveForward) controls.moveForward(window.moveSpeed * delta);
    if (window.moveBackward) controls.moveForward(-window.moveSpeed * delta);
    if (window.moveLeft) controls.moveRight(-window.moveSpeed * delta);
    if (window.moveRight) controls.moveRight(window.moveSpeed * delta);
    
    // Handle turning with Q/E keys
    if (window.turnLeft || window.turnRight) {
        // Create rotation quaternion for Q/E rotation around Y axis
        const rotationAngle = (window.turnLeft ? 1 : -1) * window.turnSpeed * delta;
        const rotationQuaternion = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0), // Rotate around y-axis only
            rotationAngle
        );
        
        // Apply rotation to the camera's quaternion directly
        controls.getObject().quaternion.multiply(rotationQuaternion);
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
