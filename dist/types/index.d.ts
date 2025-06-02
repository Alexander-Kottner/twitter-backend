export type ClassType<T> = new (...args: any[]) => T;
export interface CursorPagination {
    limit?: number;
    before?: string;
    after?: string;
}
export interface OffsetPagination {
    limit?: number;
    skip?: number;
}
