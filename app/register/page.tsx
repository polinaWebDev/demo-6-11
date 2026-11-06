'use client'

import {useActionState} from "react";
import {register, RegisterState} from "@/app/register/actions";
import {SignupForm} from "@/components/signup-form";
import {ImageSlider} from "@/components/ImageSlider";

const initialState: RegisterState = {}

export default function RegisterPage() {
    const [state, formAction, pending] = useActionState(register, initialState)

    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            <div className="flex items-center justify-center p-6 md:p-10">
                <div className="w-full max-w-sm">
                    <SignupForm
                        action={formAction}
                        fieldErrors={state.fieldErrors}
                        pending={pending}
                    />
                </div>
            </div>
            <div className="relative order-first h-56 sm:h-72 lg:order-last lg:h-auto">
                <ImageSlider/>
            </div>
        </div>
    )
}
