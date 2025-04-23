-- How will everything work here?

-- 1. The Players table store all the information of a player.
-- 2. FriendRequests table store all the friend requests a player has recieved and by whom.
-- 3. Friendships table shows which users are friends.
-- 4. Games table shows all the games that have been created. 
	-- These games may be ongoing or finished. We use the end time for that.
-- 5. The game player table shows all the player that are a part of any game.
-- 6. Words played shows all the words formed by a player in any ongoing or finished time.

	-- We will enter everything in the DB as any game starts
	-- Then as soon as the game starts, enter stuff in the gamePlayers table.
	-- Then on each word formed by player, we will store that in the words formed table.


CREATE TABLE Players (
    playerID INT IDENTITY(1,1) PRIMARY KEY, -- Auto increment Player IDs.
    username VARCHAR(50) NOT NULL UNIQUE,  
    email VARCHAR(255) NOT NULL UNIQUE,   -- Do not allow more than one account from an email.
    passwordHash NVARCHAR(255) NULL, -- NULL Becasue we may use 3rd party auth.

    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(), -- I have no clue why this is used but this exists in many online games.
    authProvider VARCHAR(50) NULL,
    providerID VARCHAR(255) NULL,      -- The ID from the third-party provider

	isDeleted INT NOT NULL Default 0  -- For soft deleting the user but keeping the data.
);

CREATE TABLE FriendRequests (
    requestID INT IDENTITY(1,1) PRIMARY KEY,
    senderID INT NOT NULL,
    receiverID INT NOT NULL,
    requestStatus NVARCHAR(20) NOT NULL, -- 'Pending' 'Accepted' 'Declined' 
    CONSTRAINT FK_FriendRequests_Sender FOREIGN KEY (SenderID) REFERENCES Players(PlayerID),
    CONSTRAINT FK_FriendRequests_Receiver FOREIGN KEY (ReceiverID) REFERENCES Players(PlayerID)
);

CREATE TABLE Friendships (
    PlayerID1 INT NOT NULL,
    PlayerID2 INT NOT NULL,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(), -- Not neccessary I guesss
    CONSTRAINT PK_Friendships PRIMARY KEY (PlayerID1, PlayerID2),
    CONSTRAINT FK_Friendships_Player1 FOREIGN KEY (PlayerID1) REFERENCES Players(PlayerID),
    CONSTRAINT FK_Friendships_Player2 FOREIGN KEY (PlayerID2) REFERENCES Players(PlayerID),

	-- I need to ensure in the backend code that friendships are mutual and I only store a frienship once.
	-- Or I can add a constraint here later to make the tupple (1, 2) (2, 1) same and since 
	-- it is a primary key, naturally duplicates wont be allowed.
);

CREATE TABLE Games (
    GameID INT IDENTITY(1,1) PRIMARY KEY,
    GameMode VARCHAR(50) NOT NULL,      -- Local, Friends, Global
    CustomTimeLimit INT NOT NULL,        -- We can decide the unit later.

    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(), 

	-- Since we are doing a DB project, we can store these for several reasons.
    StartedAt DATETIME NULL,
    EndedAt DATETIME NULL  -- to display the recent games as well the ongoing games.

	-- Note: StartedAt SUBTRACT CreatedAt shows the time taken to find players.
);

-- Each row entry show a player played in a game.
-- This Table does not store ongoing games.

-- If by any chance, a player logs out, we can find its recent game. See if the endTime of that game is null.
-- If NULL, enter him back to the game. Seat number will also be used there.
CREATE TABLE GamePlayers (
    GameID INT NOT NULL,
    PlayerID INT NOT NULL,
    placeOnBoard INT NOT NULL,  -- Because there are maximum four players.
    Score INT NOT NULL DEFAULT 0, 
    PRIMARY KEY (GameID, PlayerID),
    CONSTRAINT FK_GamePlayers_Game FOREIGN KEY (GameID) REFERENCES Games(GameID),
    CONSTRAINT FK_GamePlayers_Player FOREIGN KEY (PlayerID) REFERENCES Players(PlayerID)
);

CREATE TABLE WordsPlayed (
    WordPlayedID INT IDENTITY(1,1) PRIMARY KEY,
    GameID INT NOT NULL,
    PlayerID INT NOT NULL,
    Word VARCHAR(50) NOT NULL,
    WordScore INT NOT NULL,              -- Score for this word
    PlayedAt DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_WordsPlayed_Game FOREIGN KEY (GameID) REFERENCES Games(GameID),
    CONSTRAINT FK_WordsPlayed_Player FOREIGN KEY (PlayerID) REFERENCES Players(PlayerID)
);