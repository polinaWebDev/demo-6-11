import "server-only"
import {Role} from "@/app/generated/prisma/enums";
import {jwtVerify, SignJWT} from "jose";
import {cookies} from "next/headers";
import {cache} from "react";


const secretKey = process.env.SESSION_SECRET;
const encodedKey = new TextEncoder().encode(secretKey);

function isRole(value: unknown): value is Role {
    return value === 'user' || value === 'admin'
}

export interface SessionPayload {
    userId: string;
    role: Role;
}

export async function signSession(payload: SessionPayload): Promise<string> {
    return new SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(encodedKey);
}

export async function createSession(payload: SessionPayload): Promise<void> {
    const token = await signSession(payload);
    (await cookies()).set('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 3600
    });
}


export async function verifySession(token: string | null): Promise<SessionPayload | null> {
    if (!token) {
        return null;
    }
    try {
        const {payload} = await jwtVerify(token, encodedKey);
        if (!isRole(payload.role)) {
            return null;
        }
        return {userId: payload.userId as string, role: payload.role};
    } catch {
        return null;
    }
}

export const getSession = cache(async (): Promise<SessionPayload | null> => {
    const token = (await cookies()).get('session')?.value || null;
    return verifySession(token);
})

export async function deleteSession(): Promise<void> {
    (await cookies()).delete('session');
}



















