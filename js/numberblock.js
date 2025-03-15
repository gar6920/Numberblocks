// Numberblocks game - Numberblock model implementation

class Numberblock {
    constructor(value = 1, color = null) {
        this.value = value;
        this.mesh = new THREE.Group();
        this.blockSize = 1; // Size of each cube
        this.blockSpacing = 0.01; // Small gap between blocks
        this.totalHeight = 0;
        
        // Set color based on the Numberblock value, following show colors if no color specified
        if (!color) {
            this.color = this.getColorForNumber(value);
        } else {
            this.color = color;
        }
        
        this.createNumberblock();
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
    
    // Create the complete Numberblock with all features
    createNumberblock() {
        this.mesh.clear(); // Clear any existing meshes
        this.totalHeight = 0;
        
        // Create the stack of blocks
        for (let i = 0; i < this.value; i++) {
            const block = this.createBlock();
            
            // Position each block on top of the previous one
            block.position.y = this.totalHeight;
            this.totalHeight += this.blockSize + this.blockSpacing;
            
            this.mesh.add(block);
            
            // Add face only to the top block
            if (i === this.value - 1) {
                const face = this.createFace();
                block.add(face);
                
                // Add number tag on top of the top block
                const numberTag = this.createNumberTag();
                numberTag.position.y = this.blockSize / 2 + 0.1; // Position just above the top block
                block.add(numberTag);
            }
        }
        
        // Add arms to the middle block or the second block from the bottom if more than 3 blocks
        const armBlockIndex = this.value <= 3 ? Math.floor(this.value / 2) : 1;
        if (this.value > 0 && armBlockIndex < this.value) {
            const leftArm = this.createArm('left');
            const rightArm = this.createArm('right');
            
            this.mesh.children[armBlockIndex].add(leftArm);
            this.mesh.children[armBlockIndex].add(rightArm);
        }
        
        // Add feet to the bottom block
        if (this.value > 0) {
            const leftFoot = this.createFoot('left');
            const rightFoot = this.createFoot('right');
            
            this.mesh.children[0].add(leftFoot);
            this.mesh.children[0].add(rightFoot);
        }
        
        // Adjust the entire Numberblock position so the bottom is at y=0
        this.mesh.position.y = 0;
    }
    
    // Get the height of the Numberblock (for physics calculations)
    getHeight() {
        // Return the total height calculated during creation
        // If value is 0, return a minimum height
        return this.value > 0 ? this.totalHeight - this.blockSpacing : this.blockSize;
    }
    
    // Create a single block with the Numberblock's color
    createBlock() {
        const geometry = new THREE.BoxGeometry(this.blockSize, this.blockSize, this.blockSize);
        const material = new THREE.MeshStandardMaterial({
            color: this.color,
            roughness: 0.7,
            metalness: 0.2
        });
        
        return new THREE.Mesh(geometry, material);
    }
    
    // Create a face with eyes and mouth
    createFace() {
        const face = new THREE.Group();
        
        // Eyes (white spheres with black pupils)
        const eyeSize = this.blockSize * 0.15;
        const eyeSpacing = this.blockSize * 0.3;
        const eyeHeight = this.blockSize * 0.1;
        const eyeDepth = this.blockSize / 2 + 0.01; // Slightly in front of the face
        
        // Create and position left eye
        const leftEye = this.createEye(eyeSize);
        leftEye.position.set(-eyeSpacing, eyeHeight, eyeDepth);
        face.add(leftEye);
        
        // Create and position right eye
        const rightEye = this.createEye(eyeSize);
        rightEye.position.set(eyeSpacing, eyeHeight, eyeDepth);
        face.add(rightEye);
        
        // Mouth (curved line or small cylinder)
        const mouthWidth = this.blockSize * 0.4;
        const mouthHeight = this.blockSize * 0.1;
        const mouthDepth = this.blockSize / 2 + 0.01; // Slightly in front of the face
        const mouthY = -eyeHeight * 2; // Position below the eyes
        
        const mouthGeometry = new THREE.CylinderGeometry(
            mouthHeight/2, mouthHeight/2, mouthWidth, 16, 1, false, 0, Math.PI
        );
        mouthGeometry.rotateZ(Math.PI / 2); // Rotate to correct orientation
        
        const mouthMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
        mouth.position.set(0, mouthY, mouthDepth);
        face.add(mouth);
        
        return face;
    }
    
    // Create an eye (white sphere with black pupil)
    createEye(size) {
        const eye = new THREE.Group();
        
        // White part of the eye
        const eyeWhiteGeometry = new THREE.SphereGeometry(size, 16, 16);
        const eyeWhiteMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        const eyeWhite = new THREE.Mesh(eyeWhiteGeometry, eyeWhiteMaterial);
        eye.add(eyeWhite);
        
        // Black pupil
        const pupilSize = size * 0.5;
        const pupilGeometry = new THREE.SphereGeometry(pupilSize, 16, 16);
        const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const pupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        pupil.position.z = size * 0.6; // Position the pupil slightly in front of the eye
        eye.add(pupil);
        
        return eye;
    }
    
    // Create a number tag to display on top of the Numberblock
    createNumberTag() {
        const tag = new THREE.Group();
        
        // Create a circular background for the number
        const tagRadius = this.blockSize * 0.3;
        const tagGeometry = new THREE.CylinderGeometry(tagRadius, tagRadius, 0.05, 32);
        const tagMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        const tagMesh = new THREE.Mesh(tagGeometry, tagMaterial);
        tagMesh.rotation.x = Math.PI / 2; // Make it horizontal
        tag.add(tagMesh);
        
        // Create text geometry for the number
        // Note: Using a simple approach since Three.js TextGeometry requires font loading
        // In production, use Three.js TextGeometry with a loaded font
        
        // For now, we'll create a simple representation
        const numberSize = this.blockSize * 0.2;
        const numberThickness = 0.05;
        let numberMesh;
        
        // Create a simple cube for the number (in a real implementation, use TextGeometry)
        const numberGeometry = new THREE.BoxGeometry(numberSize, numberSize * 1.5, numberThickness);
        const numberMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        numberMesh = new THREE.Mesh(numberGeometry, numberMaterial);
        
        // Position the number just above the tag background
        numberMesh.position.z = 0.03;
        tag.add(numberMesh);
        
        // Add a text object using HTML and CSS (will be updated in the render loop)
        const valueDiv = document.createElement('div');
        valueDiv.className = 'numberblock-value';
        valueDiv.innerHTML = this.value.toString();
        valueDiv.style.position = 'absolute';
        valueDiv.style.display = 'none'; // Will be positioned in render loop
        valueDiv.style.color = 'black';
        valueDiv.style.fontWeight = 'bold';
        valueDiv.style.fontSize = '24px';
        valueDiv.style.fontFamily = 'Arial, sans-serif';
        valueDiv.style.textAlign = 'center';
        valueDiv.style.userSelect = 'none';
        document.body.appendChild(valueDiv);
        
        // Store the div element for later positioning
        this.valueDiv = valueDiv;
        
        return tag;
    }
    
    // Create an arm (left or right)
    createArm(side) {
        const arm = new THREE.Group();
        
        // Arm dimensions
        const armLength = this.blockSize * 0.6;
        const armWidth = this.blockSize * 0.2;
        const armHeight = this.blockSize * 0.2;
        
        // Create the arm geometry
        const armGeometry = new THREE.BoxGeometry(armLength, armHeight, armWidth);
        const armMaterial = new THREE.MeshStandardMaterial({
            color: this.color,
            roughness: 0.7,
            metalness: 0.2
        });
        
        const armMesh = new THREE.Mesh(armGeometry, armMaterial);
        
        // Position the arm on the side of the block
        const xOffset = (this.blockSize / 2 + armLength / 2) * (side === 'left' ? -1 : 1);
        armMesh.position.set(xOffset, 0, 0);
        
        arm.add(armMesh);
        
        // Add a hand at the end of the arm
        const handRadius = armWidth * 0.8;
        const handGeometry = new THREE.SphereGeometry(handRadius, 16, 16);
        const handMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF, // White hands
            roughness: 0.7,
            metalness: 0.2
        });
        
        const hand = new THREE.Mesh(handGeometry, handMaterial);
        
        // Position the hand at the end of the arm
        const handX = armLength / 2 * (side === 'left' ? -1 : 1);
        hand.position.set(handX, 0, 0);
        
        // Name the hand for easy reference
        hand.name = side + 'Hand';
        
        armMesh.add(hand);
        
        return arm;
    }
    
    // Create a foot (left or right)
    createFoot(side) {
        const foot = new THREE.Group();
        
        // Foot dimensions
        const footLength = this.blockSize * 0.4;
        const footWidth = this.blockSize * 0.3;
        const footHeight = this.blockSize * 0.15;
        
        // Create the foot geometry
        const footGeometry = new THREE.BoxGeometry(footLength, footHeight, footWidth);
        const footMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000, // Black feet
            roughness: 0.7,
            metalness: 0.2
        });
        
        const footMesh = new THREE.Mesh(footGeometry, footMaterial);
        
        // Position the foot on the bottom of the block
        const xOffset = (this.blockSize / 4) * (side === 'left' ? -1 : 1);
        const yOffset = -this.blockSize / 2 - footHeight / 2;
        const zOffset = this.blockSize / 4; // Push feet slightly forward
        footMesh.position.set(xOffset, yOffset, zOffset);
        
        foot.add(footMesh);
        
        return foot;
    }
    
    // Update the Numberblock value and regenerate the model
    setValue(newValue) {
        if (newValue < 1) newValue = 1; // Ensure minimum value of 1
        if (newValue !== this.value) {
            this.value = newValue;
            this.color = this.getColorForNumber(newValue);
            this.createNumberblock();
        }
    }
    
    // Update the position of the HTML number tag in render loop
    updateNumberTagPosition(camera, renderer) {
        if (this.valueDiv && this.mesh.children.length > 0) {
            // Get the top block
            const topBlock = this.mesh.children[this.value - 1];
            
            // Calculate position in screen space
            const position = new THREE.Vector3();
            position.copy(topBlock.position);
            position.y += this.blockSize / 2 + 0.2; // Position above the top block
            
            // Convert 3D position to 2D screen coordinates
            const worldPos = new THREE.Vector3();
            topBlock.getWorldPosition(worldPos);
            worldPos.y += this.blockSize / 2 + 0.2;
            
            const screenPos = worldPos.clone();
            screenPos.project(camera);
            
            // Convert to CSS coordinates
            const x = (screenPos.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
            const y = (-screenPos.y * 0.5 + 0.5) * renderer.domElement.clientHeight;
            
            // Update the position of the div
            this.valueDiv.style.display = 'block';
            this.valueDiv.style.left = `${x}px`;
            this.valueDiv.style.top = `${y}px`;
            this.valueDiv.innerHTML = this.value.toString();
        }
    }
    
    // Clean up resources when no longer needed
    dispose() {
        if (this.valueDiv && this.valueDiv.parentNode) {
            this.valueDiv.parentNode.removeChild(this.valueDiv);
        }
    }
}

// Function to create a player Numberblock and add it to the scene
function createPlayerNumberblock(scene, value = 1) {
    // Create the Numberblock
    const playerBlock = new Numberblock(value);
    
    // Position it slightly above the ground
    const totalHeight = playerBlock.totalHeight;
    playerBlock.mesh.position.y = totalHeight / 2;
    
    // Add to scene
    scene.add(playerBlock.mesh);
    
    return playerBlock;
}

// Export for use in other modules
if (typeof module !== 'undefined') {
    module.exports = {
        Numberblock,
        createPlayerNumberblock
    };
}