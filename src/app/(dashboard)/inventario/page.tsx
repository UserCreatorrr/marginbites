import { createClient } from '@/lib/supabase-server'

export default async function InventarioPage() {
    const supabase = await createClient()

    const { data: { session } } = await supabase.auth.getSession()

    const { data: articulos, error } = await supabase
        .from('articulos')
        .select(`
            id,
            name,
            sku,
            unit,
            proveedores (
                name
            )
        `)
        .eq('user_id', session?.user.id)
        .order('name')
        .limit(100)

    return (
        <div className="space-y-6">
            <div className="bg-white px-4 py-5 sm:px-6 shadow sm:rounded-lg">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Inventario y Stock Ledger
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    En esta pantalla se listarán todos los artículos y sus niveles de stock actuales.
                </p>

                <div className="mt-6">
                    <h4 className="text-md font-semibold mb-4">
                        Tus Artículos ({articulos?.length || 0} mostrados)
                    </h4>

                    {error ? (
                        <div className="text-red-500">Error cargando inventario: {error.message}</div>
                    ) : articulos && articulos.length > 0 ? (
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-300">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Nombre</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Proveedor</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Unidad</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {articulos.map((item) => (
                                        <tr key={item.id}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                                {item.name}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                {/* @ts-ignore */}
                                                {item.proveedores?.name || 'Desconocido'}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                {item.unit || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded-md border border-gray-200">
                            Todavía no se han importado artículos. Si acabas de sincronizar TSpoonLab, los datos podrían estar tardando unos segundos o la migración falló.
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
