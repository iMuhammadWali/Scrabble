import { Socket, Server } from "socket.io";
import { GameManager } from "../../GameManager";
import { poolPromise } from "../../database";

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

        GameManager.hosts.set(roomId, user.username); // Store the host username in the GameManager

        io.to(roomId).emit('roomCreated', { roomId: roomId.trim().toUpperCase(), host: user.username });
    });
  
    socket.on('joinRoom', (data) => {
        const user = socket.user;
        if (!user) return;

        // console.log(`User ${user.username} is trying to join room`, data);

        let { roomId } = data;
        roomId = roomId.trim().toLowerCase();
        if (!roomId) return;
        if (roomId.length != 6) return;
        if (!/^[a-zA-Z0-9]+$/.test(roomId)) return; // Check if roomId contains only alphanumeric characters

        // console.log(`User ${user.username} is trying to join room ${roomId}`);

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

        console.log(`User ${user.username} is trying to join room ${roomId}`);
        
        // Check if the user is already in the room
        const existingRoom = Array.from(socket.rooms).find((r) => r === roomId);

        if (existingRoom) {
            return socket.emit('alreadyInRoom', { message: 'You are already in the room' });
        }

        if (socket.rooms.size > 1) {
            socket.leave(Array.from(socket.rooms)[1]);
        }

        console.log(`User ${user.username} joined room ${roomId}`);

        socket.join(roomId);

        socket.emit('roomJoined', { roomId: roomId.trim().toUpperCase(), username: user.username });

        io.to(roomId).emit('playerList', {
            players: Array.from(io.sockets.adapter.rooms.get(roomId) || []).map((socketId) => {
                const inSocket = io.sockets.sockets.get(socketId);
                return {
                    id: socketId,
                    username: inSocket?.user?.username,
                    isHost: GameManager.hosts.get(roomId) === inSocket?.user?.username,
                };
            })
        });
    });

    socket.on('requestPlayerList', (data) => {
        const roomId = socket.rooms.size > 1 ? Array.from(socket.rooms)[1] : null;
        if (!roomId) return;

        const players = Array.from(io.sockets.adapter.rooms.get(roomId) || []).map((socketId) => {
            const inSocket = io.sockets.sockets.get(socketId);
            return {
                id: socketId,
                username: inSocket?.user?.username,
                isHost: GameManager.hosts.get(roomId) === inSocket?.user?.username,
            };
        });

        console.log(players);

        io.to(roomId).emit('playerList', { players });
    })


    socket.on('getFriends', async () => {
        const user = socket.user;
        if (!user) return;

        const pool = await poolPromise;

        const request = pool.request();
        request.input('id', user.id);
        const result = await request.query<
            {
                playerId: Number,
                username: String
            }
        >(`
            SELECT 
                P.playerId,
                P.username
            FROM FriendRequests FR
            JOIN Players P 
                ON (P.playerId = FR.senderId AND FR.receiverId = @id)
                OR (P.playerId = FR.receiverId AND FR.senderId = @id)
            WHERE 
                FR.requestStatus = 'Accepted';
        `);

        const friends = result.recordset
        .filter(friend => {
            const friendSocket = Array.from(io.sockets.sockets).find(([_, socket]) => {
                return socket.user?.id === friend.playerId;
            });
            return !!friendSocket; // Only keep if socket exists
        })
        .map(friend => ({
            id: friend.playerId,
            username: friend.username,
        }));

        // console.log(friends);

        socket.emit('friendsList', { friends });
        
    })

    socket.on('inviteFriend', async ({roomId, userId}) => {
        // Invite friend to join the room
        const user = socket.user;
        if (!user) return;

        const pool = await poolPromise;
        const request = pool.request();
        request.input('id', user?.id);
        request.input('friendId', userId);
        const result = await request.query<
            {
                playerId: Number,
                username: String
            }
        >(`
            SELECT * FROM FriendRequests
            WHERE 
                (senderId = @id AND receiverId = @friendId)
                OR (senderId = @friendId AND receiverId = @id)
                AND requestStatus = 'Accepted';
        `);
        const friends = result.recordset[0];
        if (!friends) {
            socket.emit('friendNotFound', { message: 'Friend not found' });
            return;
        }

        const friendSocket = Array.from(io.sockets.sockets).find(([_, socket]) => {
            return socket.user?.id === userId;
        });

        if (!friendSocket) {
            socket.emit('friendNotFound', { message: 'Friend not online' });
            return;
        }

        // console.log(friendSocket);

        // Send the invite to the friend
        friendSocket[1].emit('inviteReceived', {
            roomId: roomId,
            from: user.username,
        });
    })
}