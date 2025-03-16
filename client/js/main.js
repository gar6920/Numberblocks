// Numberblocks game - Three.js implementation
console.log('Numberblocks game initializing...');

// Add debugging element to help track initialization
const debugElement = document.createElement('div');
debugElement.style.position = 'fixed';
debugElement.style.top = '10px';
debugElement.style.left = '10px';
debugElement.style.backgroundColor = 'rgba(0,0,0,0.7)';
debugElement.style.color = 'white';
debugElement.style.padding = '10px';
debugElement.style.fontSize = '14px';
debugElement.style.fontFamily = 'monospace';
debugElement.style.zIndex = '1000';
debugElement.style.maxHeight = '80vh';
debugElement.style.overflowY = 'auto';
debugElement.innerHTML = 'Debug: Initializing...';
document.body.appendChild(debugElement);

function debug(message) {
    console.log(message);
    debugElement.innerHTML += '<br>' + message;
}

// Catch JS errors
window.onerror = function(message, source, lineno, colno, error) {
    debug(`ERROR: ${message} (${source}:${lineno})`);
    return false;
};

// Game variables
let scene, camera, renderer, controls;
let playerNumberblock, staticNumberblock;
let operatorManager;
let operatorDisplay;
let numberblocks = [];
let isNetworkInitialized = false;
let lastFrameTime = performance.now();
let clock = new THREE.Clock();
let prevTime = performance.now(); // Additional global variable for time tracking

// Movement keys state
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let turnLeft = false;
let turnRight = false;

// Player state
let canJump = true;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();

// Network state
let room, client;
let remotePlayers = {};
let isNetworkMode = false; // Flag to track if we're in network mode

// Global variables
let ground;
let initializedCube = null; // Reference to our test cube
window.isFirstPerson = true; // Make isFirstPerson truly global by attaching to window

// Debug function with visual elements
function debug(message) {
    // Add to debug panel if available
    const debugPanel = document.getElementById('debug-panel');
    if (debugPanel) {
        const messageElement = document.createElement('div');
        messageElement.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        debugPanel.appendChild(messageElement);
        
        // Auto-scroll to bottom
        debugPanel.scrollTop = debugPanel.scrollHeight;
    }
    
    // Log to console
    console.log(`[DEBUG] ${message}`);
}

// Initialize the Three.js scene - with step-by-step rendering tests
async function init() {
    debug('Starting init()...');
    try {
        // Create a debug panel directly in the DOM if it doesn't exist
        if (!document.getElementById('debug-panel')) {
            const debugPanel = document.createElement('div');
            debugPanel.id = 'debug-panel';
            debugPanel.style.position = 'absolute';
            debugPanel.style.top = '10px';
            debugPanel.style.left = '10px';
            debugPanel.style.background = 'rgba(0,0,0,0.7)';
            debugPanel.style.color = 'white';
            debugPanel.style.padding = '10px';
            debugPanel.style.fontFamily = 'monospace';
            debugPanel.style.fontSize = '12px';
            debugPanel.style.maxHeight = '300px';
            debugPanel.style.maxWidth = '500px';
            debugPanel.style.overflow = 'auto';
            debugPanel.style.zIndex = '1000';
            document.body.appendChild(debugPanel);
        }
        
        // STEP 1: Create Scene
        debug('STEP 1: Creating scene...');
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87CEEB); // Sky blue background
        
        // STEP 2: Create Camera
        debug('STEP 2: Creating camera...');
        camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        camera.position.set(0, 2, 5); // Set initial camera position
        
        // STEP 3: Get canvas and create renderer
        const canvas = document.getElementById('game-canvas');
        if (!canvas) {
            debug('ERROR: Canvas element not found! Creating a new one...');
            
            // Create canvas if not found
            const newCanvas = document.createElement('canvas');
            newCanvas.id = 'game-canvas';
            newCanvas.style.display = 'block';
            newCanvas.style.width = '100%';
            newCanvas.style.height = '100%';
            document.body.appendChild(newCanvas);
            
            renderer = new THREE.WebGLRenderer({ 
                canvas: newCanvas,
                antialias: true
            });
        } else {
            debug('Canvas found, creating renderer...');
            renderer = new THREE.WebGLRenderer({ 
                canvas: canvas,
                antialias: true
            });
        }
        
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio > 1 ? 2 : 1);
        debug('Renderer created successfully');
        
        // TEST RENDER: Add a simple cube to ensure rendering works
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const testCube = new THREE.Mesh(geometry, material);
        testCube.position.set(0, 0, -5);
        scene.add(testCube);
        debug('Test cube added to scene');
        
        // Do a single test render
        renderer.render(scene, camera);
        debug('Test render completed');
        
        // STEP 4: Add lights
        debug('STEP 4: Creating lights...');
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        scene.add(directionalLight);
        
        // Render after adding lights
        renderer.render(scene, camera);
        debug('Render after adding lights completed');
        
        // STEP 5: Create ground plane
        debug('STEP 5: Creating ground...');
        createGround();
        
        // Render after adding ground
        renderer.render(scene, camera);
        debug('Render after adding ground completed');
        
        // STEP 6: Create landscape elements
        debug('STEP 6: Creating landscape...');
        createLandscapeElements();
        
        // Render after adding landscape
        renderer.render(scene, camera);
        debug('Render after adding landscape completed');
        
        // STEP 7: Create player Numberblock
        debug('STEP 7: Creating player Numberblock...');
        playerNumberblock = createPlayerNumberblock(scene, 1);
        
        // Render after adding player Numberblock
        renderer.render(scene, camera);
        debug('Render after adding player Numberblock completed');
        
        // STEP 8: Initialize HUD
        debug('STEP 8: Initializing HUD...');
        updatePlayerDisplay(1);
        
        // STEP 9: Setup controls
        debug('STEP 9: Setting up controls...');
        window.addEventListener('resize', onWindowResize);
        onWindowResize(); // Ensure camera aspect ratio is correct
        
        // Standard FPS controls
        const initControlsResult = initControls(camera, renderer.domElement);
        
        // Verify controls were created correctly
        if (initControlsResult) {
            controls = initControlsResult;
            debug('Controls initialized successfully');
            
            // Set position on controls object (not camera directly)
            controls.getObject().position.set(0, 2, 5);
            scene.add(controls.getObject());
        } else {
            debug('WARNING: Controls initialization failed, using fallback');
            
            // Fallback controls
            controls = {
                getObject: () => camera,
                isLocked: false,
                lock: () => {},
                unlock: () => {}
            };
        }
        
        // Render after setting up controls
        renderer.render(scene, camera);
        debug('Render after setting up controls completed');
        
        // STEP 10: Initialize networking
        debug('STEP 10: Initializing networking...');
        try {
            isNetworkInitialized = await initNetworking();
            debug(`Networking initialized: ${isNetworkInitialized}`);
            
            if (!isNetworkInitialized) {
                debug("Falling back to local mode (no multiplayer)");
                staticNumberblock = createStaticNumberblock(2, { x: 0, z: -5 });
                debug("Static Numberblock created with value: 2");
                operatorManager = new OperatorManager(scene);
            } else {
                debug("Connected to server. Running in multiplayer mode.");
                document.getElementById('multiplayer-panel').style.display = 'block';
            }
        } catch (error) {
            debug(`Failed to initialize networking: ${error.message}`);
            isNetworkInitialized = false;
            
            // Fallback to local mode
            staticNumberblock = createStaticNumberblock(2, { x: 0, z: -5 });
            operatorManager = new OperatorManager(scene);
        }
        
        // Render after networking setup
        renderer.render(scene, camera);
        debug('Render after networking setup completed');
        
        // STEP 11: Create random Numberblocks (only in local mode)
        if (!isNetworkInitialized) {
            debug('STEP 11: Creating random Numberblocks...');
            createRandomNumberblocks();
            
            // Render after adding random Numberblocks
            renderer.render(scene, camera);
            debug('Render after adding random Numberblocks completed');
        }
        
        // STEP 12: Create HUD elements
        debug('STEP 12: Creating HUD elements...');
        createHUD();
        
        // Make camera global for operators
        window.camera = camera;
        
        // STEP 13: Start animation loop
        debug('STEP 13: Starting animation loop...');
        lastFrameTime = performance.now();
        animate();
        debug('Animation loop started');
    } catch (error) {
        debug(`CRITICAL INIT ERROR: ${error.message}`);
        console.error('Initialization error:', error);
        
        // Attempt emergency rendering of error state
        try {
            if (scene && camera && renderer) {
                // Create error cube to show something is working
                const errorGeometry = new THREE.BoxGeometry(2, 2, 2);
                const errorMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
                const errorCube = new THREE.Mesh(errorGeometry, errorMaterial);
                errorCube.position.set(0, 0, -5);
                scene.add(errorCube);
                
                // Simple error animation loop
                function errorAnimate() {
                    requestAnimationFrame(errorAnimate);
                    errorCube.rotation.x += 0.01;
                    errorCube.rotation.y += 0.01;
                    renderer.render(scene, camera);
                }
                
                errorAnimate();
                debug('ERROR STATE: Running emergency rendering');
            }
        } catch (errorFallbackError) {
            debug(`Emergency rendering failed: ${errorFallbackError.message}`);
        }
    }
}

// Reset everything for a fresh start
window.addEventListener('load', () => {
    debug('Window loaded - starting initialization');
    init();
});

// Initialize ground and lights
function initGroundAndLights() {
    try {
        debug('Creating ground...');
        
        // Create a ground plane
        const groundGeometry = new THREE.PlaneGeometry(50, 50);
        const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2; // Rotate to be flat
        ground.position.y = -1;
        ground.receiveShadow = true;
        scene.add(ground);
        
        debug('Creating lights...');
        
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        
        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        scene.add(directionalLight);
        
        debug('Ground and lights created successfully');
        
        // After ground and lights, initialize landscape
        setTimeout(() => {
            initLandscape();
        }, 1000);
    } catch (error) {
        debug(`ERROR in initGroundAndLights: ${error.message}`);
        console.error('Ground and lights initialization error:', error);
    }
}

// Initialize landscape
function initLandscape() {
    try {
        debug('Creating landscape elements...');
        
        // Add some simple cubes as landscape elements
        for (let i = 0; i < 5; i++) {
            const cubeGeometry = new THREE.BoxGeometry(2, 2, 2);
            const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
            const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
            cube.position.set(
                Math.random() * 40 - 20,
                0,
                Math.random() * 40 - 20
            );
            scene.add(cube);
        }
        
        debug('Landscape created successfully');
        
        // Initialize the player Numberblock after landscape
        setTimeout(() => {
            initPlayerNumberblock();
        }, 1000);
    } catch (error) {
        debug(`ERROR in initLandscape: ${error.message}`);
        console.error('Landscape initialization error:', error);
    }
}

// Initialize player Numberblock
function initPlayerNumberblock() {
    try {
        debug('Creating player Numberblock...');
        
        // First, remove the test cube since we don't need it anymore
        if (initializedCube) {
            scene.remove(initializedCube);
            initializedCube = null;
        }
        
        // Initialize the player Numberblock
        playerNumberblock = new Numberblock(1);
        scene.add(playerNumberblock.mesh);
        
        debug('Player Numberblock created successfully');
        
        // After player Numberblock is created, initialize controls
        setTimeout(() => {
            initPlayerControls();
        }, 1000);
    } catch (error) {
        debug(`ERROR in initPlayerNumberblock: ${error.message}`);
        console.error('Player Numberblock initialization error:', error);
    }
}

// Initialize player controls
function initPlayerControls() {
    try {
        debug('Initializing controls...');
        
        // Try to use PointerLockControls
        try {
            controls = initControls(camera, document.body);
            debug('PointerLockControls initialized successfully');
        } catch (error) {
            debug(`ERROR initializing PointerLockControls: ${error.message}`);
            console.error('PointerLockControls initialization error:', error);
        }
        
        // Initialize HUD and game after controls are set up
        setTimeout(() => {
            initHUD();
        }, 1000);
    } catch (error) {
        debug(`ERROR in initPlayerControls: ${error.message}`);
        console.error('Player controls initialization error:', error);
    }
}

// Initialize HUD
function initHUD() {
    try {
        debug('Initializing HUD...');
        
        // Set up the HUD
        const hudElement = document.getElementById('game-hud');
        hudElement.innerHTML = `
            <div class="number-display">
                <span id="number-value">1</span>
            </div>
        `;
        
        debug('HUD initialized successfully');
        
        // Initialize game after HUD is set up
        setTimeout(() => {
            initGame();
        }, 1000);
    } catch (error) {
        debug(`ERROR in initHUD: ${error.message}`);
        console.error('HUD initialization error:', error);
    }
}

// Initialize the rest of the game
function initGame() {
    try {
        debug('Initializing game...');
        
        // Initialize operator manager
        operatorManager = new OperatorManager();
        
        // Set up event listeners
        window.addEventListener('resize', onWindowResize);
        
        // Call onWindowResize to ensure the aspect ratio is correct
        onWindowResize();
        
        debug('Game initialized successfully');
        
        // Finally, start networking
        setTimeout(() => {
            initializeNetworking();
        }, 1000);
    } catch (error) {
        debug(`ERROR in initGame: ${error.message}`);
        console.error('Game initialization error:', error);
    }
}

// Initialize networking
function initializeNetworking() {
    try {
        debug('Initializing networking...');
        
        // Check if network.js functions are available
        if (typeof initNetworking === 'function') {
            initNetworking()
                .then(() => {
                    debug('Networking initialized successfully');
                    isNetworkInitialized = true;
                })
                .catch(error => {
                    debug(`ERROR initializing networking: ${error.message}`);
                    console.error('Networking initialization error:', error);
                    debug('Continuing in local mode...');
                });
        } else {
            debug('Networking functions not available, continuing in local mode');
        }
        
        debug('Full initialization complete!');
        
        // Animation loop function (called by the test animation initially)
        function animate() {
            try {
                requestAnimationFrame(animate);
                
                const currentTime = performance.now();
                const deltaTime = (currentTime - lastFrameTime) / 1000; // Convert to seconds
                lastFrameTime = currentTime;
                
                // Update controls if available
                if (controls) {
                    if (typeof controls.update === 'function') {
                        controls.update(deltaTime);
                    }
                }
                
                // Update player position based on controls
                if (playerNumberblock && playerNumberblock.mesh) {
                    // Update player position
                    updatePlayerPosition();
                    
                    // Check for collisions with operators
                    checkOperatorCollisions();
                    
                    // Check for collisions with other Numberblocks
                    checkNumberblockCollisions();
                }
                
                // Update operators (if they exist)
                if (operatorManager && typeof operatorManager.update === 'function') {
                    operatorManager.update(deltaTime);
                }
                
                // Rotate any rotating elements 
                if (numberblocks) {
                    for (let i = 0; i < numberblocks.length; i++) {
                        if (numberblocks[i] && numberblocks[i].mesh) {
                            // Small hover effect
                            numberblocks[i].mesh.position.y = Math.sin(currentTime * 0.001 + i) * 0.2 + 1;
                        }
                    }
                }
                
                // Render the scene
                if (renderer && scene && camera) {
                    renderer.render(scene, camera);
                }
            } catch (error) {
                debug(`Animation loop error: ${error.message}`);
                console.error('Animation error:', error);
            }
        }
        
        animate();
    } catch (error) {
        debug(`ERROR in initializeNetworking: ${error.message}`);
        console.error('Networking initialization error:', error);
    }
}

// Create the ground plane
function createGround() {
    // Create a large flat plane for the ground
    const groundGeometry = new THREE.BoxGeometry(200, 0.1, 200);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x7CFC00, // Lawn green color
        roughness: 0.8,
        metalness: 0.2
    });
    
    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.position.y = -0.05; // Move it slightly down to center it
    scene.add(ground);
}

// Create random landscape elements for perspective
function createLandscapeElements() {
    // Define bright colors that match Numberblocks aesthetic
    const colors = [
        0xFF0000, // Red (One)
        0xFFA500, // Orange (Two)
        0xFFFF00, // Yellow (Three)
        0x00FF00, // Green (Four)
        0x0000FF, // Blue (Five)
        0x800080, // Purple (Six)
        0xFFC0CB, // Pink (Seven)
        0xA52A2A, // Brown (Eight)
        0x808080  // Grey (Nine)
    ];
    
    // Create 120 random objects (increased from 30 for the larger world)
    for (let i = 0; i < 120; i++) {
        let geometry, material, mesh;
        const shapeType = Math.floor(Math.random() * 4); // 0-3 for different shapes
        const colorIndex = Math.floor(Math.random() * colors.length);
        const color = colors[colorIndex];
        
        // Create different shapes
        switch (shapeType) {
            case 0: // Cube (like Numberblock parts)
                const size = 0.5 + Math.random() * 1.5;
                geometry = new THREE.BoxGeometry(size, size, size);
                break;
            case 1: // Cylinder
                const radius = 0.3 + Math.random() * 1;
                const height = 1 + Math.random() * 3;
                geometry = new THREE.CylinderGeometry(radius, radius, height, 16);
                break;
            case 2: // Sphere
                const sphereRadius = 0.5 + Math.random() * 1;
                geometry = new THREE.SphereGeometry(sphereRadius, 16, 16);
                break;
            case 3: // Cone
                const coneRadius = 0.5 + Math.random() * 1;
                const coneHeight = 1 + Math.random() * 2;
                geometry = new THREE.ConeGeometry(coneRadius, coneHeight, 16);
                break;
        }
        
        // Create material with random color
        material = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.7,
            metalness: 0.2
        });
        
        // Create and position the mesh
        mesh = new THREE.Mesh(geometry, material);
        
        // Position randomly on the ground plane (within a 180x180 area)
        // Keep away from center where player spawns
        let posX, posZ;
        do {
            posX = (Math.random() * 180) - 90;
            posZ = (Math.random() * 180) - 90;
        } while (Math.abs(posX) < 8 && Math.abs(posZ) < 8); // Increased spawn area protection
        
        mesh.position.set(posX, 0, posZ);
        
        // Add random rotation for more variety
        mesh.rotation.y = Math.random() * Math.PI * 2;
        
        // Add to scene
        scene.add(mesh);
    }
    
    // Add some trees as landmarks
    createTrees();
}

// Create simple trees as landmarks
function createTrees() {
    for (let i = 0; i < 40; i++) {
        // Create trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 2, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513, // Brown
            roughness: 0.9
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        
        // Create foliage (as a cone)
        const foliageGeometry = new THREE.ConeGeometry(1.5, 3, 8);
        const foliageMaterial = new THREE.MeshStandardMaterial({
            color: 0x228B22, // Forest green
            roughness: 0.8
        });
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.y = 2.5; // Position on top of trunk
        
        // Create tree group
        const tree = new THREE.Group();
        tree.add(trunk);
        tree.add(foliage);
        
        // Position randomly on the ground plane but away from center
        let posX, posZ, distance;
        do {
            posX = (Math.random() * 180) - 90;
            posZ = (Math.random() * 180) - 90;
            distance = Math.sqrt(posX * posX + posZ * posZ);
        } while (distance < 10); // Keep trees away from spawn point
        
        tree.position.set(posX, 1, posZ); // Position with trunk base on ground
        
        // Add to scene
        scene.add(tree);
    }
}

// Create HUD elements
function createHUD() {
    // Player's number display
    const valueDisplay = document.createElement('div');
    valueDisplay.id = 'value-display';
    valueDisplay.style.position = 'absolute';
    valueDisplay.style.bottom = '20px';
    valueDisplay.style.left = '20px';
    valueDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    valueDisplay.style.color = 'white';
    valueDisplay.style.padding = '10px 20px';
    valueDisplay.style.borderRadius = '5px';
    valueDisplay.style.fontFamily = 'Arial, sans-serif';
    valueDisplay.style.fontSize = '24px';
    valueDisplay.style.fontWeight = 'bold';
    valueDisplay.innerHTML = 'Value: 1';
    document.body.appendChild(valueDisplay);

    // Operator display
    operatorDisplay = document.createElement('div');
    operatorDisplay.id = 'operator-display';
    operatorDisplay.style.position = 'absolute';
    operatorDisplay.style.bottom = '20px';
    operatorDisplay.style.right = '20px';
    operatorDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    operatorDisplay.style.color = 'white';
    operatorDisplay.style.padding = '10px 20px';
    operatorDisplay.style.borderRadius = '5px';
    operatorDisplay.style.fontFamily = 'Arial, sans-serif';
    operatorDisplay.style.fontSize = '24px';
    operatorDisplay.style.fontWeight = 'bold';
    operatorDisplay.innerHTML = 'Current Operator: None';
    document.body.appendChild(operatorDisplay);
    
    // View mode display
    const viewModeDisplay = document.createElement('div');
    viewModeDisplay.id = 'view-mode-display';
    viewModeDisplay.style.position = 'absolute';
    viewModeDisplay.style.top = '20px';
    viewModeDisplay.style.left = '50%';
    viewModeDisplay.style.transform = 'translateX(-50%)';
    viewModeDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    viewModeDisplay.style.color = 'white';
    viewModeDisplay.style.padding = '10px 20px';
    viewModeDisplay.style.borderRadius = '5px';
    viewModeDisplay.style.fontFamily = 'Arial, sans-serif';
    viewModeDisplay.style.fontSize = '20px';
    viewModeDisplay.style.fontWeight = 'bold';
    viewModeDisplay.style.transition = 'opacity 1s';
    viewModeDisplay.style.opacity = '0';
    viewModeDisplay.innerHTML = 'First Person View';
    document.body.appendChild(viewModeDisplay);
}

// Update the player's number display in the HUD
function updatePlayerDisplay(value) {
    const valueDisplay = document.getElementById('value-display');
    if (valueDisplay) {
        valueDisplay.innerHTML = `Value: ${value}`;
    }
}

// Update operator display
function updateOperatorDisplay(operatorType) {
    if (operatorDisplay) {
        if (operatorType) {
            operatorDisplay.innerHTML = operatorType === 'plus' ? '+ Add' : '- Subtract';
            operatorDisplay.style.color = operatorType === 'plus' ? '#00FF00' : '#FF0000';
        } else {
            operatorDisplay.innerHTML = 'Current Operator: None';
            operatorDisplay.style.color = 'white';
        }
    }
}

// Create random Numberblocks around the map
function createRandomNumberblocks() {
    const numBlocks = 15; // Create 15 random Numberblocks
    
    for (let i = 0; i < numBlocks; i++) {
        // Create a Numberblock with random value between 1 and 20
        const value = Math.floor(Math.random() * 20) + 1;
        const numberblock = new Numberblock(value);
        
        // Position randomly, away from player spawn
        let posX, posZ;
        do {
            posX = (Math.random() * 40) - 20;
            posZ = (Math.random() * 40) - 20;
        } while (
            Math.abs(posX) < 5 && 
            Math.abs(posZ) < 5
        );
        
        // Position the Numberblock with its base at ground level
        numberblock.mesh.position.set(posX, numberblock.blockSize / 2, posZ);
        scene.add(numberblock.mesh);
        numberblocks.push(numberblock);
        
        if (typeof addCollidableObject === 'function') {
            addCollidableObject(numberblock.mesh);
        }
    }
}

// Create a static Numberblock for testing
function createStaticNumberblock(value = 2, position = { x: 0, z: -5 }) {
    const numberblock = new Numberblock(value);
    numberblock.mesh.position.set(position.x, numberblock.blockSize / 2, position.z);
    scene.add(numberblock.mesh);
    return numberblock;
}

// Create random shapes for the landscape
function createRandomShapes() {
    const numShapes = 30;
    const shapes = [];
    
    for (let i = 0; i < numShapes; i++) {
        let geometry, mesh;
        const shapeType = Math.floor(Math.random() * 4); // 0: cube, 1: cylinder, 2: sphere, 3: cone
        
        // Create random shape
        switch (shapeType) {
            case 0: // Cube
                geometry = new THREE.BoxGeometry(1, 1, 1);
                break;
            case 1: // Cylinder
                geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 16);
                break;
            case 2: // Sphere
                geometry = new THREE.SphereGeometry(0.5, 16, 16);
                break;
            case 3: // Cone
                geometry = new THREE.ConeGeometry(0.5, 1, 16);
                break;
        }
        
        // Create material with random color
        const material = new THREE.MeshStandardMaterial({
            color: Math.random() * 0xFFFFFF,
            roughness: 0.7,
            metalness: 0.3
        });
        
        mesh = new THREE.Mesh(geometry, material);
        
        // Position randomly on the ground plane (within a 40x40 area)
        // Keep away from center where player spawns
        let posX, posZ;
        do {
            posX = (Math.random() * 40) - 20;
            posZ = (Math.random() * 40) - 20;
        } while (
            Math.abs(posX) < 5 && 
            Math.abs(posZ) < 5
        );
        
        // Calculate Y position based on the shape's height
        let posY;
        if (shapeType === 0) { // Cube
            posY = mesh.geometry.parameters.height / 2;
        } else if (shapeType === 1) { // Cylinder
            posY = mesh.geometry.parameters.height / 2;
        } else if (shapeType === 2) { // Sphere
            posY = mesh.geometry.parameters.radius;
        } else { // Cone
            posY = mesh.geometry.parameters.height / 2;
        }
        
        mesh.position.set(posX, posY, posZ);
        
        // Add random rotation for more variety
        mesh.rotation.y = Math.random() * Math.PI * 2;
        
        scene.add(mesh);
        shapes.push(mesh);
        
        // Make it collidable
        if (typeof addCollidableObject === 'function') {
            addCollidableObject(mesh);
        }
    }
    
    return shapes;
}

// Create player Numberblock and add it to the scene
function createPlayerNumberblock(scene, value = 1) {
    const playerBlock = new Numberblock(value);
    playerBlock.mesh.position.set(0, playerBlock.blockSize / 2, 0); // Start at origin, on ground
    scene.add(playerBlock.mesh);
    return playerBlock;
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
function animate() {
    try {
        requestAnimationFrame(animate);
        
        const currentTime = performance.now();
        const deltaTime = (currentTime - lastFrameTime) / 1000; // Convert to seconds
        lastFrameTime = currentTime;
        
        // Update controls if available
        if (controls) {
            if (typeof controls.update === 'function') {
                controls.update(deltaTime);
            }
        }
        
        // Update player position based on controls
        if (playerNumberblock && playerNumberblock.mesh) {
            // Update player position
            updatePlayerPosition();
            
            // Check for collisions with operators
            checkOperatorCollisions();
            
            // Check for collisions with other Numberblocks
            checkNumberblockCollisions();
        }
        
        // Update operators (if they exist)
        if (operatorManager && typeof operatorManager.update === 'function') {
            operatorManager.update(deltaTime);
        }
        
        // Rotate any rotating elements 
        if (numberblocks) {
            for (let i = 0; i < numberblocks.length; i++) {
                if (numberblocks[i] && numberblocks[i].mesh) {
                    // Small hover effect
                    numberblocks[i].mesh.position.y = Math.sin(currentTime * 0.001 + i) * 0.2 + 1;
                }
            }
        }
        
        // Render the scene
        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    } catch (error) {
        debug(`Animation loop error: ${error.message}`);
        console.error('Animation error:', error);
    }
}

// Update player position and rotation based on controls - STANDARD FPS MECHANICS
function updatePlayerPosition() {
    try {
        if (!controls || !playerNumberblock) return;
        
        const time = performance.now();
        const delta = (time - prevTime) / 1000;
        
        // Handle movement with PointerLockControls
        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize(); // Normalize for consistent speed
        
        // We need to consider the camera's facing direction for movement
        if (controls.isLocked) {
            // Move in the direction the camera is facing
            const moveSpeed = 5.0; // Units per second
            
            if (moveForward || moveBackward) {
                controls.moveForward(direction.z * moveSpeed * delta);
            }
            
            if (moveLeft || moveRight) {
                controls.moveRight(direction.x * moveSpeed * delta);
            }
        }
        
        // Update Numberblock position to match controls
        if (playerNumberblock && playerNumberblock.mesh) {
            playerNumberblock.mesh.position.copy(controls.getObject().position);
            playerNumberblock.mesh.rotation.y = controls.getObject().rotation.y;
        }
        
        prevTime = time;
        
        // Send position to server if networking is initialized
        if (isNetworkInitialized && typeof sendPlayerUpdate === 'function') {
            const position = controls.getObject().position;
            const rotation = controls.getObject().rotation.y;
            const pitch = camera.rotation.x;
            
            sendPlayerUpdate(position, rotation, pitch, playerNumberblock.value);
        }
    } catch (error) {
        debug(`Error in updatePlayerPosition: ${error.message}`);
    }
}

// Update player position in third-person mode
function updatePlayerPositionThirdPerson(delta) {
    try {
        if (!playerNumberblock || !controls) return;

        const moveSpeed = 5.0; // Movement speed
        const rotationSpeed = 2.0; // Rotation speed for Q/E keys

        // Get camera's current direction vectors
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).setY(0).normalize();
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).setY(0).normalize();

        // Calculate desired movement direction from keyboard input
        const movement = new THREE.Vector3();
        if (moveForward) movement.add(forward);
        if (moveBackward) movement.sub(forward);
        if (moveLeft) movement.sub(right);
        if (moveRight) movement.add(right);

        movement.normalize().multiplyScalar(moveSpeed * delta);

        // Update player position
        playerNumberblock.mesh.position.add(movement);

        // Rotate player using Q/E keys
        if (turnLeft) playerNumberblock.mesh.rotation.y += rotationSpeed * delta;
        if (turnRight) playerNumberblock.mesh.rotation.y -= rotationSpeed * delta;

        // Rotate player to face movement direction if moving (and no manual rotation with Q/E)
        if (movement.lengthSq() > 0.0001 && !turnLeft && !turnRight) {
            const targetAngle = Math.atan2(movement.x, movement.z);
            playerNumberblock.mesh.rotation.y = targetAngle;
        }
    } catch (error) {
        debug(`Error in updatePlayerPositionThirdPerson: ${error.message}`);
    }
}

// Update camera position in third-person mode
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
        if (turnLeft) window.thirdPersonCameraAngle += rotationSpeed;
        if (turnRight) window.thirdPersonCameraAngle -= rotationSpeed;

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
        const lookAtY = playerNumberblock.mesh.position.y + playerNumberblock.getHeight() / 2;
        camera.lookAt(playerNumberblock.mesh.position.x, targetY - (heightOffset / 2), playerNumberblock.mesh.position.z);
    } catch (error) {
        debug(`Error in updateThirdPersonCamera: ${error.message}`);
    }
}

// Switch to third-person view
function switchToThirdPersonView() {
    // Make sure the camera is only in one place at a time
    if (camera.parent === controls.getObject()) {
        // If camera is attached to controls, remove it first
        controls.getObject().remove(camera);
    }
    
    // Only add to scene if it's not already there
    if (camera.parent !== scene) {
        scene.add(camera);
    }
    
    // Reset camera's up vector to ensure correct orientation
    camera.up.set(0, 1, 0);
    
    // Initialize third-person camera angle based on current player rotation
    // Use + Math.PI to position camera behind player
    window.thirdPersonCameraAngle = playerNumberblock.mesh.rotation.y + Math.PI;
    
    // Set initial camera position immediately to avoid gradual transition
    const playerPos = playerNumberblock.mesh.position.clone();
    const distance = 12;
    const height = 8;
    
    camera.position.set(
        playerPos.x - Math.sin(window.thirdPersonCameraAngle) * distance,
        playerPos.y + height,
        playerPos.z - Math.cos(window.thirdPersonCameraAngle) * distance
    );
    
    // Look at player immediately
    const targetY = playerPos.y + playerNumberblock.getHeight() / 2;
    camera.lookAt(playerPos.x, targetY, playerPos.z);
    
    // Setup mouse controls for third-person camera rotation
    if (!window.thirdPersonMouseHandler) {
        window.thirdPersonMouseHandler = function(event) {
            // Skip processing extremely small movements to prevent drift
            if (Math.abs(event.movementX) > 0.5) {
                window.thirdPersonCameraAngle -= event.movementX * 0.002;
            }
        };
    }
    
    // Activate third-person mouse controls using the pointer lock events
    document.addEventListener('mousemove', window.thirdPersonMouseHandler);
    window.thirdPersonMouseControlsActive = true;
    
    // Make sure pointer is locked
    if (!controls.isLocked) {
        controls.lock();
    }
}

// Check for collisions between player's Numberblock and operators
function checkOperatorCollisions() {
    try {
        if (!playerNumberblock || !operatorManager) return;
        
        const playerBox = updateAABB(playerNumberblock.mesh);
        
        for (let i = 0; i < operatorManager.operators.length; i++) {
            const operator = operatorManager.operators[i];
            const operatorBox = updateAABB(operator.mesh);
            
            if (checkCollision(playerBox, operatorBox)) {
                // Apply operator effect
                const newValue = playerNumberblock.value + (operator.type === '+' ? 1 : -1);
                if (newValue > 0) {
                    playerNumberblock.updateValue(newValue);
                    updatePlayerDisplay(newValue);
                }
                
                operatorManager.removeOperator(i);
                break;
            }
        }
    } catch (error) {
        debug(`Error in checkOperatorCollisions: ${error.message}`);
    }
}

// Check for collisions between player and other numberblocks
function checkNumberblockCollisions() {
    try {
        if (!playerNumberblock || numberblocks.length === 0) return;
        
        const playerBox = updateAABB(playerNumberblock.mesh);
        
        for (let i = 0; i < numberblocks.length; i++) {
            const numberblock = numberblocks[i];
            
            // Skip if already collected
            if (numberblock.collected) continue;
            
            const numberblockBox = updateAABB(numberblock.mesh);
            
            if (checkCollision(playerBox, numberblockBox)) {
                // Combine the numbers
                const newValue = playerNumberblock.value + numberblock.value;
                playerNumberblock.updateValue(newValue);
                updatePlayerDisplay(newValue);
                
                // Remove the numberblock that was collided with
                scene.remove(numberblock.mesh);
                numberblocks.splice(i, 1);
                break;
            }
        }
    } catch (error) {
        debug(`Error in checkNumberblockCollisions: ${error.message}`);
    }
}

// Handle collision with a Numberblock
function handleNumberblockCollision(hitNumberblock) {
    // Only apply operation if we have an operator
    const operatorType = operatorManager.getHeldOperator();
    if (operatorType) {
        const oldValue = playerNumberblock.value;
        let newValue;
        
        if (operatorType === 'plus') {
            newValue = oldValue + hitNumberblock.value;
        } else {
            newValue = oldValue - hitNumberblock.value;
        }
        
        // Ensure value stays positive
        newValue = Math.max(1, newValue);
        
        // Update player's Numberblock
        playerNumberblock.setValue(newValue);
        updatePlayerDisplay(newValue);
        
        // Clear the held operator
        operatorManager.clearHeldOperator();
        updateOperatorDisplay(null);
        
        // Update camera position for new height
        updateCameraForNumberblockChange();
        
        debug(`Applied ${operatorType} operation: ${oldValue} ${operatorType === 'plus' ? '+' : '-'} ${hitNumberblock.value} = ${newValue}`);
    }
}

// Update camera position after Numberblock changes size
function updateCameraForNumberblockChange() {
    if (controls && playerNumberblock) {
        const controlsObject = controls.getObject();
        const numberblockHeight = playerNumberblock.getHeight();
        
        // Calculate new appropriate camera height
        const verticalOffset = Math.max(1.5, numberblockHeight * 0.6);
        const desiredCameraHeight = playerNumberblock.mesh.position.y + verticalOffset;
        
        // Set camera to new height
        controlsObject.position.y = desiredCameraHeight;
        
        // Ensure camera doesn't go below minimum height
        const minCameraHeight = 1.0;
        if (controlsObject.position.y < minCameraHeight) {
            controlsObject.position.y = minCameraHeight;
        }
    }
}

// Add view toggle with V key
document.addEventListener('keydown', (event) => {
    if (event.code === 'KeyV') {
        window.isFirstPerson = !window.isFirstPerson;

        const controlsInfo = document.getElementById('controls-info');
        if (controlsInfo) controlsInfo.style.display = 'none'; // Always hide in both modes

        if (window.isFirstPerson) {
            // Switch to first-person view
            
            // Remove any third-person mouse control listeners if they exist
            if (window.thirdPersonMouseControlsActive) {
                document.removeEventListener('mousemove', window.thirdPersonMouseHandler);
                window.thirdPersonMouseControlsActive = false;
            }
            
            // Make sure the camera is only in one place at a time
            // Check if camera is already part of controls before adding it
            if (camera.parent === scene) {
                scene.remove(camera);
                
                // Reset camera and attach to controls
                // IMPORTANT: Only add the camera if it's not already a child
                if (!controls.getObject().children.includes(camera)) {
                    controls.getObject().add(camera);
                    camera.position.set(0, 0, 0);
                    camera.rotation.set(0, 0, 0);
                }
            }
            
            // Position controls at Numberblock's head position
            controls.getObject().position.copy(playerNumberblock.mesh.position);
            controls.getObject().position.y += playerNumberblock.getHeight() / 2;
            
            // Set rotation to match Numberblock exactly
            controls.getObject().rotation.y = playerNumberblock.mesh.rotation.y;
            
            // Make sure pointer is locked
            if (!controls.isLocked) {
                controls.lock();
            }
        } else {
            // Use dedicated function for switching to third-person
            switchToThirdPersonView();
        }

        camera.updateProjectionMatrix();

        // Update HUD view mode display
        const viewModeDisplay = document.getElementById('view-mode-display');
        if (viewModeDisplay) {
            viewModeDisplay.textContent = window.isFirstPerson ? 'First Person View' : 'Third Person View';
            viewModeDisplay.style.opacity = '1';
            setTimeout(() => viewModeDisplay.style.opacity = '0', 2000);
        }
    }
});

// Initialize the scene when the page loads
document.addEventListener('DOMContentLoaded', () => {
    debug('Page loaded - starting initialization');
});

// Create the ground plane for the game environment
function createGround() {
    try {
        debug('Creating ground plane...');
        
        // Create a ground plane
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2; // Rotate to be flat
        ground.position.y = -0.5;
        ground.receiveShadow = true;
        scene.add(ground);
        debug('Ground created successfully');
    } catch (error) {
        debug(`Error creating ground: ${error.message}`);
    }
}

// Create landscape elements for the game environment
function createLandscapeElements() {
    try {
        debug('Creating landscape elements...');
        
        // Add some random cubes as landscape elements
        for (let i = 0; i < 20; i++) {
            const size = Math.random() * 3 + 1;
            const cubeGeometry = new THREE.BoxGeometry(size, size, size);
            const cubeMaterial = new THREE.MeshStandardMaterial({ 
                color: Math.random() * 0xffffff 
            });
            
            const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
            cube.position.set(
                Math.random() * 80 - 40,
                size / 2 - 0.5,
                Math.random() * 80 - 40
            );
            
            cube.castShadow = true;
            cube.receiveShadow = true;
            scene.add(cube);
        }
        
        debug('Landscape elements created successfully');
    } catch (error) {
        debug(`Error creating landscape elements: ${error.message}`);
    }
}

// Create the player's Numberblock character
function createPlayerNumberblock(scene, value) {
    try {
        debug(`Creating player Numberblock with value ${value}...`);
        
        const playerNumberblock = new Numberblock(value);
        scene.add(playerNumberblock.mesh);
        
        debug('Player Numberblock created successfully');
        return playerNumberblock;
    } catch (error) {
        debug(`Error creating player Numberblock: ${error.message}`);
        return null;
    }
}

// Create a static Numberblock for interaction
function createStaticNumberblock(value, position) {
    try {
        debug(`Creating static Numberblock with value ${value}...`);
        
        const staticNumberblock = new Numberblock(value);
        staticNumberblock.mesh.position.set(position.x, 0, position.z);
        scene.add(staticNumberblock.mesh);
        
        debug('Static Numberblock created successfully');
        return staticNumberblock;
    } catch (error) {
        debug(`Error creating static Numberblock: ${error.message}`);
        return null;
    }
}

// Create random Numberblocks in the game environment
function createRandomNumberblocks() {
    try {
        debug('Creating random Numberblocks...');
        
        // Add some random Numberblocks around the level
        for (let i = 0; i < 5; i++) {
            const value = Math.floor(Math.random() * 5) + 1;
            const xPos = Math.random() * 80 - 40;
            const zPos = Math.random() * 80 - 40;
            
            const randomNumberblock = new Numberblock(value);
            randomNumberblock.mesh.position.set(xPos, 0, zPos);
            
            scene.add(randomNumberblock.mesh);
            numberblocks.push(randomNumberblock);
        }
        
        debug('Random Numberblocks created successfully');
    } catch (error) {
        debug(`Error creating random Numberblocks: ${error.message}`);
    }
}

// Create HUD elements for player information
function createHUD() {
    try {
        debug('Creating HUD elements...');
        
        // Set up the operator display for showing collected operators
        operatorDisplay = document.getElementById('game-hud');
        operatorDisplay.innerHTML = `
            <div class="number-display">
                <span id="number-value">1</span>
            </div>
        `;
        
        debug('HUD elements created successfully');
    } catch (error) {
        debug(`Error creating HUD: ${error.message}`);
    }
}

// Handle Numberblock collision by combining numbers
function handleNumberblockCollision(otherNumberblock) {
    try {
        debug(`Handling collision with Numberblock value ${otherNumberblock.value}`);
        
        // Add the values
        const newValue = playerNumberblock.value + otherNumberblock.value;
        
        // Update player's Numberblock
        playerNumberblock.updateValue(newValue);
        
        // Update the HUD
        updatePlayerDisplay(newValue);
        
        debug(`Player Numberblock updated to value ${newValue}`);
    } catch (error) {
        debug(`Error handling Numberblock collision: ${error.message}`);
    }
}

// Update the HUD display with the player's current number value
function updatePlayerDisplay(value) {
    try {
        debug(`Updating player display to value ${value}`);
        
        const valueDisplay = document.getElementById('number-value');
        if (valueDisplay) {
            valueDisplay.textContent = value;
        }
        
        // Show the current operator if available
        const operatorDisplay = document.getElementById('operator-display');
        if (operatorDisplay) {
            operatorDisplay.style.display = 'block';
        }
    } catch (error) {
        debug(`Error updating player display: ${error.message}`);
    }
}

// Update the camera position for Numberblock height changes
function updateCameraForNumberblockChange() {
    try {
        if (!playerNumberblock || !controls) return;
        
        const height = playerNumberblock.getHeight();
        debug(`Updating camera for Numberblock height ${height}`);
        
        // In first-person mode, adjust the camera height
        if (window.isFirstPerson) {
            const playerHeight = Math.max(2, height);
            const controlsObject = controls.getObject();
            controlsObject.position.y = playerHeight;
        }
    } catch (error) {
        debug(`Error updating camera for Numberblock: ${error.message}`);
    }
}

// Initialize first-person controls
function initControls(camera, domElement) {
    try {
        debug('Initializing PointerLockControls...');
        
        // Create PointerLockControls
        const controls = new THREE.PointerLockControls(camera, domElement);
        
        // Add event listeners for pointer lock changes
        document.addEventListener('pointerlockchange', function() {
            if (document.pointerLockElement === domElement) {
                debug('Pointer Lock enabled');
                controls.enabled = true;
                if (lockInstructions) lockInstructions.style.display = 'none';
            } else {
                debug('Pointer Lock disabled');
                controls.enabled = false;
                if (lockInstructions) lockInstructions.style.display = 'block';
            }
        });
        
        controls.addEventListener('lock', function() {
            debug('Controls locked');
            document.getElementById('lock-instructions').style.display = 'none';
        });
        
        controls.addEventListener('unlock', function() {
            debug('Controls unlocked');
            document.getElementById('lock-instructions').style.display = 'block';
        });
        
        // Setup key controls for movement
        document.addEventListener('keydown', onKeyDown, false);
        document.addEventListener('keyup', onKeyUp, false);
        
        debug('PointerLockControls initialized successfully');
        return controls;
    } catch (error) {
        debug(`ERROR initializing controls: ${error.message}`);
        console.error('Controls initialization error:', error);
        
        // Return dummy controls to prevent crashes
        return {
            getObject: () => camera,
            isLocked: false,
            lock: () => {},
            unlock: () => {}
        };
    }
}

// Handle keydown events for movement
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
            
        case 'KeyQ':
            turnLeft = true;
            break;
            
        case 'KeyE':
            turnRight = true;
            break;
            
        case 'Space':
            if (canJump) {
                velocity.y += 350;
                canJump = false;
            }
            break;
            
        case 'KeyV':
            toggleViewMode();
            break;
    }
}

// Handle keyup events for movement
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

```
```javascript
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
let camera, scene, renderer;
let controls;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
let prevTime = performance.now();
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let playerNumberblock;
let operators = [];
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
        
        // Render the test cube to verify rendering
        renderer.render(scene, camera);
        debug('Initial render completed');
        
        // Setup Pointer Lock Controls
        setupPointerLockControls();
        
        // Initialize floor
        initFloor();
        
        // Initialize player Numberblock
        initPlayerNumberblock();
        
        // Initialize networking
        initNetworking();
        
        // Start the animation loop
        debug('Starting animation loop');
        animate();
        
        window.addEventListener('resize', onWindowResize);
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
                controls.enabled = true;
                if (lockInstructions) lockInstructions.style.display = 'none';
            } else {
                debug('Pointer Lock disabled');
                controls.enabled = false;
                if (lockInstructions) lockInstructions.style.display = 'block';
            }
        };
        
        document.addEventListener('pointerlockchange', onPointerLockChange);
        
        // Click to enable controls
        document.body.addEventListener('click', function() {
            if (!controls.enabled) {
                debug('Requesting pointer lock');
                document.body.requestPointerLock();
            }
        });
        
        // Setup keyboard controls
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        
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
        const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
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
        playerNumberblock = new Numberblock(1);
        scene.add(playerNumberblock.mesh);
        debug('Player Numberblock created');
    } catch (error) {
        debug(`Error creating player Numberblock: ${error.message}`, true);
    }
}

// Initialize networking
function initNetworking() {
    debug('Initializing networking');
    
    try {
        // Check if network.js functions are available
        if (typeof initNetworking === 'function') {
            initNetworking()
                .then(() => {
                    debug('Networking initialized successfully');
                })
                .catch(error => {
                    debug(`ERROR initializing networking: ${error.message}`, true);
                    console.error('Networking initialization error:', error);
                    debug('Continuing in local mode...');
                });
        } else {
            debug('Networking functions not available, continuing in local mode');
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
            camera.rotation.y += 0.05;
            break;
        case 'KeyE':
            // Turn right
            camera.rotation.y -= 0.05;
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
        
        // Update player position and handle controls
        if (controls && controls.enabled) {
            updatePlayerPosition();
        }
        
        // Rotate all operators to face the player
        updateOperators();
        
        // Render the scene
        renderer.render(scene, camera);
    } catch (error) {
        debug(`Animation error: ${error.message}`, true);
    }
}

// Update player position based on controls
function updatePlayerPosition() {
    const time = performance.now();
    
    if (prevTime === undefined) {
        prevTime = time;
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
    
    // Update position of player's Numberblock to follow the camera
    if (playerNumberblock) {
        playerNumberblock.mesh.position.copy(camera.position);
        playerNumberblock.mesh.position.y -= 1.5; // Position below the camera view
        
        // Look in same direction as camera
        playerNumberblock.mesh.rotation.y = controls.getObject().rotation.y;
    }
    
    // Send position to server for multiplayer
    if (room) {
        room.send("updatePosition", {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z,
            rotation: camera.rotation.y
        });
    }
    
    prevTime = time;
}

// Initialize networking for multiplayer
function initNetworking() {
    debug('Initializing networking');
    
    try {
        // Check if network.js functions are available
        if (typeof initNetworking === 'function') {
            initNetworking()
                .then(() => {
                    debug('Networking initialized successfully');
                })
                .catch(error => {
                    debug(`ERROR initializing networking: ${error.message}`, true);
                    console.error('Networking initialization error:', error);
                    debug('Continuing in local mode...');
                });
        } else {
            debug('Networking functions not available, continuing in local mode');
        }
    } catch (error) {
        debug(`Error initializing networking: ${error.message}`, true);
    }
}

// Update and rotate all operators to face the player
function updateOperators() {
    // TO DO: Implement operator rotation
}

// Update player's Numberblock value
function updatePlayerValue() {
    // TO DO: Implement player value update
}
