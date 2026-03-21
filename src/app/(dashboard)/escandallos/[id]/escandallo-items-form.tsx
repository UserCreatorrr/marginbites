'use client'

import { useState } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function EscandalloItemsForm({
    escandalloId,
    initialItems,
    allArticulos
}: {
    escandalloId: string,
    initialItems: any[],
    allArticulos: any[]
}) {
    const [items, setItems] = useState(initialItems)
    const [selectedArticulo, setSelectedArticulo] = useState('')
    const [quantity, setQuantity] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedArticulo || !quantity) return

        setLoading(true)

        try {
            const { data: { session } } = await supabase.auth.getSession()
            const { data, error } = await supabase.from('escandallo_items').insert({
                escandallo_id: escandalloId,
                articulo_id: selectedArticulo,
                quantity: parseFloat(quantity)
            }).select(`
                id,
                quantity,
                articulos (
                    id,
                    name,
                    unit,
                    cost_price
                )
            `).single()

            if (error) throw error

            setItems([...items, data])
            setSelectedArticulo('')
            setQuantity('')
            router.refresh() // Refresh to update server-side margins
        } catch (err: any) {
            console.error('Error adding item:', err)
            alert('Error al añadir ingrediente: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleRemove = async (itemId: string) => {
        if (!confirm('¿Seguro que quieres quitar este ingrediente?')) return

        try {
            const { error } = await supabase.from('escandallo_items').delete().eq('id', itemId)
            if (error) throw error

            setItems(items.filter(i => i.id !== itemId))
            router.refresh()
        } catch (err: any) {
            console.error('Error removing item:', err)
            alert('Error al quitar ingrediente')
        }
    }

    return (
        <div className="space-y-6">

            {/* Current Items List */}
            {items.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                            <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <th className="pb-3 pr-4">Ingrediente</th>
                                <th className="pb-3 px-4">Cantidad</th>
                                <th className="pb-3 px-4">Coste Ud.</th>
                                <th className="pb-3 px-4">Total</th>
                                <th className="pb-3 pl-4 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {items.map((item) => {
                                const articulo = item.articulos
                                const itemTotal = (articulo?.cost_price || 0) * item.quantity
                                return (
                                    <tr key={item.id} className="group hover:bg-gray-50 transition-colors">
                                        <td className="py-3 pr-4">
                                            <div className="text-sm font-medium text-gray-900">{articulo?.name || 'Desconocido'}</div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="text-sm text-gray-600">{item.quantity} {articulo?.unit || 'uds'}</span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="text-sm text-gray-500">{articulo?.cost_price ? `${Number(articulo.cost_price).toFixed(2)}€` : '-'}</span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="text-sm font-medium text-gray-900">{itemTotal.toFixed(2)}€</span>
                                        </td>
                                        <td className="py-3 pl-4 text-right">
                                            <button
                                                onClick={() => handleRemove(item.id)}
                                                className="text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                title="Quitar"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-8 text-sm text-gray-500 italic bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    Aún no has añadido ningún ingrediente a esta receta.
                </div>
            )}

            {/* Add New Item Form */}
            <div className="pt-6 border-t border-gray-100">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Añadir ingrediente</h4>
                <form onSubmit={handleAdd} className="flex gap-3 items-end">
                    <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">Buscar en el catálogo</label>
                        <select
                            required
                            value={selectedArticulo}
                            onChange={(e) => setSelectedArticulo(e.target.value)}
                            className="w-full rounded-md border-gray-300 py-2 px-3 text-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-black outline-none"
                        >
                            <option value="" disabled>Selecciona un ingrediente...</option>
                            {allArticulos.map(a => (
                                <option key={a.id} value={a.id}>
                                    {a.name} ({a.unit || 'uds'}) - {a.cost_price ? `${a.cost_price}€` : 'Sin coste'}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="w-32">
                        <label className="block text-xs text-gray-500 mb-1">Cantidad</label>
                        <input
                            required
                            type="number"
                            step="0.001"
                            min="0.001"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="w-full rounded-md border-gray-300 py-2 px-3 text-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-black outline-none"
                            placeholder="Ej. 1.5"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !selectedArticulo || !quantity}
                        className="bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors h-[38px] flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Añadir</>}
                    </button>
                </form>
            </div>

        </div>
    )
}
