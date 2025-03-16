# Numberblocks Game - Tech Stack

## Front-End
- **HTML5:** Provides the structure for the game, including the canvas element for 3D rendering and UI components like the heads-up display (HUD) and menus.

- **CSS3:** Styles the UI elements, such as the HUD, player stats, and overlays, ensuring they look polished and are positioned correctly over the game canvas.

- **JavaScript (ES6+):** Drives the client-side game logic, handling player input, visual rendering, and network communication.

- **Three.js:** A JavaScript library that simplifies WebGL for 3D rendering, used to create the game world, dynamic Numberblock models, and environmental elements.

- **Web Audio API:** Manages audio, including sound effects for actions like bumping into players or collecting operators, and background music.

## Back-End
- **Node.js:** Server-side JavaScript runtime that hosts the game server, manages player connections, and maintains the authoritative game state.

- **Colyseus:** Framework for multiplayer game server development that handles room-based multiplayer, state synchronization, and client message processing.

- **Colyseus Schema:** Provides efficient state synchronization between server and clients with binary encoding and delta updates.

## Networking
- **WebSockets:** Underlying protocol for real-time bidirectional communication between clients and server.

- **Client-Server Architecture:** Maintains authoritative game state on the server to prevent cheating and ensure consistent gameplay.

- **Room-Based Multiplayer:** Organizes players into game rooms with shared state and scoped communication.

## Development Tools
- **Git:** Version control system to track changes and manage the project's codebase.

- **npm:** Package manager for JavaScript, used to manage dependencies and run scripts.

- **Nodemon:** Development utility that monitors server.js changes and automatically restarts the server during development.

- **ESLint:** JavaScript linter that helps maintain code quality and consistency.

## Project Organization
- **Client-Server Separation:** Distinct code organization with `/client` directory for front-end and root-level server code.

- **Modular Design:** Separate JavaScript modules for different game systems (networking, rendering, game logic).

- **Build Process:** Custom scripts to compile and bundle client code for production deployment.

## Deployment
- **Node.js Hosting:** Server deployed on Node.js compatible hosting platforms (e.g., Heroku, AWS, DigitalOcean).

- **Static Asset Serving:** Client-side assets (HTML, CSS, JS) served by the Node.js server.

## Why This Stack?

- **Three.js:** Provides powerful 3D rendering capabilities with a manageable learning curve, ideal for creating the Numberblock characters and interactive 3D environment.

- **Colyseus:** Purpose-built for multiplayer games with efficient state synchronization and room management, simplifying networked gameplay implementation.

- **Client-Server Model:** Ensures fair gameplay by maintaining authoritative state on the server, preventing client-side cheating.

- **Node.js:** Enables JavaScript throughout the stack, reducing context switching and allowing code sharing between client and server when appropriate.

This tech stack supports all core gameplay mechanics of Numberblocks, including the dynamic character models, mathematical interactions, and multiplayer functionality, while providing a solid foundation for future enhancements.
