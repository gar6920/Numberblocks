// 3D AI Game Platform - Player UI module
// Handles player list UI and related functionality

class PlayerUI {
    constructor() {
        this.initialized = false;
    }
    
    // Initialize the player UI
    init() {
        if (this.initialized) return;
        
        this.initPlayerListState();
        this.setupPlayerListKeyControls();
        this.initialized = true;
    }
    
    // Update player list in UI
    updatePlayerListUI() {
        // Get player list container
        const playerList = document.getElementById('player-list');
        if (!playerList) {
            console.warn("Player list element not found");
            this.createPlayerListUI(); // Create if missing
            return;
        }
        
        try {
            // Clear current list
            playerList.innerHTML = '';
            
            let playerCount = 0;
            
            // Add myself first if available
            if (window.room && window.room.state && window.room.state.players) {
                try {
                    const mySessionId = window.room.sessionId;
                    let myPlayer = null;
                    
                    // Try different methods to get the player data
                    if (typeof window.room.state.players.get === 'function') {
                        myPlayer = window.room.state.players.get(mySessionId);
                    } else if (window.room.state.players[mySessionId]) {
                        myPlayer = window.room.state.players[mySessionId];
                    }
                    
                    if (myPlayer) {
                        this.addPlayerToList(myPlayer, mySessionId, true);
                        playerCount++;
                    } else if (window.playerNumberblock) {
                        // Fallback to using the player's numberblock object
                        const fallbackPlayer = {
                            name: "Me",
                            value: window.playerNumberblock.value || 1,
                            color: window.playerNumberblock.color || "#FFFF00"
                        };
                        this.addPlayerToList(fallbackPlayer, mySessionId, true);
                        playerCount++;
                    }
                    
                    // Log for debugging
                    console.log("Added local player to list. Players map size:", window.room.state.players.size);
                    
                    // Add other players - directly iterate over the Schema MapSchema
                    window.room.state.players.forEach((player, sessionId) => {
                        if (sessionId !== mySessionId) {
                            this.addPlayerToList(player, sessionId, false);
                            playerCount++;
                            console.log("Added remote player to list:", sessionId, player);
                        }
                    });
                } catch (e) {
                    console.error("Error iterating through players:", e);
                }
            }
            
            // Update player count in UI
            const playerCountElement = document.getElementById('player-count');
            if (playerCountElement) {
                playerCountElement.textContent = `(${playerCount})`;
            }
        } catch (error) {
            console.error("Error updating player list UI:", error);
        }
    }

    // Helper function to add a player to the list UI
    addPlayerToList(player, sessionId, isCurrentPlayer) {
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
    setupPlayerListKeyControls() {
        // Toggle player list on 'Tab' key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Tab') {
                event.preventDefault(); // Prevent default tab behavior
                this.togglePlayerList();
            }
        });
        
        // Set up click listener for header
        const playerListHeader = document.getElementById('player-list-header');
        if (playerListHeader) {
            playerListHeader.addEventListener('click', () => this.togglePlayerList());
        }
    }

    // Function to toggle player list visibility
    togglePlayerList() {
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
    initPlayerListState() {
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
    
    // Create the player list UI elements if they don't exist
    createPlayerListUI() {
        // Check if player list UI already exists
        if (document.getElementById('player-list-container')) {
            return;
        }
        
        // Create container
        const container = document.createElement('div');
        container.id = 'player-list-container';
        container.className = 'ui-panel';
        
        // Create header
        const header = document.createElement('div');
        header.id = 'player-list-header';
        header.className = 'ui-panel-header';
        header.innerHTML = '<span id="collapse-icon">▼</span> Players <span id="player-count">(0)</span>';
        
        // Create list
        const list = document.createElement('div');
        list.id = 'player-list';
        list.className = 'ui-panel-content';
        
        // Build UI
        container.appendChild(header);
        container.appendChild(list);
        
        // Add to document
        document.body.appendChild(container);
        
        // Initialize state
        this.initPlayerListState();
    }
}

// Create and export a singleton instance
const playerUI = new PlayerUI();

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.PlayerUI = PlayerUI;
    window.playerUI = playerUI;
    
    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        playerUI.init();
    });
}

if (typeof module !== 'undefined') {
    module.exports = { PlayerUI, playerUI };
} 