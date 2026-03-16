import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import OpenAI from 'openai'



export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        // Convert file to base64 for OpenAI Vision API
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const base64Image = buffer.toString('base64')

        // Call OpenAI Vision API
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        })

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "You are an expert OCR and data extraction system for restaurant invoices (albaranes). Extract the provider name, total amount, and a list of items with their quantities. Return ONLY a JSON object with this structure: { \"provider_name\": \"string\", \"total_amount\": number, \"items\": [ { \"name\": \"string\", \"quantity\": number, \"unit\": \"string\" } ] }"
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Please extract the invoice data from this image." },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${file.type};base64,${base64Image}`,
                            },
                        },
                    ],
                },
            ],
            response_format: { type: "json_object" }
        });

        const extractionResultString = response.choices[0].message.content

        if (!extractionResultString) {
            throw new Error("No data extracted by OpenAI")
        }

        const extractedData = JSON.parse(extractionResultString)

        // Save to Supabase (simplificado para MVP)
        // Buscamos o creamos el proveedor
        let proveedorId = null
        if (extractedData.provider_name) {
            const { data: prov } = await supabase
                .from('proveedores')
                .select('id')
                .ilike('name', extractedData.provider_name)
                .eq('user_id', session.user.id)
                .maybeSingle()

            if (prov) {
                proveedorId = prov.id
            } else {
                const { data: newProv } = await supabase
                    .from('proveedores')
                    .insert({ user_id: session.user.id, name: extractedData.provider_name })
                    .select('id').single()
                proveedorId = newProv?.id
            }
        }

        // Guardar el albarán
        const { data: albaran, error: albaranError } = await supabase
            .from('albaranes')
            .insert({
                user_id: session.user.id,
                proveedor_id: proveedorId,
                status: 'needs_review',
                extracted_data: extractedData
            })
            .select()
            .single()

        if (albaranError) throw albaranError

        return NextResponse.json({ success: true, data: albaran })
    } catch (error: any) {
        console.error('OCR Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
