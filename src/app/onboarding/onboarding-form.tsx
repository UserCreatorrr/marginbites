'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function OnboardingForm({ userId }: { userId: string }) {
    const [apiKey, setApiKey] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    const handleSaveAndMigrate = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            // Guarda la key en supabase
            const { error: dbError } = await supabase
                .from('tenant_config')
                .upsert({ user_id: userId, tspoonlab_api_key: apiKey }, { onConflict: 'user_id' })

            if (dbError) throw dbError

            // Idealmente, llamar a un endpoint para importar (/api/migrate-tspoonlab)
            const res = await fetch('/api/migrate-tspoonlab', { method: 'POST' })
            if (!res.ok) {
                throw new Error('Failed to start migration. You can retry later from settings.')
            }

            router.push('/dashboard')
            router.refresh()
        } catch (err: any) {
            setError(err.message)
            setLoading(false)
        }
    }

    const handleSkip = () => {
        router.push('/dashboard')
        router.refresh()
    }

    return (
        <form className="mt-8 space-y-6" onSubmit={handleSaveAndMigrate}>
            <div className="space-y-4 rounded-md shadow-sm">
                <div>
                    <label htmlFor="api-key" className="block text-sm font-medium text-gray-700">
                        tSpoonLab Token (rememberme)
                    </label>
                    <p className="mt-1 text-xs text-gray-500">
                        Obtén tu token haciendo login en la API de TSpoonLab y usa el valor del cookie/token "rememberme".
                    </p>
                    <input
                        id="api-key"
                        name="apiKey"
                        type="text"
                        required
                        className="mt-2 block w-full rounded-md border-gray-300 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-black sm:text-sm"
                        placeholder="Ejemplo: aGVucnkudXBzYWxsLmRAZXXXXXXXXXXXXXXXXXX"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                    />
                </div>
            </div>

            {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                    {error}
                </div>
            )}

            <div className="flex flex-col space-y-3">
                <button
                    type="submit"
                    disabled={loading || !apiKey}
                    className="group relative flex w-full justify-center rounded-md bg-black px-3 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Connect & Import'}
                </button>

                <button
                    type="button"
                    onClick={handleSkip}
                    disabled={loading}
                    className="text-sm text-gray-500 hover:text-gray-900 underline transition-colors"
                >
                    Skip for now
                </button>
            </div>
        </form>
    )
}
