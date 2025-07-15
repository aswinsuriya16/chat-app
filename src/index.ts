import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({ port: 8080 }, () => {
  console.log("Server running on port 8080");
});

const socketToName = new Map<WebSocket ,string>();
const socketToRoom = new Map<WebSocket,string>();
const roomToSockets = new Map<string,Set<WebSocket>>();

interface JoinMessage {
    type : "join";
    payload : {
        roomId : string;
        anonymousName : string
    }
}

interface ChatMessage {
    type : "chat";
    payload : {
        message : string
    }
}

type ClientMessage = JoinMessage | ChatMessage;

function safeJsonParse(data: string): ClientMessage | null {
  try {
    return JSON.parse(data) as ClientMessage;
  } catch (error) {
    console.error("Invalid JSON received:", error);
    return null;
  }
}

function validateMessage(parsed: any): parsed is ClientMessage {
  if (!parsed || typeof parsed !== 'object') return false;
  
  if (parsed.type === "join") {
    return parsed.payload?.roomId && parsed.payload?.anonymousName;
  }
  
  if (parsed.type === "chat") {
    return parsed.payload?.message;
  }
  
  return false;
}

wss.on("connection", (socket) => {
  console.log("User connected");

  socket.on("message", (msg) => {
    const parsed = safeJsonParse(msg.toString());
    if(!parsed || !validateMessage(parsed)) {
        return socket.send(JSON.stringify({
            type : "Error",
            message : "Invalid JSON format"
        }))
    }

    if (parsed.type === "join") {
      const roomId = parsed.payload.roomId;
      const anonymousName = parsed.payload.anonymousName;
      socketToRoom.set(socket, roomId);
      socketToName.set(socket,anonymousName);
      if (!roomToSockets.has(roomId)) {
        roomToSockets.set(roomId, new Set());
      }
      // '!' tells ts that get method wont be undefined
      roomToSockets.get(roomId)!.add(socket);
      console.log("User joined room " + roomId);
    }

    if (parsed.type === "chat") {
      const roomId = socketToRoom.get(socket);
      if (!roomId) return;
      const anonymousName = socketToName.get(socket);
      if(!anonymousName) return;
      const socketsInRoom = roomToSockets.get(roomId);
      if (!socketsInRoom) return;

      for (const s of socketsInRoom) {
        if (s.readyState === WebSocket.OPEN) {
          s.send(JSON.stringify({
            msg : parsed.payload.message,
            name : anonymousName
          }))
        }
      }
      console.log(`Message sent to room ${roomId} from ${anonymousName}`, parsed.payload.message);
    }
  });

  socket.on("close", () => {
    const roomId = socketToRoom.get(socket);
    if (!roomId) return;

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
