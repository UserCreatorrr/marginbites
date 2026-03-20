import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { proveedor_id, items, send_via } = await req.json()

        if (!proveedor_id || !items || items.length === 0) {
            return NextResponse.json({ error: 'Faltan datos del pedido' }, { status: 400 })
        }

        // Create the order in Supabase
        const { data: pedido, error } = await supabase
            .from('pedidos')
            .insert({
                user_id: session.user.id,
                proveedor_id,
                status: send_via ? 'sent' : 'draft',
                items,
                total_amount: null // Could calculate if we have prices
            })
            .select('*, proveedores(name, email, phone)')
            .single()

        if (error) throw error

        // If send_via was requested, we'd call OpenClaw here
        if (send_via && pedido) {
            const proveedor = (pedido as any).proveedores
            const itemsText = items
                .map((item: any) => `- ${item.name}: ${item.quantity} ${item.unit}`)
                .join('\n')
            const message = `🛒 *Pedido MARGINBITES*\n\nProveedor: ${proveedor?.name}\n\n*Artículos:*\n${itemsText}\n\n_Enviado desde MARGINBITES_`

            // Attempt to notify via OpenClaw (non-blocking)
            try {
                const openclawUrl = process.env.OPENCLAW_URL
                if (openclawUrl) {
                    await fetch(`${openclawUrl}/send`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            channel: send_via,
                            to: send_via === 'email' ? proveedor?.email : proveedor?.phone,
                            message
                        })
                    })
                }
            } catch (ocError) {
                console.warn('OpenClaw notification failed (non-critical):', ocError)
            }
        }

        return NextResponse.json({ success: true, data: pedido })
    } catch (err: any) {
        console.error('Pedidos API error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function GET() {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
        .from('pedidos')
        .select('*, proveedores(name)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}
