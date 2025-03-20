const { BaseRoom } = require("../core/BaseRoom");

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
    }
    
    /**
     * Default implementation update logic
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
     */
    setupPlayer(player, client, options) {
        // No additional setup needed for default box player
        return player;
    }
}

module.exports = { DefaultRoom }; 