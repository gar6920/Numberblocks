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
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
let prevTime = performance.now();
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let playerValue = 1;
let lockInstructions = document.getElementById('lock-instructions');

// HUD elements
const gameHUD = document.getElementById('game-hud');

// Initialize the game
window.onload = function() {
    debug('Window loaded, initializing game...');
    init();
};

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
        
        const onPointerLockChange = function() {
            if (document.pointerLockElement === document.body) {
                debug('Pointer Lock enabled');
                if (lockInstructions) lockInstructions.style.display = 'none';
            } else {
                debug('Pointer Lock disabled');
                if (lockInstructions) lockInstructions.style.display = 'block';
            }
        };
        
        document.addEventListener('pointerlockchange', onPointerLockChange);
        
        // Click to enable controls
        document.body.addEventListener('click', function() {
            if (!controls.isLocked) {
                debug('Requesting pointer lock');
                controls.lock();
            }
        });
        
        debug('PointerLock controls setup complete');
    } catch (error) {
        debug(`Error setting up controls: ${error.message}`, true);
    }
}

// Function to create the floor
function initFloor() {
    debug('Creating floor');
    
    try {
        const floorGeometry = new THREE.PlaneGeometry(100, 100);
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x999999, 
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
                velocity.y = 10;
                canJump = false;
            }
            break;
        case 'KeyQ':
            // Turn left
            controls.getObject().rotation.y += 0.05;
            break;
        case 'KeyE':
            // Turn right
            controls.getObject().rotation.y -= 0.05;
            break;
    }
}

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
    }
}

// Animation loop
function animate() {
    try {
        requestAnimationFrame(animate);
        
        // Only update player position if pointer lock is enabled
        if (controls && controls.isLocked) {
            updatePlayerPosition();
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

// Update player position based on controls
function updatePlayerPosition() {
    const time = performance.now();
    
    if (!prevTime) {
        prevTime = time;
        return;
    }
    
    const delta = (time - prevTime) / 1000;
    
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;
    
    velocity.y -= 9.8 * 100.0 * delta; // Apply gravity
    
    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize(); // Ensure consistent movement regardless of direction
    
    if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta;
    
    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
    
    // Update position of player's Numberblock to match camera
    if (playerNumberblock) {
        playerNumberblock.mesh.position.copy(camera.position);
        playerNumberblock.mesh.position.y -= 1.5; // Position below the camera
        
        // Make Numberblock look in same direction as player
        playerNumberblock.mesh.rotation.y = controls.getObject().rotation.y;
    }
    
    // Send position to server for multiplayer
    if (typeof window.room !== 'undefined' && window.room) {
        window.room.send("updatePosition", {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z,
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
    playerValue = newValue;
    
    // Update the visual representation
    if (playerNumberblock) {
        scene.remove(playerNumberblock.mesh);
        playerNumberblock = new Numberblock(playerValue);
        scene.add(playerNumberblock.mesh);
        
        // Position at the camera
        playerNumberblock.mesh.position.copy(camera.position);
        playerNumberblock.mesh.position.y -= 1.5;
        
        // Update HUD display
        updateHUD();
    }
}

// Update the HUD display
function updateHUD() {
    if (gameHUD) {
        gameHUD.innerHTML = `<div class="hud-value">Number: ${playerValue}</div>`;
    }
}
