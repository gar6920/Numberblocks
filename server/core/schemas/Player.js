const { type, Schema } = require("@colyseus/schema");
const { BaseEntity } = require("./BaseEntity");
const { InputState } = require("./InputState");
const { ImplementationDataSchema } = require("./ImplementationDataSchema");

/**
 * Target position for RTS mode movement
 */
class MoveTarget extends Schema {
    constructor() {
        super();
        this.x = 0;
        this.z = 0;
    }
}

type("number")(MoveTarget.prototype, "x");
type("number")(MoveTarget.prototype, "z");

/**
 * Player schema for all player entities
 * Extends BaseEntity with player-specific properties
 */
class Player extends BaseEntity {
    constructor() {
        super();
        this.type = "player";      // Entity type
        this.name = "";            // Player name
        this.pitch = 0;            // Camera pitch (looking up/down)
        this.velocityY = 0;        // Vertical velocity (for physics)
        this.input = new InputState(); // Player input state
        this.moveTarget = new MoveTarget(); // Target position for RTS movement
        this.isRTSControlled = false; // Whether the player is currently being controlled by RTS commands
        
        // Implementation-specific properties can be added by subclasses
        this.implementationType = ""; // Type of implementation
        this.implementationData = new ImplementationDataSchema(); // Implementation-specific data
    }
}

// Register schema types - inherit from BaseEntity
type("string")(Player.prototype, "name");
type("number")(Player.prototype, "pitch");
type("number")(Player.prototype, "velocityY");
type(InputState)(Player.prototype, "input");
type(MoveTarget)(Player.prototype, "moveTarget");
type("boolean")(Player.prototype, "isRTSControlled");
type("string")(Player.prototype, "implementationType");
type(ImplementationDataSchema)(Player.prototype, "implementationData");

module.exports = { Player, MoveTarget }; 