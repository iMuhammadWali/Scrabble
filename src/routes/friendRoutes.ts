import Express, { Request, Response } from "express";
import { poolPromise } from "../database";

const router = Express.Router();
// Will come back to this later as well.

// All of these should be protected routes.
router.post('/add-friend', (req, res)=>{
    //This should send a friend request

    const { userID, receiverID } = req.body;
    // Add to DB
});


router.get('/received-requests', ()=>{
    // Get all the reqests from the the DB 
})

router.post('/remove-friend', ()=>{
    // Remove this frienship from the friends table
});

router.post('accept-friend', ()=>{
    // From the friend requests table, remove it, and add to the frienship table.
});

router.get('/friends', async (req, res) => {
    const userID = req.body.userID;
    const pool = await poolPromise
    
    const result = pool
    .request()
    .input("userID", userID)
    .query("SELECT from Friends where Player1ID = userID OR Player2ID = userID");    
});

