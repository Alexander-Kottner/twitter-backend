export declare class TokenDTO {
    token: string;
}
export declare class SignupInputDTO {
    email: string;
    username: string;
    name: string;
    password: string;
    constructor(email: string, username: string, password: string, name: string);
}
export declare class LoginInputDTO {
    email?: string;
    username?: string;
    password: string;
}
