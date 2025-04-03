import { poolPromise } from "../database";
import express, { Request, Response, Router } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import argon2 from 'argon2';
dotenv.config();


// Note for me: For now, the token expires in 2h but I will implement a token refresh mechanism later after finishing the database tasks.

const router: Router = express.Router();
const JWT_SECRET: string | null = process.env.JWT || "A_LOT_OF_PEACE";

router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = await poolPromise; // I dont know the type. and I also believe that typescript is not for this purpose.
    const { email, password }: { email: string; password: string } = req.body;
    // Find the user with the entered email.
    const result = await pool
      .request()
      .input("email", email)
      .query("SELECT * from Players where email = @email");

    if (!result.recordset.length) {
      // It means that the email entered by the user is not present in our database.
      res.status(400).json({ message: "Email is not registered." });
      return;
    }

    // check if the password entered by the user is correct or not.
    const storedHashPassword: string = result.recordset[0].passwordHash;
    const isPasswordMatch = await  argon2.verify(storedHashPassword, password); 
    if (!isPasswordMatch) {
      res.status(400).json({ message: "Wrong password." });
      return;
    }

    console.log("User has succesfully logged in !");
    const token: string = jwt.sign({ email }, JWT_SECRET, { expiresIn: "2h" });
    res.status(200).json({ "message": "Its 1:34 am but I dont want to sleep.", "token": token });
  }
  catch (err) {
    console.log("An Error has occured while logging the user in !", err);
  }
});

// Pausing this route for now and will ask for Abdullah Rashid's help for it.  
router.post('/third-party-login', async (req: Request, res: Response): Promise<void> => {
  // I have yet to add test users to my OAuth Cloud consolse.
  try {
    const pool = await poolPromise;
    const { authProvider, token } = req.body;
  }
  catch (err) {

  }
})

router.post("/register", async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = await poolPromise;
    const { username, email, password } = req.body;

    console.log('JWT_SECRET: ', JWT_SECRET);
    console.log('Type of JWT_SECRET', typeof JWT_SECRET);

    if (!username || username.length < 3) {
      res.status(400).json({ message: "Username must be at least 3 characters long." });
      return;
    }
    if (!email || !email.includes("@") || !email.includes(".")) {
      res.status(400).json({ message: "Invalid email format." });
      return;
    }
    if (!password || password.length < 6) {
      res.status(400).json({ message: "Password must be at least 6 characters long." });
      return;
    }

    const existingUser = await pool.request().input("email", email).query(`SELECT * FROM Players WHERE email = @email`);
    if (existingUser.recordset.length > 0) {
      res.status(400).json({ message: "Email is already in use." });
      return;
    }

    const hashedPassword: string = await argon2.hash(password);

    await pool
      .request()
      .input("username", username)
      .input("email", email)
      .input("passwordHash", hashedPassword)
      .query("INSERT INTO Players (username, email, passwordHash) VALUES (@username, @email, @passwordHash)");

    const insertedUser = await pool
      .request()
      .input("username", username)
      .input("email", email)
      .input("passwordHash", hashedPassword)
      .query("SELECT * from Players where username = @username AND passwordHash = @passwordHash");

    console.log(insertedUser);
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "2h" });
    // for now, I am just sending the jwt token back to the user.
    // Will send the user ID and username after I know that this works.

    res.status(201).json({ message: "User Registered Successfully!", token: token });
    // Cannot send the status back to the frontend after it has been sent once.
  } catch (err) {
    console.error("Registration Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;