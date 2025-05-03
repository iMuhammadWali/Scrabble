import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { UserPayload } from '../types/UserPayload';

const JWT_SECRET_KEY: string = process.env.JWT_SECRET as string;
export default async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {

    const jwtHeader: string | null = req.headers.authorization || null;
    if (!jwtHeader || !jwtHeader.startsWith("Bearer")) {
        res.status(403).json({ "message": "Unauthorized" });
        return;
    }

    const jwtToken: string = jwtHeader.split(" ")[1];

    try {
        const decodedResult = jwt.verify(jwtToken, JWT_SECRET_KEY) as UserPayload;
        req.user = decodedResult.user;
        
        next();
    } catch (err) {
        if (err) {
            res.json({ message: "Token is invalid" });
            return;
        }
    }

}
