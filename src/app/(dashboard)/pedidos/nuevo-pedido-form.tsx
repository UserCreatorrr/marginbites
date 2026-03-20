'use client'

import { useState } from 'react'
import { Plus, Loader2, Trash2, Send, MessageCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Proveedor { id: string; name: string }
interface Articulo { id: string; name: string; unit: string | null }

interface LineItem { articulo_id: string; name: string; quantity: number; unit: string }

export default function NuevoPedidoForm({ proveedores, articulos }: { proveedores: Proveedor[], articulos: Articulo[] }) {
    const [open, setOpen] = useState(false)
    const [proveedorId, setProveedorId] = useState('')
    const [lines, setLines] = useState<LineItem[]>([])
    const [loading, setLoading] = useState(false)
    const [sendMode, setSendMode] = useState<'email' | 'whatsapp' | null>(null)
    const router = useRouter()

    const addLine = () => {
        const first = articulos[0]
        if (!first) return
        setLines(prev => [...prev, { articulo_id: first.id, name: first.name, quantity: 1, unit: first.unit || 'uds' }])
    }

    const removeLine = (i: number) => setLines(prev => prev.filter((_, idx) => idx !== i))

    const updateLine = (i: number, field: keyof LineItem, value: string | number) => {
        setLines(prev => {
            const updated = [...prev]
            if (field === 'articulo_id') {
                const art = articulos.find(a => a.id === value)
                if (art) updated[i] = { ...updated[i], articulo_id: art.id, name: art.name, unit: art.unit || 'uds' }
            } else {
                // @ts-ignore
                updated[i] = { ...updated[i], [field]: value }
            }
            return updated
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!proveedorId || lines.length === 0) return
        setLoading(true)
        try {
            const res = await fetch('/api/pedidos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ proveedor_id: proveedorId, items: lines, send_via: sendMode })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setOpen(false)
            setLines([])
            setProveedorId('')
            setSendMode(null)
            router.refresh()
        } catch (err: any) {
            alert(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
                <Plus className="h-4 w-4 mr-2" />Nuevo Pedido
            </button>
        )
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="px-6 py-5 border-b flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">Nuevo Pedido</h2>
                    <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                        <select
                            value={proveedorId}
                            onChange={e => setProveedorId(e.target.value)}
                            required
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-black focus:border-black"
                        >
                            <option value="">Selecciona un proveedor...</option>
                            {proveedores.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">Artículos</label>
                            <button type="button" onClick={addLine} className="text-xs text-black underline">+ Añadir línea</button>
                        </div>

                        {lines.length === 0 && (
                            <div className="text-center py-4 border-2 border-dashed rounded-lg text-sm text-gray-400">
                                Haz clic en "Añadir línea" para agregar artículos
                            </div>
                        )}

                        <div className="space-y-2">
                            {lines.map((line, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                    <select
                                        value={line.articulo_id}
                                        onChange={e => updateLine(i, 'articulo_id', e.target.value)}
                                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                    >
                                        {articulos.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                    <input
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={line.quantity}
                                        onChange={e => updateLine(i, 'quantity', parseFloat(e.target.value))}
                                        className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm text-center"
                                    />
                                    <span className="text-xs text-gray-500 w-10">{line.unit}</span>
                                    <button type="button" onClick={() => removeLine(i)} className="text-red-400 hover:text-red-600">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Send options */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Enviar al proveedor (opcional)</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setSendMode(sendMode === 'email' ? null : 'email')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${sendMode === 'email' ? 'border-black bg-black text-white' : 'border-gray-300 text-gray-700 hover:border-gray-400'}`}
                            >
                                <Send className="h-4 w-4" />Email
                            </button>
                            <button
                                type="button"
                                onClick={() => setSendMode(sendMode === 'whatsapp' ? null : 'whatsapp')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${sendMode === 'whatsapp' ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300 text-gray-700 hover:border-gray-400'}`}
                            >
                                <MessageCircle className="h-4 w-4" />WhatsApp
                            </button>
                        </div>
                        {sendMode && (
                            <p className="text-xs text-gray-500 mt-1">
                                {sendMode === 'whatsapp' ? 'El pedido se enviará vía WhatsApp a través de OpenClaw.' : 'El pedido se enviará por email al proveedor.'}
                            </p>
                        )}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !proveedorId || lines.length === 0}
                            className="flex-1 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {sendMode ? 'Guardar y Enviar' : 'Guardar Pedido'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
