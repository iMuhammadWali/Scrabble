import express, { Express } from "express"
import cors from 'cors';

import userRouter from '../routes/userRoutes';
import friendRouter from '../routes/friendRoutes';
import gameRouter from '../routes/gameRoutes';

export const initApp = (app: Express) => {
    app.use(express.json());
    app.use(cors({
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        credentials: true,
    }));
    
    app.use('/user', userRouter);
    app.use('/friend', friendRouter);
    app.use('/game', gameRouter);
}