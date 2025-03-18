import { Schema, MapSchema, defineTypes } from "https://unpkg.com/@colyseus/schema@1.1.2/dist/Schema.mjs";

// Player schema
export class Player extends Schema {
    constructor() {
        super();
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.value = 1;
        this.rotationY = 0;
        this.pitch = 0;
        this.operator = "";
        this.color = "#ff0000";
        this.name = "";
        this.velocityY = 0;
    }
}
defineTypes(Player, {
    x: "number",
    y: "number",
    z: "number",
    value: "number",
    rotationY: "number",
    pitch: "number",
    operator: "string",
    color: "string",
    name: "string",
    velocityY: "number"
});

// Operator schema
export class Operator extends Schema {
    constructor() {
        super();
        this.id = "";
        this.type = "";
        this.x = 0;
        this.y = 0;
        this.z = 0;
    }
}
defineTypes(Operator, {
    id: "string",
    type: "string",
    x: "number",
    y: "number",
    z: "number"
});

// StaticNumberblock schema
export class StaticNumberblock extends Schema {
    constructor() {
        super();
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.value = 1;
        this.color = "#ff0000";
    }
}
defineTypes(StaticNumberblock, {
    x: "number",
    y: "number",
    z: "number",
    value: "number",
    color: "string"
});

// GameState schema
export class GameState extends Schema {
    constructor() {
        super();
        this.players = new MapSchema();
        this.operators = new MapSchema();
        this.staticNumberblocks = new MapSchema();
    }
}
defineTypes(GameState, {
    players: { map: Player },
    operators: { map: Operator },
    staticNumberblocks: { map: StaticNumberblock }
});
