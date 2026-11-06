"use server"

import {createSession} from "@/lib/session";
import {loginUser} from "@/lib/api/auth";
import {redirect} from "next/navigation";

export interface LoginState {
    formError?: string
}


export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
    const result = await loginUser(
        String(formData.get('login') ?? ''),
        String(formData.get('password') ?? ''),
    )

    if (!result.ok) {
        return { formError: result.error }
    }

    await createSession({userId: result.user.id, role: result.user.role})

    redirect(result.user.role === 'admin' ? '/admin' : '/applications')
}
