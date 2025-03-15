# Development Rules and Notes

## PowerShell Command Issues

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

## Git Workflow

- Always update the progress.md file after completing each implementation step
- Keep commit messages descriptive and related to the implementation plan steps

## Project Structure

- Follow the architecture document precisely to ensure consistency
- New JavaScript files should be placed in the js/ directory and then linked in index.html as needed