import { UserRepository } from '../../../domains/user/repository';
import { LoginInputDTO, SignupInputDTO, TokenDTO } from '../dto';
import { AuthService } from './auth.service';
export declare class AuthServiceImpl implements AuthService {
    private readonly repository;
    constructor(repository: UserRepository);
    signup(data: SignupInputDTO): Promise<TokenDTO>;
    login(data: LoginInputDTO): Promise<TokenDTO>;
}
