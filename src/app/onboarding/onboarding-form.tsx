'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function OnboardingForm({ userId }: { userId: string }) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    const handleSaveAndMigrate = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const res = await fetch('/api/migrate-tspoonlab', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to authenticate with TSpoonLab. Check your credentials.')
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
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                        Email de TSpoonLab
                    </label>
                    <input
                        id="username"
                        name="username"
                        type="email"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-black sm:text-sm"
                        placeholder="tu@email.com"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </div>
                <div className="pt-2">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                        Contraseña de TSpoonLab
                    </label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-black sm:text-sm"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
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
                    disabled={loading || !username || !password}
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
