import { createClient } from '@/lib/supabase-server'
import NuevoEscandallo from './nuevo-escandallo'
import Link from 'next/link'

export default async function EscandállosPage() {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    const [{ data: escandallos }, { data: articulos }] = await Promise.all([
        supabase.from('escandallos').select('*, escandallo_items(count)').eq('user_id', session?.user.id).order('name'),
        supabase.from('articulos').select('id, name, unit').eq('user_id', session?.user.id).order('name')
    ])

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Escandallos</h1>
                    <p className="text-sm text-gray-500 mt-1">Define recetas y calcula el coste real y margen de cada plato automáticamente.</p>
                </div>
                <NuevoEscandallo articulos={articulos || []} />
            </div>

            {/* Escandallos Grid */}
            {escandallos && escandallos.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {escandallos.map((e: any) => (
                        <Link href={`/escandallos/${e.id}`} key={e.id}
                            className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-400 hover:shadow-md transition-all group"
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-semibold text-gray-900 group-hover:text-black">{e.name}</h3>
                                    <p className="text-xs text-gray-400 mt-0.5">{e.category || 'Sin categoría'}</p>
                                </div>
                                {e.sale_price && (
                                    <span className="text-sm font-bold text-gray-900">{e.sale_price}€</span>
                                )}
                            </div>
                            <div className="mt-4 flex items-center gap-4">
                                <div>
                                    <p className="text-xs text-gray-400">Coste</p>
                                    <p className="text-sm font-semibold text-red-600">
                                        {e.cost_price ? `${Number(e.cost_price).toFixed(2)}€` : '-'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Margen</p>
                                    <p className="text-sm font-semibold text-green-600">
                                        {e.cost_price && e.sale_price
                                            ? `${(((e.sale_price - e.cost_price) / e.sale_price) * 100).toFixed(1)}%`
                                            : '-'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Ingredientes</p>
                                    <p className="text-sm font-semibold text-gray-700">
                                        {/* @ts-ignore */}
                                        {e.escandallo_items?.[0]?.count ?? 0}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="bg-white shadow sm:rounded-xl p-12 text-center border border-dashed border-gray-300">
                    <p className="text-gray-500 text-sm">Todavía no tienes escandallos.</p>
                    <p className="text-gray-400 text-xs mt-1">Crea tu primer escandallo para calcular márgenes y sangrado de stock.</p>
                </div>
            )}
        </div>
    )
}
