export interface User {
    id: string;
    email: string;
    username: string
};

export interface UserPayload {
    user: User;
    iat: number; // issued at time
}