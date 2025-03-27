# 3D AI Game Platform

A modular 3D multiplayer browser-based game platform with support for various game implementations.

## Project Structure

The project follows a modular architecture with core components separated from implementation-specific code:

```
/
├── client/                 # Client-side code
│   ├── css/                # Stylesheets
│   ├── js/                 # JavaScript code
│   │   ├── core/           # Core client components
│   │   │   ├── main.js     # Main entry point
│   │   │   ├── game-engine.js # Game engine
│   │   │   ├── controls.js # Input controls
│   │   │   └── ...         # Other core modules
│   │   └── implementations/ # Implementation-specific client code
│   │       └── ...         # Various game implementations
│   └── index.html          # Main HTML file
├── server/                 # Server-side code
│   ├── core/               # Core server components
│   │   ├── server.js       # Server entry point
│   │   ├── index.js        # Core server logic
│   │   ├── BaseRoom.js     # Base room implementation
│   │   └── schemas/        # Core data schemas
│   └── implementations/    # Implementation-specific server code
│       └── ...             # Various game implementations
└── package.json            # Node.js package configuration
```

## Getting Started

1. Install dependencies:
```
npm install
```

2. Start the server:
```
npm start
```

3. Open your browser to `http://localhost:3000`

## Core vs. Implementation

The codebase separates core functionality from implementation-specific code:

- **Core** components provide the underlying game platform features.
- **Implementations** build on the core to create specific games.

To create a new implementation, see the existing examples in the implementations directory.

## Modular Design

The platform follows a modular architecture that separates core functionality from game-specific implementations. This allows for:

- **Multiple Game Implementations**: Create different games using the same platform code
- **Code Reuse**: Share common functionality across implementations
- **Clean Separation**: Keep game-specific code isolated from platform code
- **Easy Extension**: Add new implementations without modifying core code

## Current Implementations

### Default Implementation

The default implementation provides a simple 3D environment with basic player movement and interaction capabilities.

- **Features**: Basic player models, 3D world interaction, multiplayer support
- **Objectives**: Exploration and player interaction

## Tech Stack

- **Front-End**: HTML5, CSS3, JavaScript (ES6+), Three.js
- **Back-End**: Node.js, Colyseus (WebSocket-based multiplayer framework)
- **Development Tools**: Git, Nodemon

## Adding New Implementations

To create a new game implementation:

1. Create a new directory under `/client/js/implementations/`
2. Create a new directory under `/server/implementations/`
3. Extend the core Entity, Player, and NPC classes for your game implementation
4. Create implementation-specific schemas on the server
5. Register your implementation with the entity factories

See the default implementation for an example.

## Camera Controls

- **WASD**: Move the player
- **Mouse**: Look around
- **V**: Toggle between first-person, third-person, and free roam views
- **Q/E**: Rotate player in third-person view
