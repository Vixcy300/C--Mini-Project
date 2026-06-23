import { WebSocketServer } from 'ws';

const port = process.env.PORT || 8080;
const wss = new WebSocketServer({ port });

// Map of roomCode -> Set of clients { id, ws, username, payload }
const rooms = new Map();

console.log(`[QUIZ SERVER] WebSocket server running on port ${port}`);

wss.on('connection', (ws) => {
  let clientRoom = null;
  let clientUsername = null;
  const clientId = Math.random().toString(36).substring(2, 9);

  ws.on('message', (message) => {
    try {
      // Security Check 1: Limit incoming packet size to prevent memory bloating / crash vectors (max 4KB)
      if (message.length > 4096) {
        console.warn(`[SECURITY WARNING] Packet size limit exceeded (${message.length} bytes). Terminating socket.`);
        ws.close();
        return;
      }

      const data = JSON.parse(message.toString());
      const { type, code, sender, payload } = data;

      // Security Check 2: Sanitize room codes and sender nicknames
      const cleanCode = code ? String(code).replace(/[^0-9]/g, '').slice(0, 6) : null;
      const cleanSender = sender ? String(sender).replace(/[^a-zA-Z0-9_]/g, '').slice(0, 15) : null;

      if (!cleanCode || !cleanSender) return;

      // Update data with sanitized inputs
      data.code = cleanCode;
      data.sender = cleanSender;

      switch (type) {
        case 'JOIN_LOBBY':
          clientRoom = cleanCode;
          clientUsername = cleanSender;
          
          if (!rooms.has(cleanCode)) {
            rooms.set(cleanCode, new Set());
          }
          
          const roomSet = rooms.get(cleanCode);
          roomSet.add({ id: clientId, ws, username: cleanSender, payload });
          
          console.log(`[LOBBY] Player ${cleanSender} (${clientId}) joined Room ${cleanCode}. Active players: ${roomSet.size}`);
          
          // Relay JOIN message to all other players in the room
          broadcastToRoom(cleanCode, data, clientId);
          break;

        case 'SYNC_LOBBY_STATE':
        case 'PLAYER_STATE_UPDATE':
        case 'START_GAME':
          // Relay message to all other clients in the room
          broadcastToRoom(cleanCode, data, clientId);
          break;

        case 'PLAYER_LEAVE':
          handleClientExit();
          break;

        default:
          break;
      }
    } catch (err) {
      console.error('[ERROR] Error processing message:', err);
    }
  });

  ws.on('close', () => {
    handleClientExit();
  });

  const handleClientExit = () => {
    if (!clientRoom) return;

    const roomSet = rooms.get(clientRoom);
    if (roomSet) {
      // Find the player object
      let playerObj = null;
      for (const p of roomSet) {
        if (p.id === clientId) {
          playerObj = p;
          break;
        }
      }

      if (playerObj) {
        roomSet.delete(playerObj);
        console.log(`[EXIT] Player ${clientUsername} left Room ${clientRoom}. Active players remaining: ${roomSet.size}`);
        
        // Broadcast leave message to others
        broadcastToRoom(clientRoom, {
          type: 'PLAYER_LEAVE',
          code: clientRoom,
          sender: clientUsername
        }, clientId);
      }

      // If room is empty, delete it
      if (roomSet.size === 0) {
        rooms.delete(clientRoom);
        console.log(`[CLEANUP] Room ${clientRoom} is empty and has been removed.`);
      }
    }
    clientRoom = null;
    clientUsername = null;
  };

  const broadcastToRoom = (roomCode, msgData, senderId) => {
    const roomSet = rooms.get(roomCode);
    if (!roomSet) return;

    const jsonStr = JSON.stringify(msgData);
    for (const client of roomSet) {
      if (client.id !== senderId && client.ws.readyState === 1) { // 1 means OPEN
        client.ws.send(jsonStr);
      }
    }
  };
});
