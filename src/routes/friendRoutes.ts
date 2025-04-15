import Express, { Request, Response, NextFunction } from "express";
import { poolPromise } from "../database";
import jwt from 'jsonwebtoken';
import { CallTracker } from "assert";

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


router.get('/received-requests', () => {
    // Get all the reqests from the the DB 
})

router.post('/remove-friend', () => {
    // Remove this frienship from the friends table
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

//This works
router.get('/friends', async (req, res) => {
    try {
        const userID  = req.query.userID as string;
        console.log(userID);
        const pool = await poolPromise;

        const result = await pool
            .request()
            .input("userID", userID)
            .query("SELECT * from Friendships where PlayerID1 = @userID OR PlayerID2 = @userID");

        const userFriends = result.recordset.map((record) => {
            return record.PlayerID2 === userID ? record.PlayerID2 : record.PlayerID1;
        })
        console.log("Friends are: ", userFriends);
        res.status(200).json({ message: "Friends are displayed" });
    }
    catch (err) {
        console.error("Error adding friend:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});


const JWT_SECRET_KEY: string = process.env.JWT || "A_LOT_OF_PEACE";
async function verifyJWT(req: Request, res: Response, next: NextFunction): Promise<void> {
    // How does a request with jwt look like: 
    // method: "GET",
    // headers: {
    //     "Authorization": `Bearer ${token}`
    // }

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


export default router;