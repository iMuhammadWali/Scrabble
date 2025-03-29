import { poolPromise } from "../database";
import express, {Request, Response} from 'express'
import bcrypt from 'bcrypt';

const userRouter = express.Router();

// I was getting an error when I did return Promise <Response> 
userRouter.post('/register', async (req : Request, res: Response): Promise <void> =>{
    try {
        const pool = await poolPromise;
        const {username, email, password, authProvider, providerID } = req.body;

        if (!username || username.length < 3) {
            res.status(400).json({ message: "Username must be at least 3 characters long." });
            return;
        }
        if (!email || !email.includes("@") || !email.includes(".")) {
            res.status(400).json({ message: "Invalid email format." });
            return;
        }

        const existingUser = await pool.request().
        input ("email", email).
        query(`SELECT * from Players WHERE email = @email`);
        // Have to do this for the username as well.
        if (existingUser.recordset.length > 0) {
            res.status(400).json({ message: 'Email is already in use.'});
            return;
        }

        if (password) {
            // let hashedPass : string | null = null;
            if (password.length < 6) {
                res.status(400).json({message: "password length must be greater than 6."});
                return;
            }
            // Generate a hash of the password.
            // I think I should try something else than bcrypt.
            const hashedPass : string = await bcrypt.hash(password, 11);

            //Store the user.
            pool.request()
            .input("username", username)
            .input("email", email)
            .input("passwordHash", hashedPass)
            .query("INSERT into Players (username, email, passwordHash) VALUES(@username, @email, @passwordHash)");
        }
        else 
        {
            // Third party registration.
            // Why do we need to know about the auth provider?
            // Why do we need to have the providerID?

            pool.request()
            .input("username", username)
            .input("email", email)
            .input("authProvider", authProvider)
            .input("providerID", providerID)
            .query("INSERT into Players (username, email, authProvider, providerID) VALUES(@username, @email, @authProvider, @providerID)");
        }

        res.status(201).json({ message: "User registered successfully"}); //Send a json response back to the frontend.
        // Why do we need to send the user info back to the frontend?
    } 
    catch (err) {
      console.error("Registration Error:", err);
      res.status(500).json({ message: "Internal Server Error" });
    }
});

export default userRouter;