export interface User {
    id: number;
    email: string;
    username: string
};

export interface UserPayload {
    user: User;
    iat: number; // issued at time
}