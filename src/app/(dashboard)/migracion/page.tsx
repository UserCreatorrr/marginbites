'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowRight } from 'lucide-react'

export default function MigracionPage() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const router = useRouter()

    const handleSaveAndMigrate = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccess(null)

        try {
            const res = await fetch('/api/migrate-tspoonlab', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to authenticate with TSpoonLab. Check your credentials.')
            }

            setSuccess(data.message || 'Migración completada con éxito. Ya puedes ver tus proveedores y productos.')
            setUsername('')
            setPassword('')
            router.refresh()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Integración con TSpoonLab</h1>
            <p className="text-gray-600 mb-8">
                Introduce las credenciales de tu cuenta de TSpoonLab para sincronizar automáticamente tus proveedores y catálogo de productos con MARGINBITES.
            </p>

            <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-base font-semibold leading-6 text-gray-900">Sincronizar Datos</h3>

                    <form className="mt-5 sm:flex sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 flex-wrap" onSubmit={handleSaveAndMigrate}>
                        <div className="w-full sm:max-w-xs">
                            <label htmlFor="username" className="sr-only">Email de TSpoonLab</label>
                            <input
                                type="email"
                                name="username"
                                id="username"
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-black sm:text-sm sm:leading-6"
                                placeholder="tu@email.com"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div className="w-full sm:max-w-xs mt-3 sm:mt-0">
                            <label htmlFor="password" className="sr-only">Contraseña</label>
                            <input
                                type="password"
                                name="password"
                                id="password"
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-black sm:text-sm sm:leading-6"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !username || !password}
                            className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-black px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 disabled:opacity-50 sm:mt-0 sm:w-auto transition-colors"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                            Importar
                        </button>
                    </form>

                    {error && (
                        <div className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                            <strong>Error:</strong> {error}
                        </div>
                    )}

                    {success && (
                        <div className="mt-4 text-sm text-green-700 bg-green-50 p-3 rounded-md border border-green-200">
                            {success}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
