'use client'

import { useState } from 'react'
import { Plus, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function NuevoEscandallo({ articulos }: { articulos: any[] }) {
    const [isOpen, setIsOpen] = useState(false)
    const [name, setName] = useState('')
    const [category, setCategory] = useState('')
    const [salePrice, setSalePrice] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error('No session')

            const { data, error } = await supabase.from('escandallos').insert([{
                user_id: session.user.id,
                name,
                category: category || null,
                sale_price: salePrice ? parseFloat(salePrice) : null
            }]).select().single()

            if (error) throw error

            setIsOpen(false)
            // Redirect to the edit page for this new escandallo
            router.push(`/escandallos/${data.id}`)
            router.refresh()
        } catch (err) {
            console.error('Error creating escandallo:', err)
            alert('Error creating escandallo')
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
            >
                <Plus className="w-4 h-4" />
                Nuevo Escandallo
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <h2 className="text-lg font-semibold text-gray-900">Crear Escandallo</h2>
                            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={onSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Receta *</label>
                                <input
                                    required
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full rounded-md border-gray-300 py-2 px-3 text-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-black"
                                    placeholder="Ej. Tarta de Queso, Pizza Margarita..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                                    <input
                                        type="text"
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full rounded-md border-gray-300 py-2 px-3 text-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-black"
                                        placeholder="Ej. Postres"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">PVP de Venta (€)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={salePrice}
                                        onChange={(e) => setSalePrice(e.target.value)}
                                        className="w-full rounded-md border-gray-300 py-2 px-3 text-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-black"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !name}
                                    className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear Receta'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
