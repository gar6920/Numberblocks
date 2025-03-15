// Numberblocks game - Three.js implementation
console.log('Numberblocks game initializing...');

// Global variables
let scene, camera, renderer;
let ground;

// Initialize the Three.js scene
function init() {
    // Create the scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue background
    
    // Create the camera
    camera = new THREE.PerspectiveCamera(
        75, // Field of view
        window.innerWidth / window.innerHeight, // Aspect ratio
        0.1, // Near clipping plane
        1000 // Far clipping plane
    );
    
    // Position the camera above the ground
    camera.position.y = 2;
    camera.position.z = 5;
    
    // Create the renderer
    renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('game-canvas'),
        antialias: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // Add a ground plane
    createGround();
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    // Add directional light (like sunlight)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    
    // Start the animation loop
    animate();
}

// Create the ground plane
function createGround() {
    // Create a large flat plane for the ground
    const groundGeometry = new THREE.BoxGeometry(50, 0.1, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x7CFC00, // Lawn green color
        roughness: 0.8,
        metalness: 0.2
    });
    
    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.position.y = -0.05; // Move it slightly down to center it
    scene.add(ground);
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// Initialize the scene when the page loads
document.addEventListener('DOMContentLoaded', init);
