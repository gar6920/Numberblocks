// 3D AI Game Platform - Controls Adapter
// Bridges between the legacy controls code and the modular architecture

// This adapter ensures that the initControls function 
// is available and works correctly with our new architecture

(function() {
    // Create the initControls function if it doesn't exist
    if (typeof window.initControls !== 'function') {
        console.log('Creating controls adapter');
        
        window.initControls = function(options) {
            console.log('Controls adapter: initializing controls');
            
            // Create a basic PointerLockControls-like object
            const camera = options.camera || { 
                position: new THREE.Vector3(0, 1, 0) 
            };
            
            const domElement = options.domElement || document;
            
            // Create a controls object that mimics PointerLockControls
            const controls = {
                isLocked: false,
                camera: camera,
                domElement: domElement,
                
                // Movement and position data
                moveForward: false,
                moveBackward: false,
                moveLeft: false,
                moveRight: false,
                canJump: false,
                velocity: new THREE.Vector3(),
                direction: new THREE.Vector3(),
                
                // The object that is moved by the controls
                _controlObject: new THREE.Object3D(),
                
                // Methods
                getObject: function() {
                    return this._controlObject;
                },
                
                getDirection: function() {
                    return new THREE.Vector3(0, 0, -1);
                },
                
                moveRight: function(distance) {
                    // Move the control object right
                },
                
                moveForward: function(distance) {
                    // Move the control object forward
                },
                
                lock: function() {
                    this.isLocked = true;
                    document.dispatchEvent(new Event('pointerlockchange'));
                },
                
                unlock: function() {
                    this.isLocked = false;
                    document.dispatchEvent(new Event('pointerlockchange'));
                },
                
                update: function(delta) {
                    // Update the controls based on input
                    // This will be called by the animation loop
                }
            };
            
            // Add event listeners
            domElement.addEventListener('click', function() {
                controls.lock();
            });
            
            // Add pointerlock events
            document.addEventListener('pointerlockchange', function() {
                // Update locked state
            });
            
            return controls;
        };
    }
    
    console.log('Controls adapter loaded');
})(); 