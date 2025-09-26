USE Scrabble;
GO

-- Password for both are '12345678'
INSERT INTO Players (username, email, passwordHash) VALUES
(
    'Abdullah',
    'abdullah@gmail.com',
    '$argon2id$v=19$m=65536,t=3,p=4$adzBlgkUdjLAa/Rd42tcCQ$HXyoyzD1wh2BFrUSlP8jJCWbN6OP4Q7hMWU9yMoB0fY'
),
(
    'Muiz',
    'muiz@gmail.com',
    '$argon2id$v=19$m=65536,t=3,p=4$adzBlgkUdjLAa/Rd42tcCQ$HXyoyzD1wh2BFrUSlP8jJCWbN6OP4Q7hMWU9yMoB0fY'
)

INSERT INTO FriendRequests (SenderID, ReceiverID, requestStatus) VALUES
(
    1,
    2,
    'Accepted'
)