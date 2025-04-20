import Express, { Request, Response, NextFunction } from "express";
import { poolPromise } from "../database";
import jwt from 'jsonwebtoken';

const router = Express.Router();

// All of these should be protected routes.
router.use(verifyJWT);

// This works.
router.post('/add-friend', async (req, res) => {
    try {
        const { userID, receiverID } = req.body;
        if (!userID || !receiverID) {
            res.status(400).json({ message: "Missing senderID or receiverID" });
            return;
        }

        const pool = await poolPromise;
        const receiver = await pool.request()
            .input("ID", receiverID)
            .query("SELECT * FROM Players where PlayerID = @ID");

        if (!receiver.recordset.length) {
            res.status(400).json({ message: "ReceiverID not found" });
            return;
        }

        const requestStatus = "Pending";
        pool.request()
            .input("senderID", userID)
            .input("receiverID", receiverID)
            .input("requestStatus", requestStatus)
            .query("INSERT INTO FriendRequests VALUES(@senderID, @receiverID, @requestStatus)");

        res.status(200).json({ message: "Friend request sent" });
        return;
    }
    catch (err) {
        console.error("Error adding friend:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// This works
router.post('/accept-friend', async (req, res) => {
    try {
        const { requestID } = req.body;
        const pool = await poolPromise;

        await pool.request()
            .input("requestID", requestID)
            .query("UPDATE FriendRequests SET RequestStatus = 'Accepted' where requestID = @requestID");

        const request = await pool.request()
            .input("requestID", requestID)
            .query("SELECT * FROM FriendRequests WHERE requestID = @requestID");

        console.log(request.recordset[0]);

        const { senderID, receiverID } = request.recordset[0];
        pool.request()
            .input("senderID", senderID)
            .input("receiverID", receiverID)
            .query("INSERT INTO Friendships VALUES(@senderID, @receiverID, GETDATE())");

        res.status(200).json({ message: "Friend request accepted" });
    }
    catch (err) {
        console.error("Error adding friend:", err);
        res.status(500).json({ message: "Internal server error" });
    }

});

//This works.
router.get('/friends', async (req, res): Promise<void> => {
    try {
        const userID = Number(req.query.userID);
        const pool = await poolPromise;

        const friends = await pool
            .request()
            .input("userID", userID)
            .query("SELECT * FROM Friendships WHERE PlayerID1 = @userID OR PlayerID2 = @userID");

        const friendIDs = friends.recordset.map((record) => {
            return record.PlayerID2 === userID ? record.PlayerID1 : record.PlayerID2;
        });

        if (friendIDs.length === 0) {
            res.status(200).json({ friends: [] });
            return;
        }

        const params = friendIDs.map((_, i) => `@id${i}`).join(', ');
        const request = pool.request();

        friendIDs.forEach((id, i) => {
            request.input(`id${i}`, id);
        });

        const result = await request.query(
            `SELECT playerID, username FROM Players WHERE PlayerID IN (${params})`
        );

        const friendNames = result.recordset.map((record) => record.username);

        res.status(200).json({ friends: friendNames });
    } catch (err: any) {
        console.error("Error fetching friends:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});
//This works
router.get('/received-requests', async (req, res) => {
    try {
        const userID = Number(req.query.userID);
        const pool = await poolPromise;

        const requests = await pool
            .request()
            .input("userID", userID)
            .query("SELECT * FROM FriendRequests WHERE ReceiverID = @userID AND requestStatus <> 'Accepted'");

        console.log(requests);
        const senderIDs = requests.recordset.map((record) => {
            return record.senderID;

        });

        if (senderIDs.length === 0) {
            res.status(200).json({ receivedRequests: [] });
            return;
        }

        const params = senderIDs.map((_, i) => `@id${i}`).join(', ');
        const request = pool.request();

        senderIDs.forEach((id, i) => {
            request.input(`id${i}`, id);
        });

        const result = await request.query(
            `SELECT playerID, username FROM Players WHERE PlayerID IN (${params})`
        );

        const requestNames = result.recordset.map((record) => record.username);

        res.status(200).json({ receivedRequests: requestNames });
    } catch (err: any) {
        console.error("Error fetching friend requests:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});


router.post('/remove-friend', () => {
    // Remove this frienship from the friends table
});


const JWT_SECRET_KEY: string = process.env.JWT_SECRET as string;
async function verifyJWT(req: Request, res: Response, next: NextFunction): Promise<void> {

    const jwtHeader: string | null = req.headers.authorization || null;
    if (!jwtHeader || !jwtHeader.startsWith("Bearer")) {
        res.status(500).json({ "message": "Request dont have json" });
        return;
    }

    const jwtToken: string = jwtHeader.split(" ")[1];

    jwt.verify(jwtToken, JWT_SECRET_KEY, (err, decodedResult) => {
        if (err) {
            console.log("The jwt token sent by the user is not valid")
            res.json({ message: "Token is invalid" });
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


router.post("/change-username", async (req: Request, res: Response) => {
    try {
      const { newUsername, email } = req.body;
  
      if (!newUsername || newUsername.length < 3) {
        res.status(400).json({ message: "Username must be at least 3 characters." });
        return;
      }
  
      const pool = await poolPromise;
      
      // Check if username is already taken by some other user.
      const checkUsername = await pool
        .request()
        .input("newUsername", newUsername)
        .query("SELECT * FROM Players WHERE username = @newUsername");
  
      if (checkUsername.recordset.length > 0) {
        res.status(400).json({ message: "Username already taken." });
        return;
      }
  
      // Update
      await pool
        .request()
        .input("email", email)
        .input("newUsername", newUsername)
        .query("UPDATE Players SET username = @newUsername WHERE email = @email");
  
      res.status(200).json({ message: "Username updated successfully." });
    } catch (err) {
      console.error("Username change error:", err);
      res.status(400).json({ message: "Invalid token or server error." });
    }
});
  

export default router;