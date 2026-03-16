import { createClient } from '@/lib/supabase-server'
import ChatWidget from './chat-widget'

export default async function DashboardPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id)
        .single()

    return (
        <div className="space-y-6">
            <div className="bg-white px-4 py-5 sm:px-6 shadow sm:rounded-lg">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Welcome back
                </h3>
                <div className="mt-2 max-w-xl text-sm text-gray-500">
                    <p>
                        You are signed in as {user?.email}
                        {roleData?.role === 'superadmin' && (
                            <span className="ml-2 inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                Super Admin
                            </span>
                        )}
                    </p>
                </div>
            </div>

            {/* Aqui iran los quick widgets de IA y resumen de pedidos */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <dt className="text-sm font-medium text-gray-500 truncate">Pending Orders</dt>
                        <dd className="mt-1 text-3xl font-semibold text-gray-900">0</dd>
                    </div>
                </div>
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <dt className="text-sm font-medium text-gray-500 truncate">Recent Scans</dt>
                        <dd className="mt-1 text-3xl font-semibold text-gray-900">0</dd>
                    </div>
                </div>
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <dt className="text-sm font-medium text-gray-500 truncate">Inventory Issues</dt>
                        <dd className="mt-1 text-3xl font-semibold text-gray-900">0</dd>
                    </div>
                </div>
            </div>

            <div className="mt-8">
                <ChatWidget />
            </div>
        </div>
    )
}
