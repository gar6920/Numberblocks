# Development Rules and Notes

## Server Management

### Restarting the Game Server
When testing changes, you'll need to properly stop and restart the Node.js server:

# STEP 1: Kill all Node.js processes (safer and more reliable method)
taskkill /F /IM node.exe

# STEP 2: Start the server using npm
npm start

> NOTE: The previous method using `Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force` 
> has been found to be unreliable and may cause issues.

### Directory Creation
- When creating multiple directories at once with PowerShell's `mkdir` command, you must use quotes when specifying paths with spaces or multiple directories:
  ```
  # INCORRECT (will fail):
  mkdir css js assets assets\images assets\models assets\sounds
  
  # CORRECT (individual commands):
  mkdir css
  mkdir js
  mkdir assets
  mkdir "assets\images"
  mkdir "assets\models"
  mkdir "assets\sounds"
  ```

- PowerShell's `mkdir` doesn't support multiple directory arguments like in Linux/macOS. Create directories one by one or use a loop.

## Project Structure

### Core vs. Implementation
- All core components must be kept in their respective core directories:
  - Server core: `/server/core/`
  - Client core: `/client/js/core/`
- Implementation-specific code must be in the implementations directories:
  - Server implementations: `/server/implementations/`
  - Client implementations: `/client/js/implementations/`

### Core Components Location
- The main server entry point must be in `/server/core/server.js`
- The main client entry point must be in `/client/js/core/main.js`
- All schema definitions must be in `/server/core/schemas/`
- Core room implementations must be in `/server/core/` (e.g., BaseRoom.js)

### Schema Organization
- All schemas (including implementation-specific ones) should properly extend the base schemas
- Core schemas must be in `/server/core/schemas/`
- Implementation-specific schemas should be in their respective implementation directory
- Never create schemas outside of these designated locations

## Implementation Guidelines

### Modular Design Principles
- Keep core platform code separate from specific game implementations
- Use interfaces and base classes for common functionality
- Create extension points for game-specific features
- Implement factory patterns for creating game-specific entities
- Core code must remain implementation-agnostic

### Implementation-Agnostic Code
- Core code must never refer to specific implementations by name
- Use generic terms in core code (e.g., "player" instead of specific implementation names)
- Always provide generic interfaces that implementations can extend
- Implementations should identify themselves via their "implementationType" property

### Three.js Implementation Notes

- Always include the Three.js library before your own JavaScript files in the HTML
- When testing, make sure to run a local HTTP server rather than opening the HTML file directly due to CORS restrictions with resource loading
- Use a thin BoxGeometry instead of PlaneGeometry for the ground to ensure proper lighting on both sides
- Always implement window resize handling for responsive design (update camera aspect ratio and renderer size)
- For better performance, set renderer.setPixelRatio to match the device's pixel ratio

### Browser API Considerations

- The Pointer Lock API (used by PointerLockControls) may not work in some environments, especially in embedded preview browsers or when served through certain proxies
- Always implement a fallback mechanism for critical browser APIs in case they fail
- Use try-catch blocks around browser API calls that might not be supported in all environments
- Check browser console for API-related errors when testing in different environments
- When implementing mouse controls:
  - Proper event listener management is essential (add/remove listeners appropriately)
  - Always provide visual feedback when controls are locked/unlocked
  - Ensure complete disengagement of controls when user presses ESC

### JavaScript Best Practices

- When using event handlers, store references to them for proper removal later to prevent memory leaks
- For event-based systems (like controls), implement a proper event dispatcher mechanism
- Use class-based or module patterns for complex components to keep code organized
- When dealing with 3D rotations:
  - Separate axes of rotation (yaw, pitch, roll) to prevent gimbal lock issues
  - Always clamp vertical rotation (pitch) to prevent camera flipping

### Game Implementation Guidelines
- Each game implementation should be contained in its own directory
- Game-specific logic should extend the core platform classes
- Assets specific to a game implementation should be in their own directory
- Implement the required interfaces for entity creation and behavior

## Git Workflow

- Always update documentation when making significant changes
- Keep commit messages descriptive and related to implementation changes
- Use feature branches for new game implementations or major features

## Adding New Game Implementations
- Create both client-side and server-side implementation directories
- Extend core classes for your implementation needs
- Register your implementation components with the appropriate factories
- Follow the structure established by existing implementations
- Ensure full implementation-agnostic separation between core and implementation code

## Modules Loading
- Client modules must follow the pattern established in main.js for proper loading order
- Core modules must be loaded before implementation-specific modules
- Use proper dependency management to avoid circular references

## 4-Player Local Multiplayer Setup
- The 4-player setup consists of two key files: `four_player_setup.html` and `open_4player_direct.bat`
- **Do not delete** these files as they are essential for the 4-player functionality
- When making changes that affect the client interface, test with the 4-player setup to ensure compatibility
- The 4-player setup requires Chrome to be installed on the system

### Running the 4-Player Setup
- Use the `open_4player_direct.bat` script to launch the 4-player setup
- The script automatically opens Chrome in app mode with the required HTML file
- Press F11 in the browser for fullscreen mode
- Ensure the game server is running at http://localhost:3000 before launching

### Modifying the 4-Player Setup
- If you need to modify the layout, edit the CSS grid properties in `four_player_setup.html`
- The default setup is a 2×2 grid with minimal spacing between the viewports
- Each viewport is an iframe that loads the game client independently
- Changes to the main client should automatically reflect in all viewports

## Always follow the architecture.md - if there is any discrepancy then stop and bring it to my attention