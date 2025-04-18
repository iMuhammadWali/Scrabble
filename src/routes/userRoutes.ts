import { poolPromise } from "../database";
import express, { Request, Response, Router } from "express";
import jwt from "jsonwebtoken";
import argon2 from 'argon2';
import nodemailer from 'nodemailer';


// Note for me: For now, the token expires in 2h but I will implement a token refresh mechanism later after finishing the database tasks.

const router: Router = express.Router();
const JWT_SECRET: string = process.env.JWT_SECRET as string;

// I should send the user ID as well back after the login.
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
    const isPasswordMatch = await argon2.verify(storedHashPassword, password);
    if (!isPasswordMatch) {
      res.status(400).json({ message: "Wrong password." });
      return;
    }

    // 
    const userID = result.recordset[0].playerID;
    const username = result.recordset[0].username;

    // I may implement the JWT reset mechanism as well.
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "2h" });
    res.status(200).json({ message: "User has logged in", userID: userID, username: username, token: token });
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

    res.status(201).json({ message: "User Registered Successfully!", token: token });
    // Cannot send the status back to the frontend after it has been sent once.
  } catch (err) {
    console.error("Registration Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Works fine.
router.post("/send-reset-password-request", async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = await poolPromise;
    const { email } = req.body;
    const result = await pool
      .request()
      .input("email", email)
      .query("SELECT * from Players where email = @email");

    // Works fine till this
    if (result.recordset.length == 0) {
      res.json({ message: "Email does not exist !" });
      return;
    }

    console.log("The control comes here!");
    const passwordResetToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: "15m" })
    const senderEmail = process.env.APP_EMAIL;
    const senderAppPassword = process.env.APP_PASS;

    const linkWithToken = `${process.env.APP_URL}/reset-password?token=${passwordResetToken}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: senderEmail,
        pass: senderAppPassword  
      }
    });

    const mailOptions = {
      from: senderEmail,
      to: email,
      subject: "Reset Bahr-e-Alfaz Password",
      html: `
      <h3>Password Reset</h3>
      <p>Click the link below to reset your password:</p>
      <a href="${linkWithToken}">${linkWithToken}</a>
      <p>This link will expire in 15 minutes.</p>
    `
    };

    await transporter.sendMail(mailOptions);
    console.log('Reset email sent to:', email);
    res.json({ message: "Reset link sent !" });
  }
  catch (err) {
    console.log(err);
  }
});

router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const email = decoded.email;
    const hashedPassword = await argon2.hash(newPassword);
    const pool = await poolPromise;

    //Update the password
    pool.request()
      .input("email", email)
      .input("passwordHash", hashedPassword)
      .query('UPDATE Players SET passwordHash = @passwordHash WHERE email = @email');

    res.status(200).json({ message: "Password reset successful." });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Invalid or expired token." });
  }
});


router.post('/delete-account', async()=>{

});

export default router;