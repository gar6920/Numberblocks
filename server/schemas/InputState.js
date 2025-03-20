const { Schema, type } = require("@colyseus/schema");

/**
 * Input state schema for player input
 */
class InputState extends Schema {
    constructor() {
        super();
        // Initialize keys as a KeysSchema instance, not a plain object
        this.keys = new KeysSchema();
        this.mouseDelta = new MouseDeltaSchema();
        this.viewMode = "third-person"; // Default view mode - "first-person", "third-person", "free-roam"
        this.thirdPersonCameraAngle = 0; // Camera angle for third-person view
    }
}

// Define nested schemas for proper serialization
class KeysSchema extends Schema {
    constructor() {
        super();
        this.w = false;
        this.a = false;
        this.s = false;
        this.d = false;
        this.space = false;
        this.q = false;
        this.e = false;
        this.shift = false;
    }
}

class MouseDeltaSchema extends Schema {
    constructor() {
        super();
        this.x = 0;
        this.y = 0;
    }
}

// Register schema types for nested schemas
type("boolean")(KeysSchema.prototype, "w");
type("boolean")(KeysSchema.prototype, "a");
type("boolean")(KeysSchema.prototype, "s");
type("boolean")(KeysSchema.prototype, "d");
type("boolean")(KeysSchema.prototype, "space");
type("boolean")(KeysSchema.prototype, "q");
type("boolean")(KeysSchema.prototype, "e");
type("boolean")(KeysSchema.prototype, "shift");

type("number")(MouseDeltaSchema.prototype, "x");
type("number")(MouseDeltaSchema.prototype, "y");

// Register the schema types for InputState
type(KeysSchema)(InputState.prototype, "keys");
type(MouseDeltaSchema)(InputState.prototype, "mouseDelta");
type("string")(InputState.prototype, "viewMode");
type("number")(InputState.prototype, "thirdPersonCameraAngle");

module.exports = { InputState, KeysSchema, MouseDeltaSchema }; 