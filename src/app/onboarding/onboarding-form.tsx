'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle2 } from 'lucide-react'

type MigrationStep = 'login' | 'vendors' | 'ingredients' | 'recipes' | 'orders' | 'done'

export default function OnboardingForm({ userId }: { userId: string }) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')

    // Chunking state
    const [step, setStep] = useState<MigrationStep>('login')
    const [progress, setProgress] = useState<{ current: number, totalEst: number }>({ current: 0, totalEst: 0 })
    const [statusText, setStatusText] = useState('')
    const [error, setError] = useState<string | null>(null)

    const router = useRouter()

    const runChunk = async (type: string, start: number, rows: number): Promise<{ count: number, hasMore: boolean }> => {
        const res = await fetch('/api/migrate-tspoonlab/chunk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, start, rows })
        })
        if (!res.ok) {
            const errData = await res.json()
            throw new Error(errData.error || `Error fetching chunk for ${type}`)
        }
        return await res.json()
    }

    const processType = async (type: MigrationStep, chunkSize: number) => {
        let start = 0
        let hasMore = true
        let totalImported = 0

        while (hasMore) {
            setStatusText(`Importando ${type}... (${totalImported} procesados)`)
            const data = await runChunk(type, start, chunkSize)
            totalImported += data.count
            setProgress(prev => ({ ...prev, current: totalImported }))

            hasMore = data.hasMore
            start += chunkSize
        }
    }

    const handleSaveAndMigrate = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        try {
            // Step 1: Login
            setStep('login')
            setStatusText('Conectando a TSpoonLab...')
            const resLogin = await fetch('/api/migrate-tspoonlab', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            })
            if (!resLogin.ok) throw new Error('Credenciales incorrectas o error de red.')

            // Step 2: Vendors
            setStep('vendors')
            await processType('vendors', 1000)

            // Step 3: Ingredients
            setStep('ingredients')
            await processType('ingredients', 500)

            // Step 4: Recipes
            setStep('recipes')
            await processType('recipes', 50)

            // Step 5: Orders
            setStep('orders')
            await processType('orders', 100)

            // Done
            setStep('done')
            setStatusText('¡Migración completada con éxito!')
            setTimeout(() => {
                router.push('/dashboard')
                router.refresh()
            }, 1000)

        } catch (err: any) {
            setError(err.message)
            setStep('login')
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
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700">Email de TSpoonLab</label>
                    <input
                        id="username" name="username" type="email" required
                        className="mt-1 block w-full rounded-md border-gray-300 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-black sm:text-sm"
                        placeholder="tu@email.com"
                        value={username} onChange={(e) => setUsername(e.target.value)}
                        disabled={step !== 'login'}
                    />
                </div>
                <div className="pt-2">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">Contraseña de TSpoonLab</label>
                    <input
                        id="password" name="password" type="password" required
                        className="mt-1 block w-full rounded-md border-gray-300 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-black sm:text-sm"
                        placeholder="••••••••"
                        value={password} onChange={(e) => setPassword(e.target.value)}
                        disabled={step !== 'login'}
                    />
                </div>
            </div>

            {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-100">
                    {error}
                </div>
            )}

            {step !== 'login' && step !== 'done' && !error && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between text-sm text-gray-700 font-medium">
                        <span>{statusText}</span>
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    </div>
                </div>
            )}

            {step === 'done' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm text-green-800 font-medium">{statusText}</span>
                </div>
            )}

            <div className="flex flex-col space-y-3 pt-2">
                <button
                    type="submit"
                    disabled={step !== 'login' || !username || !password}
                    className="group relative flex w-full justify-center rounded-md bg-black px-3 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                    {step !== 'login' && step !== 'done' ? (
                        <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Migrando datos...</>
                    ) : 'Connect & Import'}
                </button>

                <button
                    type="button" onClick={handleSkip} disabled={step !== 'login'}
                    className="text-sm text-gray-500 hover:text-gray-900 underline transition-colors disabled:opacity-50"
                >
                    Skip for now
                </button>
            </div>
        </form>
    )
}
