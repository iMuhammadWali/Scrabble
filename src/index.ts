import express, { Application, NextFunction, Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { GameManager } from './GameManager';
import userRouter from './routes/userRoutes';

dotenv.config();

// Things to do in this file:
// 1. To convert this into a complete ts file.

const JWT_SECRET_KEY:string = process.env.JWT || "A_LOT_OF_PEACE";
// I should probably make this function somewhere else.
async function verifyJWT(req: Request, res: Response, next: NextFunction): Promise<void> {
    // How does a request with jwt look like: 
    // method: "GET",
    // headers: {
    //     "Authorization": `Bearer ${token}`
    // }

    const jwtHeader: string | null = req.headers.authorization || null;
    if (!jwtHeader || !jwtHeader.startsWith("Bearer")) {
        res.status(500).json({ "message": "Request dont have json" });
        // We probably dont need to go the next middleware of this route? if the request does not have jwt.
                // next();
        return;
    }

    const jwtToken: string = jwtHeader.split(" ")[1];

    jwt.verify(jwtToken, JWT_SECRET_KEY, (err, decodedResult) => {
        if (err){
            console.log("The jwt token sent by the user is not valid")
            res.json({message: "Token is invalid"});
            return;
        }
        // req.user: JwtPayload = decodedResult as JwtPayload;

        // Decoded result has the object I used while making the token and iat and exp (I dont what or how these are used).
        console.log(typeof decodedResult);
        // this is useless information.
        console.log(decodedResult);
        next();
    });
}


const PORT: number = Number(process.env.PORT) || 3000;


// Creating a socket.io server
const app: Application = express();
app.use(cors());
app.use(express.json());
app.use('/user', userRouter);

// I need to create the router for protected as well.
app.post('/protected', verifyJWT, (req: Request, res: Response) => {
    console.log("We have verified the jwt token !");
    console.log("The request body: ", req.body);
    res.json({message: "My body feels tired but I dont feel sleep at all."});
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
}
);
const gameManager = new GameManager();

io.on('connection', (client) => {
    gameManager.addPlayer(client);
    gameManager.addHandlers(client);

    client.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

httpServer.listen(PORT, () => {
    console.log("Server is listening on port", PORT);
});