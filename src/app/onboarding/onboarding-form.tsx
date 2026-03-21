'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, ChevronRight } from 'lucide-react'

type MigrationStep = 'idle' | 'login' | 'vendors' | 'ingredients' | 'recipes' | 'orders' | 'albaranes' | 'done' | 'error'

const STEP_LABELS: Record<string, string> = {
    login: 'Conectando con TSpoonLab...',
    vendors: 'Importando Proveedores...',
    ingredients: 'Importando Artículos...',
    recipes: 'Importando Escandallos (cascarones)...',
    orders: 'Importando histórico de Pedidos (con líneas)...',
    albaranes: 'Importando histórico de Albaranes (con líneas)...',
    done: '¡Migración completada!'
}

export default function OnboardingForm({ userId }: { userId: string }) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [startDate, setStartDate] = useState('2020-01-01')
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])

    const [step, setStep] = useState<MigrationStep>('idle')
    const [statusText, setStatusText] = useState('')
    const [totalImported, setTotalImported] = useState(0)
    const [error, setError] = useState<string | null>(null)

    const router = useRouter()

    const runChunk = async (type: string, extra: Record<string, string | number> = {}): Promise<{ count: number, hasMore: boolean }> => {
        const res = await fetch('/api/migrate-tspoonlab/chunk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, ...extra })
        })
        if (!res.ok) {
            const errData = await res.json()
            throw new Error(errData.error || `Error en ${type}`)
        }
        return await res.json()
    }

    const processTypePaged = async (type: MigrationStep, chunkSize: number) => {
        setStep(type)
        let start = 0
        let hasMore = true
        let count = 0

        while (hasMore) {
            setStatusText(`${STEP_LABELS[type]} (${count} registros)`)
            const data = await runChunk(type, { start, rows: chunkSize })
            count += data.count
            setTotalImported(prev => prev + data.count)
            hasMore = data.hasMore
            start += chunkSize
        }
    }

    const processTypeDateRange = async (type: MigrationStep) => {
        setStep(type)
        setStatusText(`${STEP_LABELS[type]}`)
        const data = await runChunk(type, { startDate, endDate })
        setTotalImported(prev => prev + data.count)
        setStatusText(`${STEP_LABELS[type]} (${data.count} registros importados)`)
    }

    const handleSaveAndMigrate = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setTotalImported(0)

        try {
            // Step 1: Login
            setStep('login')
            setStatusText(STEP_LABELS['login'])
            const resLogin = await fetch('/api/migrate-tspoonlab', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            })
            if (!resLogin.ok) {
                const err = await resLogin.json()
                throw new Error(err.error || 'Credenciales incorrectas o error de red.')
            }

            // Step 2: Vendors
            await processTypePaged('vendors', 1000)

            // Step 3: Ingredients
            await processTypePaged('ingredients', 500)

            // Step 4: Recipes (shells only)
            await processTypePaged('recipes', 100)

            // Step 5: Orders (full detail via integration API)
            await processTypeDateRange('orders')

            // Step 6: Albaranes (full detail via integration API)
            await processTypeDateRange('albaranes')

            // Done!
            setStep('done')
            setStatusText(STEP_LABELS['done'])
            setTimeout(() => {
                router.push('/dashboard')
                router.refresh()
            }, 1500)

        } catch (err: any) {
            setError(err.message)
            setStep('error')
        }
    }

    const handleSkip = () => {
        router.push('/dashboard')
        router.refresh()
    }

    const isRunning = !['idle', 'done', 'error'].includes(step)

    return (
        <form className="mt-8 space-y-5" onSubmit={handleSaveAndMigrate}>
            <div className="space-y-4">
                <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700">Email de TSpoonLab</label>
                    <input id="username" name="username" type="email" required
                        className="mt-1 block w-full rounded-md border-gray-300 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-black sm:text-sm outline-none"
                        placeholder="tu@email.com" value={username} onChange={(e) => setUsername(e.target.value)} disabled={isRunning}
                    />
                </div>
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">Contraseña de TSpoonLab</label>
                    <input id="password" name="password" type="password" required
                        className="mt-1 block w-full rounded-md border-gray-300 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-black sm:text-sm outline-none"
                        placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isRunning}
                    />
                </div>
                <div className="pt-1 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-3">Rango de fechas para importar Pedidos y Albaranes históricos:</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-600">Desde</label>
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={isRunning}
                                className="mt-1 block w-full rounded-md border-gray-300 py-2 px-3 text-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-black outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600">Hasta</label>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={isRunning}
                                className="mt-1 block w-full rounded-md border-gray-300 py-2 px-3 text-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-black outline-none" />
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-100">
                    ❌ {error}
                </div>
            )}

            {isRunning && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500 shrink-0" />
                    <div>
                        <p className="text-sm text-blue-900 font-medium">{statusText}</p>
                        <p className="text-xs text-blue-600 mt-0.5">Registros importados: {totalImported}</p>
                    </div>
                </div>
            )}

            {step === 'done' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                    <div>
                        <p className="text-sm text-green-800 font-medium">{statusText}</p>
                        <p className="text-xs text-green-600 mt-0.5">Total importado: {totalImported} registros</p>
                    </div>
                </div>
            )}

            <div className="flex flex-col space-y-3 pt-2">
                <button type="submit" disabled={isRunning || !username || !password}
                    className="group flex w-full justify-center items-center gap-2 rounded-md bg-black px-3 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 transition-colors">
                    {isRunning ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Importando datos...</>
                    ) : (
                        <><ChevronRight className="h-4 w-4" /> Conectar e Importar Todo</>
                    )}
                </button>
                <button type="button" onClick={handleSkip} disabled={isRunning}
                    className="text-sm text-gray-500 hover:text-gray-900 underline transition-colors disabled:opacity-50">
                    Saltar por ahora
                </button>
            </div>
        </form>
    )
}
