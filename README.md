# 3D AI Game Platform

A modular 3D multiplayer browser-based game platform with support for various game implementations. The platform is built with Three.js for 3D rendering and Colyseus for multiplayer functionality.

## Modular Design

The platform follows a modular architecture that separates core functionality from game-specific implementations. This allows for:

- **Multiple Game Implementations**: Create different games using the same platform code
- **Code Reuse**: Share common functionality across implementations
- **Clean Separation**: Keep game-specific code isolated from platform code
- **Easy Extension**: Add new implementations without modifying core code

## Current Implementations

### Numberblocks

The first implementation is a mathematical building blocks game inspired by the Numberblocks educational show. Players control Numberblock characters and interact with operators (+, -) in a fun mathematical environment.

- **Features**: Dynamic number blocks, mathematical operators, player interaction
- **Objectives**: Various game modes including target number challenges and elimination

## Project Structure

```
Root
├── server.js                   # Main entry point
├── package.json
├── README.md
├── client                      # Client-side code
│   ├── index.html              # Main HTML file
│   ├── css/                    # CSS styles
│   └── js/                     # JavaScript files
│       ├── main.js             # Main loader
│       ├── core/               # Core platform code
│       │   ├── Entity.js       # Base entity class
│       │   ├── Player.js       # Base player class
│       │   ├── NPC.js          # Base NPC class
│       │   ├── controls.js     # Camera and movement controls
│       │   ├── collision.js    # Collision detection
│       │   ├── EntityFactory.js # Entity creation factory
│       │   ├── network-core.js # Network communication
│       │   └── player-ui.js    # UI components
│       ├── implementations/    # Game-specific implementations
│       │   └── numberblocks/   # Numberblocks implementation
│       │       ├── numberblock.js # Numberblock visual representation
│       │       ├── operator.js    # Mathematical operators
│       │       ├── NumberBlock.js # Numberblock entity
│       │       └── index.js       # Implementation loader
│       └── lib/                # Third-party libraries
└── server                      # Server-side code
    ├── index.js                # Server entry point
    ├── core/                   # Core server functionality
    │   └── BaseRoom.js         # Base room class
    ├── schemas/                # Schema definitions
    │   ├── BaseEntity.js       # Base entity schema
    │   ├── Player.js           # Player schema
    │   ├── InputState.js       # Input state schema
    │   └── GameState.js        # Game state schema
    └── implementations/        # Server-side implementations
        └── numberblocks/       # Numberblocks implementation
            ├── schemas.js      # Numberblocks-specific schemas
            ├── NumberblocksRoom.js # Numberblocks room implementation
            └── index.js        # Implementation exports
```

## Tech Stack

- **Front-End**: HTML5, CSS3, JavaScript (ES6+), Three.js
- **Back-End**: Node.js, Colyseus (WebSocket-based multiplayer framework)
- **Development Tools**: Git, Nodemon

## Getting Started

1. **Install dependencies**:
   ```
   npm install
   ```

2. **Start the server**:
   ```
   npm start
   ```

3. **Access the game**:
   Open your browser and navigate to `http://localhost:3000`

## Adding New Implementations

To create a new game implementation:

1. Create a new directory under `/client/js/implementations/`
2. Create a new directory under `/server/implementations/`
3. Extend the core Entity, Player, and NPC classes for your game implementation
4. Create implementation-specific schemas on the server
5. Register your implementation with the entity factories

See the Numberblocks implementation for an example.

## Camera Controls

- **WASD**: Move the player
- **Mouse**: Look around
- **V**: Toggle between first-person, third-person, and free roam views
- **Q/E**: Rotate player in third-person view
