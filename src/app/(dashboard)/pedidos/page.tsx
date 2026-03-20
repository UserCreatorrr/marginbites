import { createClient } from '@/lib/supabase-server'
import NuevoPedidoForm from './nuevo-pedido-form'

export default async function PedidosPage() {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    const [{ data: pedidos }, { data: proveedores }, { data: articulos }] = await Promise.all([
        supabase.from('pedidos').select('*, proveedores(name)').eq('user_id', session?.user.id).order('created_at', { ascending: false }),
        supabase.from('proveedores').select('id, name').eq('user_id', session?.user.id).order('name'),
        supabase.from('articulos').select('id, name, unit').eq('user_id', session?.user.id).order('name')
    ])

    const statusLabel: Record<string, string> = {
        draft: 'Borrador',
        sent: 'Enviado',
        received: 'Recibido',
        cancelled: 'Cancelado'
    }
    const statusColors: Record<string, string> = {
        draft: 'bg-gray-100 text-gray-700',
        sent: 'bg-blue-100 text-blue-700',
        received: 'bg-green-100 text-green-700',
        cancelled: 'bg-red-100 text-red-700'
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
                    <p className="text-sm text-gray-500 mt-1">Crea pedidos manualmente o deja que la IA los genere según tu stock.</p>
                </div>
                <NuevoPedidoForm proveedores={proveedores || []} articulos={articulos || []} />
            </div>

            {/* Pedidos List */}
            <div className="bg-white shadow sm:rounded-lg overflow-hidden">
                {pedidos && pedidos.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {pedidos.map((pedido) => (
                                <tr key={pedido.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {/* @ts-ignore */}
                                        {pedido.proveedores?.name || 'Sin proveedor'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(pedido.created_at).toLocaleDateString('es-ES')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[pedido.status] || statusColors.draft}`}>
                                            {statusLabel[pedido.status] || pedido.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {pedido.total_amount ? `${pedido.total_amount}€` : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        <a href={`/pedidos/${pedido.id}`} className="text-black hover:underline font-medium">Ver</a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="text-center py-12 text-gray-400">
                        <p className="text-sm">No hay pedidos todavía.</p>
                        <p className="text-xs mt-1">Crea tu primer pedido con el botón de arriba.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
