import { poolPromise } from "../database";
import express, { Request, Response, Router } from "express";
import jwt from "jsonwebtoken";
import argon2 from 'argon2';
import nodemailer from 'nodemailer';


// Note for me: For now, the token expires in 2h but I will implement a token refresh mechanism later after finishing the database tasks.

const router: Router = express.Router();
const JWT_SECRET: string = process.env.JWT_SECRET as string;


// Pausing this route for now and will ask for Abdullah Rashid's help for it.
// We will do this on tuesday.
router.post('/third-party-login', async (req: Request, res: Response): Promise<void> => {
  // I have yet to add test users to my OAuth Cloud consolse.
  try {
    const pool = await poolPromise;
    const { authProvider, token } = req.body;
  }
  catch (err) {

  }
})


// Register works fine.
router.post("/register", async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = await poolPromise;
    const { username, email, password } = req.body;

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

    res.status(201).json({ message: "User Registered Successfully!"});
  } catch (err) {
    console.error("Registration Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


// Login route works fine.
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

    const userID = result.recordset[0].playerID;
    const username = result.recordset[0].username;

    // I may implement the JWT reset mechanism as well.
    const token = jwt.sign({ user: {
      id: userID, email, username
    }}, JWT_SECRET);

    res.status(200).json({ message: "User has logged in", token: token, user: { userID: userID, username: username, email: email }  });
  }
  catch (err) {
    console.log("An Error has occured while logging the user in !", err);
  }
});


router.get("/check-token", async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      res.status(401).json({ message: "Unauthorized Request" });
      return;
    }

    // Verify the token
    jwt.verify(token, JWT_SECRET, (err: any) => {
      if (err) {
        res.status(401).json({ message: "Invalid or expired token." });
        return;
      }
      res.status(200).json({ message: "Token is valid." });
    });
  }
  catch (err) {
    console.error("Token check error: ", err);
    res.status(500).json({ message: "Server error." });
  }
});


// This works but I am not sure if I need to add more production level checks here
// But this works for the DB project
router.post("/change-email", async (req: Request, res: Response) => {
  try {
    const { newEmail } = req.body;
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      res.status(401).json({ message: "Unauthorized Request" });
      return;
    }

    // Add the token verify check here later.
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const currentEmail = decoded.email;
    console.log(currentEmail);

    if (!newEmail || !newEmail.includes("@") || !newEmail.includes(".")) {
      res.status(400).json({ message: "Invalid email format." });
      return;
    }

    // Since the user had the JWT, it is obvious that the user is registered.
    const pool = await poolPromise;
    const checkEmail = await pool
      .request()
      .input("newEmail", newEmail)
      .query("SELECT * FROM Players WHERE email = @newEmail");

    if (checkEmail.recordset.length > 0) {
      res.status(400).json({ message: "Email already in use." });
      return;
    }

    await pool
      .request()
      .input("newEmail", newEmail)
      .input("currentEmail", currentEmail)
      .query("UPDATE Players SET email = @newEmail WHERE email = @currentEmail");

    const newToken = jwt.sign({ email: newEmail }, JWT_SECRET, { expiresIn: "2h" });

    res.status(200).json({ message: "Email updated.", token: newToken });
  } catch (err) {
    console.error("Email change error:", err);
    res.status(400).json({ message: "Invalid token or server error." });
  }
});


// This works as well.
router.post("/change-password", async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const token = req.headers.authorization?.split(" ")[1];
    if (!token)  {
      res.status(401).json({ message: "Unauthorized Request" });
      return;
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);
    const email = decoded.email;
    if (!email)
    {
      console.log("Email is not present in the decoded token.");
      res.status(400).json({ message: "Invalid token." });
      return;
    }
    const pool = await poolPromise;
    const userResult = await pool
      .request()
      .input("email", email)
      .query("SELECT passwordHash FROM Players WHERE email = @email");

    if (userResult.recordset.length === 0) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    const storedHashPassword = userResult.recordset[0].passwordHash;
    const isPasswordMatch = await argon2.verify(storedHashPassword, currentPassword);

    if (!isPasswordMatch) {
      res.status(400).json({ message: "Current password is incorrect." });
      return;
    }

    const newHashedPassword = await argon2.hash(newPassword);

    await pool
      .request()
      .input("email", email)
      .input("passwordHash", newHashedPassword)
      .query("UPDATE Players SET passwordHash = @passwordHash WHERE email = @email");

    res.status(200).json({ message: "Password updated successfully." });
  } catch (err) {
    console.error("Password change error:", err);
    res.status(500).json({ message: "Failed to update password." });
  }
});


// This also works fine.
router.post("/change-username", async (req: Request, res: Response) => {
  try {
    const { newUsername } = req.body;
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      res.status(401).json({ message: "Unauthorized Request" });
      return;
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);
    const email = decoded.email;

    if (!email) {
      console.log("Email is not present in the decoded token.");
      res.status(400).json({ message: "Invalid token." });
      return;
    }

    if (!newUsername || newUsername.length < 3) {
      res.status(400).json({ message: "Invalid new username." });
      return;
    }

    const pool = await poolPromise;

    // Check if new username is already taken
    const usernameCheck = await pool
      .request()
      .input("newUsername", newUsername)
      .query("SELECT playerID FROM Players WHERE username = @newUsername");

    if (usernameCheck.recordset.length > 0) {
      res.status(400).json({ message: "Username is already taken." });
      return;
    }

    // Update username
    await pool
      .request()
      .input("email", email)
      .input("newUsername", newUsername)
      .query("UPDATE Players SET username = @newUsername WHERE email = @email");

    res.status(200).json({ message: "Username updated successfully.", newUsername });
  } catch (err) {
    console.error("Username change error:", err);
    res.status(500).json({ message: "Failed to update username." });
  }
});


// Works fine.
router.post("/reset-password-request", async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = await poolPromise;
    const { email } = req.body;
    console.log("Email: ", email);
    if (!email || !email.includes("@") || !email.includes(".")) {
      res.status(400).json({ message: "Invalid email format." });
      return;
    }

    const result = await pool
      .request()
      .input("email", email)
      .query("SELECT * from Players where email = @email");

    // Works fine till this
    if (result.recordset.length == 0) {
      res.status(401).json({ message: "Email does not exist!" });
      return;
    }

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
    res.json({ message: "Reset link sent!" });
  }
  catch (err) {
    console.log(err);
  }
});


// Works fine.
router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;
    if (!token) {
      res.status(400).json({ message: "Token is required." });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ message: "New password must be at least 6 characters long." });
      return;
    }
    if (newPassword !== confirmPassword) {
      res.status(400).json({ message: "Passwords do not match." });
      return;
    }

    try {

      const decoded: any = jwt.verify(token, JWT_SECRET);
      console.log("Decoded token: ", decoded);
      if (!decoded || !decoded.email) {
        res.status(400).json({ message: "Invalid token." });
        return;
      }
  
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
      console.error("Token verification error:", err);
      res.status(400).json({ message: "Invalid or expired token." });
    }

  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Invalid or expired token." });
  }
});


// Placeholder for delete-account route
router.post("/delete-account", async (req: Request, res: Response) => {
  res.status(501).json({ message: "Not implemented yet." });
});


// This also works fine.
router.get("/view-profile", async (req: Request, res: Response):Promise<void> => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const email = decoded.email;

    if (!email) {
      res.status(400).json({ message: "Invalid token." });
    }
    const pool = await poolPromise;

    // 1. Get the basic Player data
    const userResult = await pool
      .request()
      .input("email", email)
      .query(`
        SELECT playerID, username, email, createdAt 
        FROM Players 
        WHERE email = @email
      `);

    // If the user is not found, return 404
    if (userResult.recordset.length === 0) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const { playerID, username, createdAt } = userResult.recordset[0];

    // 2. Get Friends
    // Using PL SQL in this query.
    const friendsResult = await pool
      .request()
      .input("playerID", playerID)
      .query(`
        SELECT username FROM Players
        WHERE playerID IN (
          SELECT CASE
            WHEN PlayerID1 = @playerID THEN PlayerID2
            ELSE PlayerID1
          END
          FROM Friendships
          WHERE PlayerID1 = @playerID OR PlayerID2 = @playerID
        )
      `);

    const friends = friendsResult.recordset.map((r) => r.username);

    // 3. Get received Requests
    const incomingReqs = await pool
      .request()
      .input("playerID", playerID)
      .query(`
        SELECT p.username 
        FROM FriendRequests fr
        JOIN Players p ON p.playerID = fr.senderID
        WHERE fr.receiverID = @playerID AND fr.requestStatus = 'Pending'
      `);

    const incomingRequests = incomingReqs.recordset.map((r) => r.username);

    // 4. Now Get the Recently Finished Games
    const recentGames = await pool
      .request()
      .input("playerID", playerID)
      .query(`
        SELECT TOP 5 g.GameID, gp.Score, g.EndedAt
        FROM Games g
        JOIN GamePlayers gp ON g.GameID = gp.GameID
        WHERE gp.PlayerID = @playerID AND g.EndedAt IS NOT NULL
        ORDER BY g.EndedAt DESC
      `);

    // 5. Total Words Played
    const wordCount = await pool
      .request()
      .input("playerID", playerID)
      .query(`
        SELECT COUNT(*) AS totalWords 
        FROM WordsPlayed 
        WHERE PlayerID = @playerID
      `);

    // 6. Highest Scoring Word
    const topWordResult = await pool
      .request()
      .input("playerID", playerID)
      .query(`
        SELECT TOP 1 Word, WordScore 
        FROM WordsPlayed 
        WHERE PlayerID = @playerID 
        ORDER BY WordScore DESC
      `);

    const totalWords = wordCount.recordset[0]?.totalWords || 0;
    const highestScoringWord =
      topWordResult.recordset.length > 0
        ? topWordResult.recordset[0]
        : null;

    res.status(200).json({
      username,
      email,
      joinedAt: createdAt,
      friends,
      friendRequests: {
        incoming: incomingRequests,
      },
      recentGames: recentGames.recordset,
      wordsStats: {
        totalWords,
        highestScoringWord,
      },
    });
    return;
  } catch (err) {
    console.error("Error in /view-profile:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;