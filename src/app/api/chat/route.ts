import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { messages } = await request.json()

        // Este es un bot muy básico. Idealmente aquí iría un loop de Function Calling 
        // para consultar la BD. Por ahora sólo responde de forma genérica.
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "You are the MARGINBITES AI assistant. You help restaurant managers with their stock and orders. You are helpful and concise."
                },
                ...messages
            ],
        })

        const reply = response.choices[0].message

        return NextResponse.json({ message: reply })

    } catch (error: any) {
        console.error('Chat error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
