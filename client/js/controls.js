// Numberblocks game - First-person controls implementation

// Global variables
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let turnLeft = false;    // New variable for Q key turning
let turnRight = false;   // New variable for E key turning
let canJump = false;
let pitch = 0;  // Track vertical rotation separately
// isFirstPerson is a global variable attached to the window object in main.js

let prevTime = performance.now();
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();

// Player settings
const playerHeight = 2.0;             // Height of camera from ground
const moveSpeed = 5.0;                // Units per second
const turnSpeed = 2.0;                // Rotation speed for Q/E turning
const jumpHeight = 5.0;               // Jump impulse force
const gravity = 9.8;                  // Gravity force 

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
            
        case 'KeyQ':
            turnLeft = true;
            break;
            
        case 'KeyE':
            turnRight = true;
            break;
            
        case 'Space':
            if (canJump) {
                // Apply a physically accurate jump velocity
                velocity.y = Math.sqrt(jumpHeight * 2 * gravity);
                canJump = false;
            }
            break;
    }
}

// Key up event handler
function onKeyUp(event) {
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
}

// Update controls - call this in the animation loop
window.updateControls = function(controls, delta) {
    if (!controls.isLocked) return;

    if (moveForward) controls.moveForward(moveSpeed * delta);
    if (moveBackward) controls.moveForward(-moveSpeed * delta);
    if (moveLeft) controls.moveRight(-moveSpeed * delta);
    if (moveRight) controls.moveRight(moveSpeed * delta);
    
    // Proper on-axis rotation using the PointerLockControls object's quaternion
    if (turnLeft || turnRight) {
        // Create rotation quaternion for Q/E rotation
        const rotationAngle = (turnLeft ? 1 : -1) * turnSpeed * delta;
        const rotationQuaternion = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0), // Rotate around y-axis only
            rotationAngle
        );
        
        // Apply rotation to controls object's quaternion
        controls.getObject().quaternion.premultiply(rotationQuaternion);
    }

    velocity.y -= gravity * delta;
    controls.getObject().position.y += velocity.y * delta;

    if (controls.getObject().position.y < playerHeight) {
        velocity.y = 0;
        controls.getObject().position.y = playerHeight;
        canJump = true;
    }
}
