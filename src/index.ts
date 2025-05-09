import { createServer } from 'http';

import express from 'express';

import { GameManager } from './GameManager';
import { initializeSocketIO } from './socket';

import dotenv from 'dotenv';
import { initApp } from './utils/initApp';
dotenv.config();


const app = express();

initApp(app);

const httpServer = createServer(app);
const gameManager = new GameManager();

initializeSocketIO(httpServer, gameManager);


const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log("Server is listening on port", PORT);
});