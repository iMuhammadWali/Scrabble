export enum MoveStatus {
    Failed,
    Success
};

export interface Move {
    status: MoveStatus;
    message: string;
}