import Express, { Request, Response, NextFunction } from "express";
import { poolPromise } from "../database";
import jwt from 'jsonwebtoken';
import authenticate from "../utils/authenticate";

const router = Express.Router();

// All of these should be protected routes.
router.use(authenticate);

// This works.
router.post('/add-friend', async (req, res) => {
    try {
        const { username } = req.body;
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            res.status(401).json({ message: "Unauthorized" });
            return;   
        }

        const decodedToken = jwt.verify(token, process.env.JWT_SECRET as string);
        if (!decodedToken) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const userID = (decodedToken as any).id; // Assuming the token contains id


        if (!userID) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        if (!username) {
            res.status(400).json({ message: "Missing username" });
            return;
        }

        const pool = await poolPromise;
        const receiver = await pool.request()
            .input("username", username)
            .query("SELECT * FROM Players where username = @username");

        if (!receiver.recordset.length) {
            res.status(400).json({ message: "ReceiverID not found" });
            return;
        }

        console.log("UserID: ", userID);
        console.log("ReceiverID: ", receiver.recordset[0].playerID);
        const receiverID = receiver.recordset[0].playerID;
        if (userID === receiverID) {
            res.status(400).json({ message: "You cannot send a friend request to yourself" });
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

        if (!requestID) {
            res.status(400).json({ message: "Missing requestID" });
            return;
        }

        const pool = await poolPromise;

        let userID = req.user?.id;

        if (!userID) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        console.log("UserID: ", userID);

        await pool.request()
            .input("requestID", requestID)
            .query("UPDATE FriendRequests SET RequestStatus = 'Accepted' where requestID = @requestID");

        const request = await pool.request()
            .input("requestID", requestID)
            .query("SELECT * FROM FriendRequests WHERE requestID = @requestID");

        console.log(request.recordset[0]);

        if (!request.recordset.length) {
            res.status(400).json({ message: "Request not found" });
            return;
        }
        if (request.recordset[0].requestStatus !== "Pending") {
            res.status(400).json({ message: "Request already accepted or rejected" });
            return;
        }

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
        const userID = req.user?.id;

        if (!userID) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const pool = await poolPromise;

        const requests = await pool
            .request()
            .input("userID", userID)
            .query("SELECT FR.requestID, P.username, FR.senderID FROM FriendRequests FR JOIN Players P ON P.playerID = FR.receiverID WHERE FR.ReceiverID = @userID AND FR.requestStatus = 'Pending';");

        const requestNames: {
            username: string;
            requestID: number;
        }[] = requests.recordset.map((record) => {
            return {
                username: record.username as string,
                requestID: record.requestID as number
            };
        });

        console.log(requestNames);

        res.status(200).json({ receivedRequests: requestNames });
    } catch (err: any) {
        console.error("Error fetching friend requests:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});


router.post('/remove-friend', () => {
    // Remove this frienship from the friends table
});



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