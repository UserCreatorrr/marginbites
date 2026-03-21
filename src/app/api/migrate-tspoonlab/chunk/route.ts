import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

const TSPOONLAB_BASE = 'https://app.tspoonlab.com/recipes/api'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await req.json()
        const { type, startDate, endDate, start = 0, rows = 500 } = body

        // Get TSpoonLab token
        const { data: config } = await supabase
            .from('tenant_config')
            .select('tspoonlab_api_key, tspoonlab_order_center')
            .eq('user_id', session.user.id)
            .single()

        if (!config?.tspoonlab_api_key) return NextResponse.json({ error: 'No TSpoonLab Token' }, { status: 400 })

        const authHeaders: Record<string, string> = {
            'rememberme': config.tspoonlab_api_key,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }

        // Add order center if available
        if (config.tspoonlab_order_center) {
            authHeaders['order'] = config.tspoonlab_order_center
        }

        let insertedCount = 0
        let hasMore = false

        // ─── VENDORS (using standard paged API) ───────────────────────────────
        if (type === 'vendors') {
            const res = await fetch(`${TSPOONLAB_BASE}/listVendorsPaged?start=${start}&rows=${rows}`, { headers: authHeaders })
            if (!res.ok) throw new Error(`TSpoonLab API Error: ${res.status}`)
            const data = await res.json()
            if (!Array.isArray(data) || data.length === 0) return NextResponse.json({ success: true, count: 0, hasMore: false })

            const { data: existing } = await supabase.from('proveedores').select('tspoonlab_id').eq('user_id', session.user.id)
            const existingSet = new Set(existing?.filter(d => d.tspoonlab_id).map(d => d.tspoonlab_id))
            const newItems = data.filter((v: any) => v.id && !existingSet.has(v.id.toString()))

            if (newItems.length > 0) {
                const upsert = newItems.map((v: any) => ({
                    user_id: session.user.id,
                    name: v.descr || v.name || 'Proveedor sin nombre',
                    email: v.email || null,
                    phone: v.phone || null,
                    tspoonlab_id: v.id.toString()
                }))
                const { error } = await supabase.from('proveedores').insert(upsert)
                if (error) throw error
                insertedCount = upsert.length
            }
            hasMore = data.length === rows
        }

        // ─── INGREDIENTS (using standard paged API) ───────────────────────────
        if (type === 'ingredients') {
            const res = await fetch(`${TSPOONLAB_BASE}/listIngredientsPaged?start=${start}&rows=${rows}`, { headers: authHeaders })
            if (!res.ok) throw new Error(`TSpoonLab API Error: ${res.status}`)
            const data = await res.json()
            if (!Array.isArray(data) || data.length === 0) return NextResponse.json({ success: true, count: 0, hasMore: false })

            const { data: provs } = await supabase.from('proveedores').select('id, tspoonlab_id').eq('user_id', session.user.id)
            const { data: existing } = await supabase.from('articulos').select('tspoonlab_id').eq('user_id', session.user.id)
            const provMap: Record<string, string> = {}
            provs?.forEach((p: any) => { if (p.tspoonlab_id) provMap[p.tspoonlab_id] = p.id })
            const existingSet = new Set(existing?.filter(d => d.tspoonlab_id).map(d => d.tspoonlab_id))
            const newItems = data.filter((p: any) => p.id && !existingSet.has(p.id.toString()))

            if (newItems.length > 0) {
                const upsert = newItems.map((p: any) => ({
                    user_id: session.user.id,
                    proveedor_id: p.idVendor ? provMap[p.idVendor.toString()] || null : null,
                    name: p.descr || p.name || 'Producto sin nombre',
                    unit: p.unit || null,
                    cost_price: p.cost || null,
                    tspoonlab_id: p.id.toString()
                }))
                const { error } = await supabase.from('articulos').insert(upsert)
                if (error) throw error
                insertedCount = upsert.length
            }
            hasMore = data.length === rows
        }

        // ─── RECIPES (Escandallos shells - no line items available in API) ────
        if (type === 'recipes') {
            const res = await fetch(`${TSPOONLAB_BASE}/listRecipesPaged?start=${start}&rows=${rows}`, { headers: authHeaders })
            if (!res.ok) throw new Error(`TSpoonLab API Error: ${res.status}`)
            const data = await res.json()
            if (!Array.isArray(data) || data.length === 0) return NextResponse.json({ success: true, count: 0, hasMore: false })

            const { data: existing } = await supabase.from('escandallos').select('name').eq('user_id', session.user.id)
            const existingNames = new Set(existing?.map((e: any) => e.name) || [])
            const newItems = data.filter((r: any) => r.descr && !existingNames.has(r.descr))

            if (newItems.length > 0) {
                const upsert = newItems.map((r: any) => ({
                    user_id: session.user.id,
                    name: r.descr || 'Receta sin nombre',
                    category: r.type || null,
                    sale_price: r.pvp || null,
                    cost_price: r.cost || null
                }))
                const { error } = await supabase.from('escandallos').insert(upsert)
                if (error) throw error
                insertedCount = upsert.length
            }
            hasMore = data.length === rows
        }

        // ─── ORDERS (using official Integration endpoint) ─────────────────────
        // Uses the integration endpoint that returns FULL line-item details
        if (type === 'orders') {
            if (!startDate || !endDate) return NextResponse.json({ error: 'startDate and endDate required for orders' }, { status: 400 })

            const url = `${TSPOONLAB_BASE}/integration/purchases/orders/all?startDate=${startDate}&endDate=${endDate}&includeInternal=true`
            const res = await fetch(url, { headers: authHeaders })
            if (!res.ok) throw new Error(`TSpoonLab Order API Error: ${res.status}`)
            const data = await res.json()
            if (!Array.isArray(data) || data.length === 0) return NextResponse.json({ success: true, count: 0, hasMore: false })

            const { data: provs } = await supabase.from('proveedores').select('id, name, tspoonlab_id').eq('user_id', session.user.id)
            const provIdMap: Record<string, string> = {}
            const provNameMap: Record<string, string> = {}
            provs?.forEach((p: any) => {
                if (p.tspoonlab_id) provIdMap[p.tspoonlab_id] = p.id
                provNameMap[p.name.toLowerCase()] = p.id
            })

            const upsert = data.map((o: any) => ({
                user_id: session.user.id,
                proveedor_id: o.idVendor
                    ? (provIdMap[o.idVendor.toString()] || provNameMap[o.vendor?.toLowerCase()] || null)
                    : (o.vendor ? provNameMap[o.vendor.toLowerCase()] || null : null),
                status: 'received',
                total_amount: o.total || null,
                items: (o.listOrders || []).map((line: any) => ({
                    name: line.component,
                    tspoonlab_id: line.idComponent,
                    quantity: line.quantity,
                    unit: line.unit,
                    price: line.cost
                }))
            }))

            const { error } = await supabase.from('pedidos').insert(upsert)
            if (error) throw error
            insertedCount = upsert.length
            hasMore = false // Date-range based, so all results are in one call
        }

        // ─── ALBARANES (using official Integration endpoint) ──────────────────
        if (type === 'albaranes') {
            if (!startDate || !endDate) return NextResponse.json({ error: 'startDate and endDate required for albaranes' }, { status: 400 })

            const url = `${TSPOONLAB_BASE}/integration/purchases/deliveries/all?startDate=${startDate}&endDate=${endDate}&includeInternal=true`
            const res = await fetch(url, { headers: authHeaders })
            if (!res.ok) throw new Error(`TSpoonLab Albarán API Error: ${res.status}`)
            const data = await res.json()
            if (!Array.isArray(data) || data.length === 0) return NextResponse.json({ success: true, count: 0, hasMore: false })

            const { data: provs } = await supabase.from('proveedores').select('id, name, tspoonlab_id').eq('user_id', session.user.id)
            const provIdMap: Record<string, string> = {}
            const provNameMap: Record<string, string> = {}
            provs?.forEach((p: any) => {
                if (p.tspoonlab_id) provIdMap[p.tspoonlab_id] = p.id
                provNameMap[p.name.toLowerCase()] = p.id
            })

            const upsert = data.map((d: any) => ({
                user_id: session.user.id,
                proveedor_id: d.idVendor
                    ? (provIdMap[d.idVendor.toString()] || provNameMap[d.vendor?.toLowerCase()] || null)
                    : null,
                status: 'approved',
                extracted_data: {
                    deliveryNum: d.deliveryNum,
                    date: d.dateFormatted,
                    vendor: d.vendor,
                    base: d.base,
                    taxes: d.taxes,
                    total: d.total,
                    lines: (d.listDeliveries || []).map((line: any) => ({
                        name: line.component,
                        quantity: line.quantity,
                        unit: line.unit,
                        cost: line.cost
                    }))
                }
            }))

            const { error } = await supabase.from('albaranes').insert(upsert)
            if (error) throw error
            insertedCount = upsert.length
            hasMore = false
        }

        return NextResponse.json({ success: true, count: insertedCount, hasMore })

    } catch (err: any) {
        console.error(`Chunk migration error:`, err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
