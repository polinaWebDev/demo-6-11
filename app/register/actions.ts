'use server'

import {redirect} from "next/navigation";
import {createSession} from "@/lib/session";
import {registerUser} from "@/lib/api/auth";

export interface RegisterState {
    fieldErrors?: Record<string, string>
}

export async function register(
    _prevState: RegisterState,
    formData: FormData,
): Promise<RegisterState> {
    const result = await registerUser({
        login: String(formData.get('login') ?? ''),
        password: String(formData.get('password') ?? ''),
        fullName: String(formData.get('fullName') ?? ''),
        phone: String(formData.get('phone') ?? ''),
        email: String(formData.get('email') ?? ''),
    })

    if (!result.ok) {
        return { fieldErrors: result.fieldErrors }
    }

    await createSession({userId: result.user.id, role: result.user.role})

    redirect('/applications')
}
