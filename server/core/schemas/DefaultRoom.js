const { BaseRoom } = require("../BaseRoom");

/**
 * Default Room
 * Basic implementation with box players
 */
class DefaultRoom extends BaseRoom {
    /**
     * Initialize the default room implementation
     * @param {Object} options Room creation options
     */
    initializeImplementation(options) {
        console.log("Default room implementation initialized");
        
        // Update game config
        this.state.gameConfig.implementation = "default";
        
        // Everything else is handled by BaseRoom
    }
    
    /**
     * Default implementation update logic is not needed
     * BaseRoom handles all necessary functionality
     * @param {number} deltaTime Time since last update
     */
    implementationUpdate(deltaTime) {
        // Nothing to do in the default implementation
    }
    
    /**
     * Default player setup - just basic box
     * @param {Player} player The player object
     * @param {Client} client The client that joined
     * @param {Object} options Join options
     * @returns {Player} The player object
     */
    setupPlayer(player, client, options) {
        // Set player name
        player.name = options.name || client.sessionId;
        
        // Set a default color
        player.color = "#" + Math.floor(Math.random()*16777215).toString(16);
        
        return player;
    }
}

module.exports = { DefaultRoom }; 