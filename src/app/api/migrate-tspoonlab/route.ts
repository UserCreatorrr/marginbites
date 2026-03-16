import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let apiKey = ''

        // Check if we received credentials in the body
        try {
            const body = await request.json()
            if (body.username && body.password) {
                // Autenticar con TSpoonLab
                const loginRes = await fetch('https://www.tspoonlab.com/recipes/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: `username=${encodeURIComponent(body.username)}&password=${encodeURIComponent(body.password)}`
                })

                const setCookieHeader = loginRes.headers.get('set-cookie') || loginRes.headers.get('Set-Cookie')

                // Si la cookie rememberme existe, el login fue exitoso
                if (setCookieHeader && setCookieHeader.includes('rememberme=')) {
                    // Extract the rememberme token
                    const matches = setCookieHeader.match(/rememberme=([^;]+)/)
                    if (matches && matches[1]) {
                        apiKey = matches[1]

                        // Guardar en base de datos para futuros usos
                        await supabase
                            .from('tenant_config')
                            .upsert({ user_id: session.user.id, tspoonlab_api_key: apiKey }, { onConflict: 'user_id' })
                    }
                } else {
                    return NextResponse.json({ error: 'Credenciales de TSpoonLab incorrectas' }, { status: 401 })
                }
            }
        } catch (e) {
            // Ignorar errores de parseo si no hay body
        }

        // Si no se proporcionaron credenciales o fallaron, intentamos cargar de DB
        if (!apiKey) {
            const { data: config } = await supabase
                .from('tenant_config')
                .select('tspoonlab_api_key')
                .eq('user_id', session.user.id)
                .single()

            if (!config || !config.tspoonlab_api_key) {
                return NextResponse.json({ error: 'No TSpoonLab API key found and no credentials provided' }, { status: 400 })
            }
            apiKey = config.tspoonlab_api_key
        }

        // Para simplificar, asumimos que el usuario introdujo su token "rememberme"
        const headers = {
            'rememberme': apiKey,
            'Accept': 'application/json'
        }

        // 1. Fetch Vendors (Proveedores)
        const vendorsRes = await fetch('https://app.tspoonlab.com/recipes/api/listVendorsPaged?start=0&rows=1000', { headers })

        let provIdMap: Record<string, string> = {} // tSpoonlabId -> SupabaseId

        if (vendorsRes.ok) {
            const vendorsData = await vendorsRes.json()
            if (Array.isArray(vendorsData)) {
                // Insert vendors
                const upsertVendors = vendorsData.map((v: any) => ({
                    user_id: session.user.id,
                    name: v.descr || 'Unknown Vendor'
                }))

                if (upsertVendors.length > 0) {
                    const { data: insertedVendors } = await supabase.from('proveedores').upsert(upsertVendors, { onConflict: 'id', ignoreDuplicates: false }).select()

                    // Basic mapping attempt, Tspoonlab doesn't give us the inserted ID back directly in a bulk upsert without matching on name or something
                    // For MVP if we can't map exactly, we'll fall back to a default vendor.
                }
            }
        }

        // Get the default vendor to fallback
        const { data: prov } = await supabase
            .from('proveedores')
            .upsert({ user_id: session.user.id, name: 'TSpoonLab Default Vendor' }, { onConflict: 'id' })
            .select().single()

        // 2. Fetch Ingredients (Productos)
        const productsRes = await fetch('https://app.tspoonlab.com/recipes/api/listIngredientsPaged?start=0&rows=2000', { headers })

        if (!productsRes.ok) {
            console.error('Failed to fetch TSpoonLab ingredients', await productsRes.text())
            throw new Error('No se pudo conectar con TSpoonLab. Verifica tu API Key / Token.')
        }

        const productsData = await productsRes.json()

        if (Array.isArray(productsData)) {
            const articulos = productsData.map((p: any) => ({
                user_id: session.user.id,
                proveedor_id: prov?.id || null,
                name: p.descr || 'Producto sin nombre',
                tspoonlab_id: p.id?.toString(),
            }))

            if (articulos.length > 0) {
                const { error } = await supabase.from('articulos').upsert(articulos, { onConflict: 'id', ignoreDuplicates: false })
                if (error) throw error
            }
        }

        return NextResponse.json({ success: true, message: 'Migración de TSpoonLab completada con éxito' })

    } catch (error: any) {
        console.error('Migration error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
