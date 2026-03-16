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
        let body
        try {
            body = await request.json()
        } catch (e) {
            // No body
        }

        if (body && body.username && body.password) {
            // Autenticar con TSpoonLab
            const loginRes = await fetch('https://www.tspoonlab.com/recipes/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `username=${encodeURIComponent(body.username)}&password=${encodeURIComponent(body.password)}`
            })

            const remembermeHeader = loginRes.headers.get('rememberme')

            // Si la cabecera rememberme existe, el login fue exitoso
            if (remembermeHeader) {
                apiKey = remembermeHeader

                // Guardar en base de datos para futuros usos
                const { data: existingConfig } = await supabase
                    .from('tenant_config')
                    .select('id')
                    .eq('user_id', session.user.id)
                    .maybeSingle()

                if (existingConfig) {
                    const { error: dbErr } = await supabase.from('tenant_config').update({ tspoonlab_api_key: apiKey }).eq('id', existingConfig.id)
                    if (dbErr) throw dbErr
                } else {
                    const { error: dbErr } = await supabase.from('tenant_config').insert({ user_id: session.user.id, tspoonlab_api_key: apiKey })
                    if (dbErr) throw dbErr
                }
            } else {
                return NextResponse.json({ error: 'Credenciales de TSpoonLab incorrectas' }, { status: 401 })
            }
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
                    name: v.descr || 'Unknown Vendor',
                    tspoonlab_id: v.id?.toString()
                }))

                if (upsertVendors.length > 0) {
                    const { data: insertedVendors, error: vendorErr } = await supabase.from('proveedores').insert(upsertVendors).select()
                    if (vendorErr) {
                        console.error('Vendor insert error:', vendorErr)
                        throw new Error(`Error insertando proveedores: ${vendorErr.message}`)
                    }

                    // Build map for products
                    if (insertedVendors) {
                        insertedVendors.forEach(v => {
                            if (v.tspoonlab_id) provIdMap[v.tspoonlab_id] = v.id
                        })
                    }
                }
            }
        }

        // Get the default vendor to fallback
        let defaultProvId = null
        const { data: prov, error: provokeErr } = await supabase
            .from('proveedores')
            .insert({ user_id: session.user.id, name: 'TSpoonLab Default Vendor' })
            .select().single()

        if (provokeErr) {
            console.error('Default vendor insert error:', provokeErr)
        } else if (prov) {
            defaultProvId = prov.id
        }

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
                proveedor_id: p.idVendor ? (provIdMap[p.idVendor.toString()] || defaultProvId) : defaultProvId,
                name: p.descr || 'Producto sin nombre',
                tspoonlab_id: p.id?.toString(),
            }))

            if (articulos.length > 0) {
                // Insert in batches of 500 to avoid request size limits
                const batchSize = 500;
                for (let i = 0; i < articulos.length; i += batchSize) {
                    const batch = articulos.slice(i, i + batchSize);
                    const { error } = await supabase.from('articulos').insert(batch)
                    if (error) {
                        console.error('Products insert error:', error)
                        throw new Error(`Error insertando artículos: ${error.message}`)
                    }
                }
            }
        }

        return NextResponse.json({ success: true, message: 'Migración de TSpoonLab completada con éxito' })

    } catch (error: any) {
        console.error('Migration error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
