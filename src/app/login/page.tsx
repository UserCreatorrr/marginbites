import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import LoginForm from './login-form'

export default async function LoginPage() {
    const supabase = await createClient()
    const {
        data: { session },
    } = await supabase.auth.getSession()

    if (session) {
        redirect('/dashboard')
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
            <div className="w-full max-w-md space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-4xl font-extrabold tracking-tight text-gray-900">
                        MARGINBITES
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Sign in to access your kitchen intelligence
                    </p>
                </div>
                <LoginForm />
            </div>
        </div>
    )
}
