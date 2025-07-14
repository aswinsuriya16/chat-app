import { WebSocketServer,WebSocket } from "ws";
const wss = new WebSocketServer({
    port : 8080,
},()=>{
    console.log("Port on 8080")
});

let users:WebSocket[] = []
wss.on('connection',(socket)=>{
    console.log("User connected");
    users.push(socket);
    socket.on('message',(msg)=>{
        console.log(msg.toString());
        users.forEach((user)=>{
            user.send(msg.toString());
        })
    })

    socket.on("close",()=>{
        users = users.filter(user => user !== socket)
    })
})