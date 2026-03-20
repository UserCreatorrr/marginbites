import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        if (!body.username || !body.password) {
            return NextResponse.json({ error: 'Credenciales incompletas' }, { status: 400 })
        }

        // Authenticate with TSpoonLab
        const loginRes = await fetch('https://www.tspoonlab.com/recipes/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `username=${encodeURIComponent(body.username)}&password=${encodeURIComponent(body.password)}`
        })

        const remembermeHeader = loginRes.headers.get('rememberme')

        if (remembermeHeader) {
            // Save token
            const { data: existingConfig } = await supabase.from('tenant_config').select('id').eq('user_id', session.user.id).maybeSingle()
            if (existingConfig) {
                await supabase.from('tenant_config').update({ tspoonlab_api_key: remembermeHeader }).eq('id', existingConfig.id)
            } else {
                await supabase.from('tenant_config').insert({ user_id: session.user.id, tspoonlab_api_key: remembermeHeader })
            }
            return NextResponse.json({ success: true })
        } else {
            return NextResponse.json({ error: 'Credenciales de TSpoonLab incorrectas' }, { status: 401 })
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
