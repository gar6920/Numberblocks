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

let prevTime = performance.now();
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();

// Player settings
const playerHeight = 2.0;             // Height of camera from ground
const moveSpeed = 5.0;                // Units per second
const turnSpeed = 2.0;                // Rotation speed for Q/E turning
const jumpHeight = 5.0;               // Jump impulse force
const gravity = 9.8;                  // Gravity force 

// Flag to force fallback controls (for environments like browser previews)
const forceFallbackControls = false;

// Initialize controls for the camera
function initControls(camera, domElement) {
    console.log("Initializing controls...");
    
    // Always use fallback controls in browser preview environments
    if (forceFallbackControls) {
        console.log("Using fallback controls (forced)");
        return createFallbackControls(camera, domElement);
    }
    
    // For non-preview environments, try to use PointerLockControls
    try {
        // Test if Pointer Lock API is supported
        if (!document.pointerLockElement && 
            !document.mozPointerLockElement && 
            !document.webkitPointerLockElement) {
            console.log("Pointer Lock API not supported, using fallback");
            return createFallbackControls(camera, domElement);
        }
        
        console.log("Using PointerLockControls");
        
        // Create PointerLockControls
        const controls = new THREE.PointerLockControls(camera, domElement);
        
        // Set up click event
        domElement.addEventListener('click', () => {
            console.log("Canvas clicked, requesting pointer lock");
            controls.lock();
        });
        
        // Event listeners for controls state
        controls.addEventListener('lock', () => {
            console.log("PointerLock controls LOCKED");
            document.getElementById('controls-info').style.display = 'none';
        });
        
        controls.addEventListener('unlock', () => {
            console.log("PointerLock UNLOCKED");
            document.getElementById('controls-info').style.display = 'block';
        });
        
        // Add keyboard controls with debug logging
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        
        // Store controls object for movement functions
        controls.moveState = {
            moveForward: () => controls.moveForward(moveSpeed * clock.getDelta()),
            moveBackward: () => controls.moveForward(-moveSpeed * clock.getDelta()),
            moveLeft: () => controls.moveRight(-moveSpeed * clock.getDelta()),
            moveRight: () => controls.moveRight(moveSpeed * clock.getDelta())
        };
        
        return controls;
    } catch (e) {
        console.error('Error initializing controls, using fallback:', e);
        return createFallbackControls(camera, domElement);
    }
}

// Create improved fallback controls
function createFallbackControls(camera, domElement) {
    const pitchObject = new THREE.Object3D();
    pitchObject.add(camera);

    const controlsObject = new THREE.Object3D();
    controlsObject.add(pitchObject);

    // Track active event handlers for removal when needed
    const activeEventListeners = {
        mousemove: null,
        mouseleave: null,
        keydown: null
    };

    const mockControls = {
        isLocked: false,
        getObject: () => controlsObject,

        moveForward: (distance) => {
            if (!mockControls.isLocked) return;
            const dir = new THREE.Vector3(0, 0, -1);
            dir.applyQuaternion(controlsObject.quaternion);
            controlsObject.position.addScaledVector(dir, distance);
        },
        moveRight: (distance) => {
            if (!mockControls.isLocked) return;
            const right = new THREE.Vector3(1, 0, 0);
            right.applyQuaternion(controlsObject.quaternion);
            controlsObject.position.add(right.multiplyScalar(distance));
        },

        lock: function() {
            if (this.isLocked) return;

            this.isLocked = true;
            document.getElementById('controls-info').style.display = 'none';
            document.body.style.cursor = 'none';
            
            // Attempt to use standard pointer lock if available
            try {
                if (domElement.requestPointerLock) {
                    domElement.requestPointerLock();
                } else if (domElement.mozRequestPointerLock) {
                    domElement.mozRequestPointerLock();
                } else if (domElement.webkitRequestPointerLock) {
                    domElement.webkitRequestPointerLock();
                }
            } catch (e) {
                console.error('Pointer lock not supported, using fallback cursor hiding');
            }
            
            // Apply cursor containment styles
            document.body.classList.add('cursor-locked');

            // Add event listeners only when locked
            this.setupEventListeners();
            
            this.dispatchEvent({ type: 'lock' });
        },

        unlock: function() {
            if (!this.isLocked) return;

            this.isLocked = false;
            document.getElementById('controls-info').style.display = 'block';
            document.body.style.cursor = 'auto';
            
            // Exit pointer lock if active
            try {
                if (document.exitPointerLock) {
                    document.exitPointerLock();
                } else if (document.mozExitPointerLock) {
                    document.mozExitPointerLock();
                } else if (document.webkitExitPointerLock) {
                    document.webkitExitPointerLock();
                }
            } catch (e) {
                console.error('Error exiting pointer lock');
            }
            
            // Remove cursor containment styles
            document.body.classList.remove('cursor-locked');
            
            // Remove event listeners when unlocked to fully disengage
            this.removeEventListeners();
            
            this.dispatchEvent({ type: 'unlock' });
        },
        
        setupEventListeners: function() {
            // Mouse look event handling
            const mouseMoveHandler = (event) => {
                if (!mockControls.isLocked) return;

                // For browsers that don't support pointer lock, we can use this approach
                // to at least keep processing mouse events even at screen edges
                const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
                const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
                
                // Only apply reasonable movements to avoid jumps
                if (Math.abs(movementX) < 100 && Math.abs(movementY) < 100) {
                    controlsObject.rotation.y -= movementX * 0.002; // Unlimited horizontal rotation (yaw)
                    
                    pitch -= movementY * 0.002; // track pitch separately
                    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch)); // limit pitch
                    pitchObject.rotation.x = pitch; // apply limited pitch
                }
            };

            // Handle mouseleave to prevent cursor from exiting the window
            const mouseLeaveHandler = (event) => {
                if (mockControls.isLocked) {
                    // If mouse leaves the window, simulate it returning to center
                    // This keeps the cursor within the window bounds
                    const rect = domElement.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    
                    // Create a new mouse event to simulate mouse movement
                    const mouseEvent = new MouseEvent('mousemove', {
                        clientX: centerX,
                        clientY: centerY,
                        screenX: centerX,
                        screenY: centerY,
                        movementX: 0,
                        movementY: 0
                    });
                    
                    // Dispatch the event
                    document.dispatchEvent(mouseEvent);
                }
            };

            // Escape to unlock controls
            const escKeyHandler = (event) => {
                if (event.code === 'Escape' && mockControls.isLocked) {
                    mockControls.unlock();
                }
            };

            // Store references to handlers so we can remove them later
            activeEventListeners.mousemove = mouseMoveHandler;
            activeEventListeners.mouseleave = mouseLeaveHandler;
            activeEventListeners.keydown = escKeyHandler;

            // Add the event listeners
            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseleave', mouseLeaveHandler);
            document.addEventListener('keydown', escKeyHandler);
        },
        
        removeEventListeners: function() {
            // Remove all active event listeners to fully disengage
            if (activeEventListeners.mousemove) {
                document.removeEventListener('mousemove', activeEventListeners.mousemove);
            }
            
            if (activeEventListeners.mouseleave) {
                document.removeEventListener('mouseleave', activeEventListeners.mouseleave);
            }
            
            if (activeEventListeners.keydown) {
                document.removeEventListener('keydown', activeEventListeners.keydown);
            }
        },
        
        _listeners: {},
        addEventListener: function(type, listener) {
            this._listeners[type] = this._listeners[type] || [];
            this._listeners[type].push(listener);
        },
        dispatchEvent: function(event) {
            if (this._listeners[event.type]) {
                this._listeners[event.type].forEach(listener => listener.call(this, event));
            }
        }
    };

    // Add CSS to trap cursor within game area
    const style = document.createElement('style');
    style.textContent = `
        .cursor-locked {
            cursor: none !important;
            user-select: none;
            -webkit-user-select: none;
        }
        .cursor-locked * {
            cursor: none !important;
        }
    `;
    document.head.appendChild(style);

    // Click event handling - this one remains always active
    domElement.addEventListener('click', () => {
        if (!mockControls.isLocked) mockControls.lock();
    });

    // Add keyboard event listeners for movement - these remain always active
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    return mockControls;
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
function updateControls(controls, delta) {
    if (!controls) {
        console.warn("Controls not initialized");
        return;
    }

    // If using PointerLockControls and not locked, return
    if (controls.isLocked === false && !forceFallbackControls) {
        return;
    }

    // Update velocity
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;
    velocity.y -= gravity * delta; // Apply gravity

    // Apply movement based on key states - fixed direction
    if (moveForward) controls.moveForward(moveSpeed * delta);
    if (moveBackward) controls.moveForward(-moveSpeed * delta);
    if (moveLeft) controls.moveRight(-moveSpeed * delta);
    if (moveRight) controls.moveRight(moveSpeed * delta);
    
    // Apply turning based on Q and E keys
    if (turnLeft && controls.getObject) {
        controls.getObject().rotation.y += turnSpeed * delta;
    }
    if (turnRight && controls.getObject) {
        controls.getObject().rotation.y -= turnSpeed * delta;
    }

    // Update Y position with gravity
    if (controls.getObject) {
        controls.getObject().position.y += velocity.y * delta;

        // Ground collision
        if (controls.getObject().position.y < playerHeight) {
            velocity.y = 0;
            controls.getObject().position.y = playerHeight;
            canJump = true;
        }
    }
}
