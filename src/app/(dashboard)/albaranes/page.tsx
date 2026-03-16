import { createClient } from '@/lib/supabase-server'
import AlbaranUpload from './albaran-upload'

export default async function AlbaranesPage() {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    const { data: albaranes } = await supabase
        .from('albaranes')
        .select('*, proveedores(name)')
        .eq('user_id', session?.user?.id)
        .order('created_at', { ascending: false })

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white px-4 py-5 sm:px-6 shadow sm:rounded-lg">
                <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Albaranes
                    </h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                        Sube fotos o PDFs de tus albaranes para extraer datos automáticamente con IA.
                    </p>
                </div>
                <AlbaranUpload />
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul role="list" className="divide-y divide-gray-200">
                    {albaranes?.map((albaran) => (
                        <li key={albaran.id}>
                            <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                                <div className="flex items-center">
                                    <p className="text-sm font-medium text-blue-600 truncate">
                                        {albaran.proveedores?.name || 'Proveedor Desconocido'}
                                    </p>
                                    <div className="ml-2 flex-shrink-0 flex">
                                        <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${albaran.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                albaran.status === 'needs_review' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {albaran.status}
                                        </p>
                                    </div>
                                </div>
                                <div className="ml-2 flex-shrink-0 flex items-center">
                                    <span className="text-sm text-gray-500">
                                        Coto: {albaran.extracted_data?.total_amount ? `${albaran.extracted_data.total_amount}€` : '-'}
                                    </span>
                                </div>
                            </div>
                        </li>
                    ))}
                    {(!albaranes || albaranes.length === 0) && (
                        <li className="px-4 py-8 text-center text-sm text-gray-500">No hay albaranes subidos todavía.</li>
                    )}
                </ul>
            </div>
        </div>
    )
}
