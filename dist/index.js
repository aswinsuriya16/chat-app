"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const wss = new ws_1.WebSocketServer({
    port: 8080, host: "0.0.0.0"
}, () => {
    console.log("Port on 8080");
});
let userCount = 0;
let users = [];
wss.on('connection', (socket) => {
    console.log("User connected #" + userCount);
    userCount += 1;
    users.push(socket);
    socket.on('message', (msg) => {
        console.log(msg.toString());
        users.forEach((user) => {
            user.send(msg.toString());
        });
    });
});
wss.off('connection', () => {
    console.log("Disconnected");
});
