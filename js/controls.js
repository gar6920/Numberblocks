// Numberblocks game - First-person controls implementation

// Global variables
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;

let prevTime = performance.now();
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();

// Player settings
const playerHeight = 2.0;             // Height of camera from ground
const moveSpeed = 5.0;                // Units per second
const jumpHeight = 5.0;               // Jump impulse force
const gravity = 9.8;                  // Gravity force 

// Initialize controls for the camera
function initControls(camera, domElement) {
    try {
        // Set up pointer lock controls
        const controls = new THREE.PointerLockControls(camera, domElement);
        
        // Add click event to lock pointer
        domElement.addEventListener('click', () => {
            try {
                controls.lock();
            } catch (e) {
                console.log('Failed to lock pointer:', e);
            }
        });
        
        // Add event listeners for controls state
        controls.addEventListener('lock', () => {
            console.log('Controls locked');
            document.getElementById('controls-info').style.display = 'none';
        });
        
        controls.addEventListener('unlock', () => {
            console.log('Controls unlocked');
            document.getElementById('controls-info').style.display = 'block';
        });
        
        // Add keyboard controls
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        
        return controls;
    } catch (e) {
        console.error('Error initializing controls:', e);
        return createFallbackControls(camera, domElement);
    }
}

// Fallback controls if PointerLockControls fails
function createFallbackControls(camera, domElement) {
    console.log('Creating fallback controls');
    
    // Create a mock controls object with the same interface
    const mockControls = {
        isLocked: false,
        getObject: () => camera,
        moveForward: (distance) => {
            camera.position.z -= distance;
        },
        moveRight: (distance) => {
            camera.position.x += distance;
        },
        lock: () => {
            mockControls.isLocked = true;
            document.getElementById('controls-info').style.display = 'none';
            const event = new Event('lock');
            mockControls.dispatchEvent(event);
        },
        unlock: () => {
            mockControls.isLocked = false;
            document.getElementById('controls-info').style.display = 'block';
            const event = new Event('unlock');
            mockControls.dispatchEvent(event);
        },
        addEventListener: (event, callback) => {
            mockControls.eventListeners = mockControls.eventListeners || {};
            mockControls.eventListeners[event] = mockControls.eventListeners[event] || [];
            mockControls.eventListeners[event].push(callback);
        },
        dispatchEvent: (event) => {
            if (mockControls.eventListeners && mockControls.eventListeners[event.type]) {
                mockControls.eventListeners[event.type].forEach(callback => callback(event));
            }
        }
    };
    
    // Add click event to "lock" pointer
    domElement.addEventListener('click', () => {
        mockControls.lock();
    });
    
    // Add keyboard event listeners
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    
    return mockControls;
}

// Key down event handler
function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
            moveForward = true;
            break;
            
        case 'KeyA':
        case 'ArrowLeft':
            moveLeft = true;
            break;
            
        case 'KeyS':
        case 'ArrowDown':
            moveBackward = true;
            break;
            
        case 'KeyD':
        case 'ArrowRight':
            moveRight = true;
            break;
            
        case 'Space':
            if (canJump) {
                velocity.y = jumpHeight;
            }
            canJump = false;
            break;
    }
}

// Key up event handler
function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
            moveForward = false;
            break;
            
        case 'KeyA':
        case 'ArrowLeft':
            moveLeft = false;
            break;
            
        case 'KeyS':
        case 'ArrowDown':
            moveBackward = false;
            break;
            
        case 'KeyD':
        case 'ArrowRight':
            moveRight = false;
            break;
    }
}

// Update controls - call this in the animation loop
function updateControls(controls, delta) {
    // Only update if controls are locked
    if (!controls.isLocked) return;
    
    // Apply gravity and handle jumping
    velocity.y -= gravity * delta;
    
    // Calculate movement direction
    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize(); // Normalize for consistent movement speed
    
    // Apply movement
    if (moveForward || moveBackward) {
        controls.moveForward(direction.z * moveSpeed * delta);
    }
    
    if (moveLeft || moveRight) {
        controls.moveRight(direction.x * moveSpeed * delta);
    }
    
    // Apply gravity
    controls.getObject().position.y += velocity.y * delta;
    
    // Check if we're on ground
    if (controls.getObject().position.y < playerHeight) {
        velocity.y = 0;
        controls.getObject().position.y = playerHeight;
        canJump = true;
    }
}
