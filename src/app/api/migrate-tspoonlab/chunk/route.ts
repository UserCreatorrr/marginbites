import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await req.json()
        const { type, start = 0, rows = 100 } = body

        // Get TSpoonLab token
        const { data: config } = await supabase.from('tenant_config').select('tspoonlab_api_key').eq('user_id', session.user.id).single()
        if (!config || !config.tspoonlab_api_key) return NextResponse.json({ error: 'No TSpoonLab Token' }, { status: 400 })

        const headers = { 'rememberme': config.tspoonlab_api_key, 'Accept': 'application/json' }
        let endpoint = ''

        switch (type) {
            case 'vendors': endpoint = `listVendorsPaged?start=${start}&rows=${rows}`; break;
            case 'ingredients': endpoint = `listIngredientsPaged?start=${start}&rows=${rows}`; break;
            case 'recipes': endpoint = `listRecipesPaged?start=${start}&rows=${rows}`; break;
            case 'orders': endpoint = `listOrdersPaged?start=${start}&rows=${rows}`; break;
            default: return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
        }

        const res = await fetch(`https://app.tspoonlab.com/recipes/api/${endpoint}`, { headers })
        if (!res.ok) throw new Error(`TSpoonLab API Error: ${res.status}`)

        const data = await res.json()
        if (!Array.isArray(data)) {
            // Some endpoints return empty objects when no more pages, treating as empty array
            return NextResponse.json({ success: true, count: 0, hasMore: false })
        }

        let insertedCount = 0

        // Helper to avoid duplicates
        const filterNew = (apiData: any[], dbData: any[], idField: string = 'tspoonlab_id') => {
            const existingSet = new Set(dbData.filter(d => Boolean(d[idField])).map(d => d[idField]))
            return apiData.filter(d => d.id && !existingSet.has(d.id.toString()))
        }

        // Handle Vendors
        if (type === 'vendors' && data.length > 0) {
            const { data: existing } = await supabase.from('proveedores').select('tspoonlab_id').eq('user_id', session.user.id)
            const newItems = filterNew(data, existing || [])

            if (newItems.length > 0) {
                const upsert = newItems.map((v: any) => ({ user_id: session.user.id, name: v.descr || 'Unknown Vendor', tspoonlab_id: v.id.toString() }))
                const { error } = await supabase.from('proveedores').insert(upsert)
                if (error) throw error
                insertedCount = upsert.length
            }
        }

        // Handle Ingredients
        if (type === 'ingredients' && data.length > 0) {
            const { data: provs } = await supabase.from('proveedores').select('id, tspoonlab_id').eq('user_id', session.user.id)
            const { data: existing } = await supabase.from('articulos').select('tspoonlab_id').eq('user_id', session.user.id)
            const provMap: Record<string, string> = {}
            provs?.forEach(p => { if (p.tspoonlab_id) provMap[p.tspoonlab_id] = p.id })

            const newItems = filterNew(data, existing || [])

            if (newItems.length > 0) {
                const upsert = newItems.map((p: any) => ({
                    user_id: session.user.id,
                    proveedor_id: p.idVendor ? provMap[p.idVendor.toString()] : null,
                    name: p.descr || 'Producto sin nombre',
                    tspoonlab_id: p.id.toString()
                }))
                const { error } = await supabase.from('articulos').insert(upsert)
                if (error) throw error
                insertedCount = upsert.length
            }
        }

        // Handle Recipes (Escandallos)
        if (type === 'recipes' && data.length > 0) {
            const { data: existing } = await supabase.from('escandallos').select('name').eq('user_id', session.user.id)
            const existingNames = new Set(existing?.map(e => e.name) || [])
            const newItems = data.filter((r: any) => r.descr && !existingNames.has(r.descr))

            if (newItems.length > 0) {
                const upsert = newItems.map((r: any) => ({
                    user_id: session.user.id,
                    name: r.descr || 'Receta sin nombre',
                    sale_price: r.pvp || null
                }))
                const { error } = await supabase.from('escandallos').insert(upsert)
                if (error) throw error
                insertedCount = upsert.length
            }
        }

        // Handle Orders (Pedidos)
        if (type === 'orders' && data.length > 0) {
            const { data: provs } = await supabase.from('proveedores').select('id, name').eq('user_id', session.user.id)
            const provNameMap: Record<string, string> = {}
            provs?.forEach(p => provNameMap[p.name.toLowerCase()] = p.id)

            // Simplistic deduplication for orders based on creation date to avoid flooding
            const { data: existing } = await supabase.from('pedidos').select('id').eq('user_id', session.user.id)
            if (!existing || existing.length === 0) {
                const upsert = data.map((o: any) => {
                    let status = 'draft'
                    if (o.pendingReceive > 0) status = 'sent'
                    else if (o.countReview > 0) status = 'received'

                    return {
                        user_id: session.user.id,
                        proveedor_id: o.descr ? provNameMap[o.descr.toLowerCase()] || null : null,
                        status: status,
                        items: [] // Empty items since API doesn't provide them easily
                    }
                })
                const { error } = await supabase.from('pedidos').insert(upsert)
                if (error) throw error
                insertedCount = upsert.length
            }
        }

        return NextResponse.json({
            success: true,
            count: insertedCount,
            hasMore: data.length === rows
        })

    } catch (err: any) {
        console.error(`Chunk error (${req.url}):`, err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
