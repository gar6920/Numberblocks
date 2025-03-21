const { Schema, type, MapSchema } = require("@colyseus/schema");

/**
 * Implementation data schema
 * Replaces the generic object type with a properly typed schema
 * Uses a MapSchema to allow for dynamic key-value pairs
 */
class ImplementationDataSchema extends Schema {
    constructor() {
        super();
        // Using a MapSchema to store dynamic properties for implementation-specific data
        this.properties = new MapSchema();
        
        // Common implementation properties
        this.value = 1;   // Default value
        this.color = "";  // Color value as string
    }
}

// Register schema types
type({ map: "string" })(ImplementationDataSchema.prototype, "properties");
type("number")(ImplementationDataSchema.prototype, "value");
type("string")(ImplementationDataSchema.prototype, "color");

module.exports = { ImplementationDataSchema }; 