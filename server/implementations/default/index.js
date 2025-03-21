/**
 * Default Implementation
 * A simple implementation with basic box players
 */

const { DefaultRoom } = require("../../core/schemas/DefaultRoom");

// Default implementation information
const implementation = {
    name: "default",
    description: "A simple implementation with basic box players",
    roomType: "default"
};

module.exports = {
    implementation,
    DefaultRoom
}; 