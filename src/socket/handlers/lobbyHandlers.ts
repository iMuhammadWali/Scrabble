import { Socket, Server } from "socket.io";
import { GameManager } from "../../GameManager";

function generateRandomString(length: number): string {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

export function registerLobbyHandlers(io: Server, socket: Socket) {
    socket.on('createRoom', (data) => {
        const user = socket.user;
        if (!user) return;

        if (socket.rooms.size > 1) {
            socket.leave(Array.from(socket.rooms)[1]);
        }
    
        const roomId = generateRandomString(6).trim().toLowerCase();
        socket.join(roomId);

        console.log("Rooms: ", io.sockets.adapter.rooms);

        io.to(roomId).emit('roomCreated', { roomId: roomId.trim().toUpperCase(), host: user.username });
    });
  
    socket.on('joinRoom', (data) => {

        const user = socket.user;
        if (!user) return;

        if (!data) return;
        data = JSON.parse(data);

        let { roomId } = data;
        roomId = roomId.trim().toLowerCase();
        if (!roomId) return;
        if (roomId.length != 6) return;
        if (!/^[a-zA-Z0-9]+$/.test(roomId)) return; // Check if roomId contains only alphanumeric characters

        // Check if roomId has any players
        const room = io.of('/').adapter.rooms.get(roomId);
        if (!room) {
            socket.emit('roomNotFound', { message: 'Room not found' });
            return;
        }
        if (room.size >= 4) {
            socket.emit('roomFull', { message: 'Room is full' });
            return;
        }
        
        // Check if the user is already in the room
        const existingRoom = Array.from(socket.rooms).find((r) => r !== socket.id);
        if (existingRoom) {
            return socket.emit('alreadyInRoom', { message: 'You are already in a room' });
        }

        if (socket.rooms.size > 1) {
            socket.leave(Array.from(socket.rooms)[1]);
        }

        socket.join(roomId);

        socket.emit('roomJoined', { roomId: roomId.trim().toUpperCase(), username: user.username });

        io.to(roomId).emit('playerList', {
            players: Array.from(io.sockets.adapter.rooms.get(roomId) || []).map((socketId) => {
                const inSocket = io.sockets.sockets.get(socketId);
                return {
                    id: socketId,
                    username: inSocket?.user?.username,
                    isHost: socketId != socket?.id,
                };
            })
        });
    });

    socket.on('requestServerPlayersList', (data) => {
        const roomId = socket.rooms.size > 1 ? Array.from(socket.rooms)[1] : null;
        if (!roomId) return;

        const players = Array.from(io.sockets.adapter.rooms.get(roomId) || []).map((socketId) => {
            const socket = io.sockets.sockets.get(socketId);
            return {
                id: socketId,
                username: socket?.user?.username,
                isHost: socketId === socket?.id,
            };
        });

        console.log('Players in room:', players);
        io.to(roomId).emit('serverPlayersList', { players });
    })
}