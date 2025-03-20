# Development Rules and Notes

## Server Management

### Restarting the Numberblocks Server
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


## Three.js Implementation Notes

- Always include the Three.js library before your own JavaScript files in the HTML
- When testing, make sure to run a local HTTP server rather than opening the HTML file directly due to CORS restrictions with resource loading
- Use a thin BoxGeometry instead of PlaneGeometry for the ground to ensure proper lighting on both sides
- Always implement window resize handling for responsive design (update camera aspect ratio and renderer size)
- For better performance, set renderer.setPixelRatio to match the device's pixel ratio

## Browser API Considerations

- The Pointer Lock API (used by PointerLockControls) may not work in some environments, especially in embedded preview browsers or when served through certain proxies
- Always implement a fallback mechanism for critical browser APIs in case they fail
- Use try-catch blocks around browser API calls that might not be supported in all environments
- Check browser console for API-related errors when testing in different environments
- When implementing mouse controls:
  - Proper event listener management is essential (add/remove listeners appropriately)
  - Always provide visual feedback when controls are locked/unlocked
  - Ensure complete disengagement of controls when user presses ESC

## JavaScript Considerations

- When using event handlers, store references to them for proper removal later to prevent memory leaks
- For event-based systems (like controls), implement a proper event dispatcher mechanism
- Use class-based or module patterns for complex components to keep code organized
- When dealing with 3D rotations:
  - Separate axes of rotation (yaw, pitch, roll) to prevent gimbal lock issues
  - Always clamp vertical rotation (pitch) to prevent camera flipping

## Git Workflow

- Always update the progress.md file after completing each implementation step
- Keep commit messages descriptive and related to the implementation plan steps

## Project Structure

- Follow the architecture document precisely to ensure consistency
- New JavaScript files should be placed in the js/ directory and then linked in index.html as needed

## class structure
- keep classes modular - each class should have a single responsibility
- use classes to group related functionality
