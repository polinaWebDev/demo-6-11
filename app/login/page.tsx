'use client'

import {useActionState} from "react";
import {login, LoginState} from "@/app/login/actions";
import {LoginForm} from "@/components/login-form";

const initialState: LoginState = {}

export default function LoginPage() {
    const [state, formAction, pending] = useActionState(login, initialState)

    return (
        <div className="grid min-h-svh">
            <div className="flex items-center justify-center p-6 md:p-10">
                <div className="w-full max-w-sm">
                    <LoginForm
                        action={formAction}
                        formError={state.formError}
                        pending={pending}
                    />
                </div>
            </div>
        </div>
    )
}
