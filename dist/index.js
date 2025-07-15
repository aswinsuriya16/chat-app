"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const wss = new ws_1.WebSocketServer({ port: 8080 }, () => {
    console.log("Server running on port 8080");
});
const socketToName = new Map();
const socketToRoom = new Map();
const roomToSockets = new Map();
function safeJsonParse(data) {
    try {
        return JSON.parse(data);
    }
    catch (error) {
        console.error("Invalid JSON received:", error);
        return null;
    }
}
function validateMessage(parsed) {
    var _a, _b, _c;
    if (!parsed || typeof parsed !== 'object')
        return false;
    if (parsed.type === "join") {
        return ((_a = parsed.payload) === null || _a === void 0 ? void 0 : _a.roomId) && ((_b = parsed.payload) === null || _b === void 0 ? void 0 : _b.anonymousName);
    }
    if (parsed.type === "chat") {
        return (_c = parsed.payload) === null || _c === void 0 ? void 0 : _c.message;
    }
    return false;
}
wss.on("connection", (socket) => {
    console.log("User connected");
    socket.on("message", (msg) => {
        const parsed = safeJsonParse(msg.toString());
        if (!parsed || !validateMessage(parsed)) {
            return socket.send(JSON.stringify({
                type: "Error",
                message: "Invalid JSON format"
            }));
        }
        if (parsed.type === "join") {
            const roomId = parsed.payload.roomId;
            const anonymousName = parsed.payload.anonymousName;
            socketToRoom.set(socket, roomId);
            socketToName.set(socket, anonymousName);
            if (!roomToSockets.has(roomId)) {
                roomToSockets.set(roomId, new Set());
            }
            // '!' tells ts that get method wont be undefined
            roomToSockets.get(roomId).add(socket);
            console.log("User joined room " + roomId);
        }
        if (parsed.type === "chat") {
            const roomId = socketToRoom.get(socket);
            if (!roomId)
                return;
            const anonymousName = socketToName.get(socket);
            if (!anonymousName)
                return;
            const socketsInRoom = roomToSockets.get(roomId);
            if (!socketsInRoom)
                return;
            for (const s of socketsInRoom) {
                if (s.readyState === ws_1.WebSocket.OPEN) {
                    s.send(JSON.stringify({
                        msg: parsed.payload.message,
                        name: anonymousName
                    }));
                }
            }
            console.log(`Message sent to room ${roomId} from ${anonymousName}`, parsed.payload.message);
        }
    });
    socket.on("close", () => {
        const roomId = socketToRoom.get(socket);
        if (!roomId)
            return;
        socketToRoom.delete(socket);
        const roomSockets = roomToSockets.get(roomId);
        if (roomSockets) {
            roomSockets.delete(socket);
            if (roomSockets.size === 0) {
                roomToSockets.delete(roomId);
            }
        }
        console.log(`User disconnected from room ${roomId}`);
    });
});
