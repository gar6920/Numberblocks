# 3D AI Game Platform - Architecture

## Overview
3D AI Game is a modular 3D web-based game platform built with Three.js and Colyseus, utilizing a client-server architecture for multiplayer functionality. Players control customizable characters and interact with a colorful 3D environment. The platform is designed to support various game implementations, with Numberblocks being the first example.

## Core Components

### 1. Server (server.js)
**Technology:** Built with Node.js and Colyseus.

**Responsibilities:**
- Manages game rooms and player connections/disconnections
- Maintains the authoritative game state
- Processes player inputs (e.g., movement, collisions)
- Broadcasts state updates to all connected clients
- Handles entity spawning and lifecycle management

**Key Features:**
- Room-based multiplayer with session persistence
- State synchronization using Colyseus schema
- Server-authoritative position tracking
- Dynamic entity spawning system

### 2. Client Core Platform (/client/js/core)
The core platform provides foundational functionality that all game implementations can leverage.

**Key components:**
- **controls.js:**
  - Handles player movement and camera controls
  - Supports first-person, third person, and free roam view modes
  - Manages input handling for keyboard and mouse
  - Implements quaternion-based rotation for smooth camera movement

- **game-engine.js:**
  - Initializes the Three.js scene, renderer, and camera
  - Sets up player controls and world objects
  - Manages the animation loop for continuous rendering
  - Implements three distinct camera systems:
    - First-person view: Camera attached to player's head position
    - Third-person view: Camera follows behind player with intelligent rotation alignment
    - Free camera mode: Independent camera with WASD/QE movement and mouse look functionality
  - Handles smooth camera transitions between view modes
  - Maintains proper camera orientation with Euler angles to prevent unwanted roll

- **network-core.js:**
  - Establishes and maintains WebSocket connection to the server via Colyseus
  - Sends player actions to the server
  - Processes state updates from the server
  - Handles player joining/leaving events

- **Entity.js:**
  - Base class for all game entities
  - Provides core entity functionality (position, rotation, scale)
  - Defines interface for entity behaviors
  - Handles common entity lifecycle events

- **Player.js:**
  - Extends Entity for player-specific functionality
  - Manages player state and input handling
  - Provides interface for implementation-specific player behaviors

- **NPC.js:**
  - Extends Entity for non-player characters
  - Implements basic AI behaviors
  - Provides interface for implementation-specific NPC behaviors

- **EntityFactory.js:**
  - Factory pattern for creating entities
  - Registers entity types and their constructors
  - Used by both core platform and game implementations

- **collision.js:**
  - Handles collision detection and resolution
  - Provides interfaces for implementation-specific collision behaviors

- **player-ui.js:**
  - Manages common UI elements for player information
  - Provides hooks for implementation-specific UI components

### 3. Game Implementations (/client/js/implementations)
Each game implementation extends the core platform with specific gameplay mechanics and visuals.

**Numberblocks Implementation:**
- **numberblock.js:**
  - Extends Player and Entity for Numberblocks-specific functionality
  - Creates dynamic block stacks based on numeric value
  - Manages visual elements (face, arms, feet, colors)

- **operator.js:**
  - Implements mathematical operators that spawn in the game world
  - Handles collection and activation logic
  - Processes mathematical operations between players

**Future Implementations:**
- Will follow similar patterns, extending the core components
- Each implementation will be contained in its own directory
- Will register custom entity factories and behaviors

### 4. Main Engine (game-engine.js)
- Initializes the Three.js scene, renderer, and camera
- Sets up player controls and world objects
- Loads the appropriate game implementation based on configuration
- Manages view modes (first-person, third person, free roam)
- Updates visual components based on server state

### 5. Networking Architecture
**Technology:** Colyseus for WebSocket-based real-time multiplayer.

**Implementation:**
- Server maintains authoritative game state using Colyseus Schema
- Client sends player actions to the server at regular intervals
- Server validates actions, updates game state, and broadcasts to all clients
- Efficient state synchronization with delta updates
- Robust player synchronization with proper sessionId handling
- Smooth interpolation of remote player movements using lerping

**Key Features:**
- Session persistence with reconnection support
- Room-based multiplayer with shared state
- Message-based communication for game events
- Schema-based state synchronization with type annotations
- Player list UI showing all connected players
- Automatic remote player creation and cleanup
- Smooth remote player movement interpolation
- Proper handling of player value updates and mesh recreation
- Resilient error handling for network disconnections
- Automatic cleanup of stale player instances

**Schema Implementation:**
- Proper MapSchema collections for players, operators, and static objects
- Type annotations for all schema properties
- Structured synchronization patterns for consistent state updates
- Robust sessionId tracking for player identification
- Proper player state management with value updates

**Player Synchronization:**
- Automatic creation of remote player instances with proper sessionId tracking
- Smooth position interpolation using Three.js lerping
- Proper cleanup of disconnected player instances
- Value-based mesh updates for Numberblock changes
- Efficient player collection management using Set data structure
- Proper separation of local and remote player handling
- Resilient error handling for edge cases

## File Structure
```
/
├── server.js               # Main server file
├── package.json            # Node.js dependencies
├── client/                 # Client-side code
│   ├── index.html          # Main HTML file
│   ├── css/                # Stylesheets
│   └── js/                 # JavaScript files
│       ├── main.js         # Entry point and module loader
│       ├── core/           # Core platform code
│       │   ├── game-engine.js # Main game engine and rendering
│       │   ├── Entity.js   # Base entity class
│       │   ├── Player.js   # Base player class
│       │   ├── NPC.js      # Base NPC class
│       │   ├── controls.js # Camera and movement controls
│       │   ├── network-core.js # Networking functionality
│       │   ├── numberblock-adapter.js # Adapter for Numberblocks
│       │   ├── collision.js    # Collision detection
│       │   ├── EntityFactory.js # Entity creation factory
│       │   └── player-ui.js    # UI components
│       ├── implementations/ # Game-specific implementations
│       │   ├── default/     # Default box implementation
│       │   │   └── DefaultPlayer.js # Simple box player
│       │   ├── numberblocks/  # Numberblocks implementation
│       │   │   ├── NumberBlock.js # Numberblock entity
│       │   │   ├── entity-sync.js # Entity synchronization
│       │   │   ├── operator.js    # Mathematical operators
│       │   │   └── index.js       # Implementation entry point
│       │   └── [future implementations]
│       └── lib/            # Third-party libraries
├── server/                 # Server-side code
│   ├── index.js            # Server entry point
│   ├── core/               # Core server functionality
│   │   └── BaseRoom.js     # Base room implementation
│   ├── schemas/            # Colyseus schema definitions
│   │   ├── BaseEntity.js   # Base entity schema
│       │   ├── DefaultRoom.js  # Default room implementation
│   │   ├── GameState.js    # Game state schema
│   │   ├── Player.js       # Player schema
│   │   └── InputState.js   # Input state schema
│   └── implementations/    # Server-side implementations
│       ├── default/        # Default implementation
│       │   └── index.js    # Default implementation entry point
│       └── numberblocks/   # Numberblocks implementation
│           ├── index.js    # Implementation entry point
│           ├── schemas.js  # Numberblocks-specific schemas
│           └── NumberblocksRoom.js # Numberblocks room implementation
├── public/                 # Static assets
└── node_modules/           # Node.js modules
```

## Communication Flow
1. **Initialization:**
   - Server starts and creates a game room
   - Client connects to server and joins the room
   - Server assigns a session ID and initializes player state
   - Client loads the appropriate game implementation

2. **Gameplay Loop:**
   - Client captures user inputs and sends movements that affect player character to server (movements, actions, etc.)
   - Server validates and processes inputs
   - Server updates game state
   - Server broadcasts updated state to all clients
   - Each client renders the updated game state based on its implementation

3. **Interactions:**
   - Client detects local collisions and sends interaction events to server
   - Server validates interaction and updates game state accordingly
   - Server broadcasts the updated state to all clients
   - Each client renders the interaction effects based on its implementation

## Modular Design Approach
The platform is designed with modularity in mind, allowing for different game implementations to share core functionality:

1. **Base Classes:**
   - Core Entity, Player, and NPC classes define common behavior
   - Implementation-specific classes extend these base classes

2. **Factory Pattern:**
   - EntityFactory creates appropriate entity instances based on entity type
   - New implementations register their entity types with the factory

3. **Dependency Injection:**
   - Core components are injected into implementation-specific classes
   - Allows implementations to focus on behavior rather than infrastructure

4. **Interface-Based Design:**
   - Clear interfaces define what implementations must provide
   - Core platform handles common functionality and lifecycle management

## Key Features
- **Triple View Modes:** 
  - First-person view with player model hidden
  - Third-person view with camera following player and aligning with player's facing direction
  - Free roam camera with independent movement and rotation, maintaining proper orientation
- **Camera Controls:**
  - Mouse wheel zoom for third-person view
  - Mouse-based rotation with proper Euler angle handling to prevent camera roll
  - View-specific movement and interaction behaviors
  - Seamless transitions between camera modes
- **Multiplayer Support:** Multiple players can join the same game world
- **Persistence:** Session reconnection support
- **Browser Tab Synchronization:** Automatically updates game state when inactive tabs become active
- **Entity Component System:** Flexible architecture for game entity management
- **Modular Implementation System:** Support for various game types and mechanics
- **Consistent Core Platform:** Shared functionality for all implementations

## Implementing New Games
To create a new game implementation:

1. Create a new directory under /client/js/implementations/
2. Extend the core Entity, Player, and NPC classes as needed
3. Create implementation-specific assets and behaviors
4. Register custom entity factories with the EntityFactory
5. Update the configuration to recognize the new game type

## Future Enhancements
- Plugin system for even more modular development
- Asset management system for efficient resource loading
- Enhanced visual effects and animations
- Mobile device support
- User accounts and progression tracking