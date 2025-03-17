// Numberblocks game - Player UI module
// Handles player list UI and related functionality

// Update player list in UI
function updatePlayerListUI() {
    // Get player list container
    const playerList = document.getElementById('player-list');
    if (!playerList) {
        console.warn("Player list element not found");
        return;
    }
    
    try {
        // Clear current list
        playerList.innerHTML = '';
        
        // Add myself first
        if (room && room.state && room.state.players) {
            const myPlayer = room.state.players.get(room.sessionId);
            if (myPlayer) {
                addPlayerToList(myPlayer, room.sessionId, true);
            }
        }
        
        // Add other players
        let playerCount = 1; // Start with 1 for myself
        
        // Check if other players object exists
        if (window.otherPlayers) {
            // Count active players
            const activePlayers = Object.keys(window.otherPlayers).filter(sessionId => {
                const player = window.otherPlayers[sessionId];
                return player && (!player.active || player.active);
            });
            
            playerCount += activePlayers.length;
            
            // Loop through other players and add to list
            for (const sessionId in window.otherPlayers) {
                const player = window.otherPlayers[sessionId];
                
                // Skip inactive players
                if (player.active === false) continue;
                
                // Add to UI
                addPlayerToList(player, sessionId, false);
            }
        }
        
        // Update player count in UI
        const playerCountElement = document.getElementById('player-count');
        if (playerCountElement) {
            playerCountElement.textContent = `(${playerCount})`;
        }
        
        // Set list max height based on number of players
        playerList.style.maxHeight = `${Math.min(playerCount * 25, 150)}px`;
    } catch (error) {
        console.error("Error updating player list UI:", error);
    }
}

// Helper function to add a player to the list UI
function addPlayerToList(player, sessionId, isCurrentPlayer) {
    if (!player) return;
    
    try {
        // Get player list element
        const playerList = document.getElementById('player-list');
        if (!playerList) return;
        
        // Create player entry
        const playerEntry = document.createElement('div');
        playerEntry.className = 'player-entry';
        playerEntry.id = `player-${sessionId}`;
        
        // Add highlighting for current player
        if (isCurrentPlayer) {
            playerEntry.style.fontWeight = 'bold';
            playerEntry.style.backgroundColor = 'rgba(255,255,255,0.2)';
        }
        
        // Create color indicator
        const colorIndicator = document.createElement('div');
        colorIndicator.className = 'player-color';
        colorIndicator.style.backgroundColor = player.color || '#FFFFFF';
        
        // Create player info
        const playerInfo = document.createElement('div');
        playerInfo.className = 'player-info';
        
        // Format player name with value
        const playerName = player.name || `Player ${sessionId.substring(0, 4)}`;
        const playerValue = player.value || 1;
        playerInfo.textContent = `${playerName} (${playerValue})`;
        
        // Build entry
        playerEntry.appendChild(colorIndicator);
        playerEntry.appendChild(playerInfo);
        playerList.appendChild(playerEntry);
    } catch (error) {
        console.error("Error adding player to UI list:", error);
    }
}

// Set up key event listeners for player list toggle
function setupPlayerListKeyControls() {
    // Toggle player list on 'Tab' key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Tab') {
            event.preventDefault(); // Prevent default tab behavior
            togglePlayerList();
        }
    });
    
    // Set up click listener for header
    const playerListHeader = document.getElementById('player-list-header');
    if (playerListHeader) {
        playerListHeader.addEventListener('click', togglePlayerList);
    }
}

// Function to toggle player list visibility
function togglePlayerList() {
    const playerList = document.getElementById('player-list');
    const collapseIcon = document.getElementById('collapse-icon');
    
    if (!playerList || !collapseIcon) return;
    
    // Check current state
    const isCollapsed = playerList.style.display === 'none';
    
    // Toggle display
    playerList.style.display = isCollapsed ? 'block' : 'none';
    
    // Update icon
    collapseIcon.textContent = isCollapsed ? '▼' : '▶';
    
    // Save state in localStorage
    localStorage.setItem('playerListCollapsed', !isCollapsed);
}

// Initialize player list state from saved preference
function initPlayerListState() {
    try {
        // Get saved state
        const isCollapsed = localStorage.getItem('playerListCollapsed') === 'true';
        
        // Get elements
        const playerList = document.getElementById('player-list');
        const collapseIcon = document.getElementById('collapse-icon');
        
        if (playerList && collapseIcon) {
            // Set initial state
            playerList.style.display = isCollapsed ? 'none' : 'block';
            collapseIcon.textContent = isCollapsed ? '▶' : '▼';
        }
    } catch (error) {
        console.warn("Error initializing player list state:", error);
    }
}

// Make functions available globally
window.updatePlayerListUI = updatePlayerListUI;
window.addPlayerToList = addPlayerToList;
window.setupPlayerListKeyControls = setupPlayerListKeyControls;
window.togglePlayerList = togglePlayerList;
window.initPlayerListState = initPlayerListState;

// Initialize player list when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initPlayerListState();
    setupPlayerListKeyControls();
});
