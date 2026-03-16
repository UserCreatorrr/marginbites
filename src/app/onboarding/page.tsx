import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import OnboardingForm from './onboarding-form'

export default async function OnboardingPage() {
    const supabase = await createClient()

    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
        redirect('/login')
    }

    // Check if user already has an API key configured
    const { data: config } = await supabase
        .from('tenant_config')
        .select('tspoonlab_api_key')
        .eq('user_id', session.user.id)
        .single()

    if (config?.tspoonlab_api_key) {
        redirect('/dashboard')
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
            <div className="w-full max-w-md space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Welcome to MARGINBITES
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Let's connect your tSpoonLab account to migrate your data.
                    </p>
                </div>
                <OnboardingForm userId={session.user.id} />
            </div>
        </div>
    )
}
