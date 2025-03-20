const { Schema, type } = require("@colyseus/schema");

/**
 * Input state schema for player input
 */
class InputState extends Schema {
    constructor() {
        super();
        // Default initialization for input state
        this.keys = { w: false, a: false, s: false, d: false, space: false, q: false, e: false };
        this.mouseDelta = { x: 0, y: 0 };
        this.viewMode = "third-person"; // Default view mode - "first-person", "third-person", "free-roam"
        this.thirdPersonCameraAngle = 0; // Camera angle for third-person view
    }
}

// Register schema types
type("boolean")(InputState.prototype, "keys.w");
type("boolean")(InputState.prototype, "keys.a");
type("boolean")(InputState.prototype, "keys.s");
type("boolean")(InputState.prototype, "keys.d");
type("boolean")(InputState.prototype, "keys.space");
type("boolean")(InputState.prototype, "keys.q");
type("boolean")(InputState.prototype, "keys.e");
type("number")(InputState.prototype, "mouseDelta.x");
type("number")(InputState.prototype, "mouseDelta.y");
type("string")(InputState.prototype, "viewMode");
type("number")(InputState.prototype, "thirdPersonCameraAngle");

module.exports = { InputState }; 