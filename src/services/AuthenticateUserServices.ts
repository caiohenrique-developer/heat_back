import axios from "axios";
import prismaClient from "../prisma";
import { sign } from "jsonwebtoken"

interface IAccessTokenResponse {
    access_token: string;
}

interface IUserResponse {
    avatar_url: string;
    login: string;
    id: number;
    name: string;
}

class AuthenticateUserService {
    async execute(code: string) {
        const url = 'https://github.com/login/oauth/access_token';

        const { data: accessTokenResponse } = await axios.post<IAccessTokenResponse>(url, null, {
            params: {
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code
            },
            headers: {
                accept: 'application/json'
            }
        })

        const response = await axios.get<IUserResponse>('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${accessTokenResponse.access_token}`
            }
        })

        const { avatar_url, id, login, name } = response.data;

        let user = await prismaClient.user.findFirst({
            where: {
                github_id: id
            }
        })

        if (!user) {
            user = await prismaClient.user.create({
                data: {
                    github_id: id,
                    name,
                    login,
                    avatar_url
                }
            })
        }

        const token = sign(
            {
                user: {
                    id: user.id,
                    name: user.name,
                    avatar_url: user.avatar_url
                }
            },
            process.env.JWT_SECRET,
            {
                subject: user.id,
                expiresIn: '1d'
            }
        )
        
        return { token, user };
    }
}

export { AuthenticateUserService }