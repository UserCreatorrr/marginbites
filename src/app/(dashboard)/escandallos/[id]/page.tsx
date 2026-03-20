import { createClient } from '@/lib/supabase-server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChefHat } from 'lucide-react'
import EscandalloItemsForm from './escandallo-items-form'

export default async function EscandalloDetailPage({ params }: { params: { id: string } }) {
    const supabase = await createClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) redirect('/login')

    // Fetch the recipe (escandallo)
    const { data: escandallo, error } = await supabase
        .from('escandallos')
        .select(`
            *,
            escandallo_items(
                id,
                quantity,
                articulos (
                    id,
                    name,
                    unit,
                    cost_price
                )
            )
        `)
        .eq('id', params.id)
        .eq('user_id', session.user.id)
        .single()

    if (error || !escandallo) {
        notFound()
    }

    // Fetch all inventory items for the dropdown
    const { data: articulos } = await supabase
        .from('articulos')
        .select('id, name, unit, cost_price')
        .eq('user_id', session.user.id)
        .order('name')

    // Calculate dynamic cost
    let totalCost = 0
    const items = escandallo.escandallo_items || []

    items.forEach((item: any) => {
        if (item.articulos && item.articulos.cost_price && item.quantity) {
            totalCost += Number(item.articulos.cost_price) * Number(item.quantity)
        }
    })

    const margin = escandallo.sale_price ? ((escandallo.sale_price - totalCost) / escandallo.sale_price) * 100 : 0

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/escandallos" className="p-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-900">{escandallo.name}</h1>
                        {escandallo.category && (
                            <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-md">
                                {escandallo.category}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left col: Ingredient List & Form */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-gray-900 font-semibold">
                            <ChefHat className="w-5 h-5" />
                            Ingredientes ({items.length})
                        </div>
                    </div>
                    <div className="p-6">
                        <EscandalloItemsForm
                            escandalloId={escandallo.id}
                            initialItems={items}
                            allArticulos={articulos || []}
                        />
                    </div>
                </div>

                {/* Right col: Stats & Summary */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Márgenes y Costes</h3>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                                <span className="text-gray-500">PVP Venta</span>
                                <span className="font-medium text-gray-900">{escandallo.sale_price ? `${Number(escandallo.sale_price).toFixed(2)}€` : 'No definido'}</span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                                <span className="text-gray-500">Coste de Producción</span>
                                <span className="font-medium text-red-600">{totalCost.toFixed(2)}€</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">Margen</span>
                                <span className={`font-bold ${margin >= 65 ? 'text-green-600' : margin >= 30 ? 'text-yellow-600' : 'text-red-500'}`}>
                                    {escandallo.sale_price ? `${margin.toFixed(2)}%` : '-'}
                                </span>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                            La IA de análisis de márgenes te recomienda mantener el food-cost general por debajo del 30% (un 70% de margen) para asegurar la viabilidad del plato.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
