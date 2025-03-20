// 3D AI Game Platform - Numberblock Adapter
// Ensures the Numberblock class is properly available to game-engine.js

(function() {
    // Check if Numberblock is already defined
    if (typeof window.Numberblock === 'undefined') {
        console.warn('Numberblock class not found, creating stub implementation');
        
        // Create a stub Numberblock class
        window.Numberblock = class Numberblock {
            constructor(value = 1, color = null) {
                this.value = value;
                this.mesh = new THREE.Group();
                this.mesh.userData.numberblock = this; // Store reference for easy access
                this.blockSize = 1; // Size of each cube
                this.blockSpacing = 0.01; // Small gap between blocks
                this.totalHeight = 0;
                
                // Set color based on the Numberblock value, following show colors if no color specified
                if (!color) {
                    this.color = this.getColorForNumber(value);
                } else {
                    this.color = color;
                }
                
                // Create a simple cube as fallback
                const geometry = new THREE.BoxGeometry(1, 1, 1);
                const material = new THREE.MeshStandardMaterial({
                    color: this.color,
                    roughness: 0.7,
                    metalness: 0.2
                });
                
                const cube = new THREE.Mesh(geometry, material);
                this.mesh.add(cube);
            }
            
            // Get the standard Numberblocks color based on value
            getColorForNumber(number) {
                const colors = {
                    1: 0xFF0000,   // Red (One)
                    2: 0xFFA500,   // Orange (Two)
                    3: 0xFFFF00,   // Yellow (Three)
                    4: 0x00FF00,   // Green (Four)
                    5: 0x0000FF,   // Blue (Five)
                    6: 0x800080,   // Purple (Six)
                    7: 0xFFC0CB,   // Pink (Seven)
                    8: 0xA52A2A,   // Brown (Eight)
                    9: 0x808080    // Grey (Nine)
                };
                
                // For numbers greater than 9, cycle through the colors or use white
                return colors[number % 9] || 0xFFFFFF;
            }
            
            // Stub for required methods
            createNumberblock() {
                console.log('Stub createNumberblock called');
            }
            
            getHeight() {
                return 1;
            }
            
            updateColor(newColor) {
                this.color = newColor;
            }
            
            setValue(newValue) {
                this.value = newValue;
            }
            
            updateValue(newValue) {
                this.setValue(newValue);
            }
        };
    }
    
    // Also create the utility function if it's missing
    if (typeof window.createPlayerNumberblock !== 'function') {
        window.createPlayerNumberblock = function(scene, value = 1) {
            const playerNumberblock = new window.Numberblock(value);
            
            if (scene) {
                scene.add(playerNumberblock.mesh);
            }
            
            return playerNumberblock;
        };
    }
    
    console.log('Numberblock adapter loaded');
})(); 