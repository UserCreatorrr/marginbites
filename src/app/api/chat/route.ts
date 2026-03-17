import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { createClient } from '@/lib/supabase-server'

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export async function POST(req: Request) {
    try {
        const { messages } = await req.json()

        // Authenticate user
        const supabase = await createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            return new Response('Unauthorized', { status: 401 })
        }

        // Fetch basic context (products and inventory) to give the AI context about the user's business
        const { data: articulos } = await supabase
            .from('articulos')
            .select('id, name, sku, unit')
            .eq('user_id', session.user.id)
            .limit(50)

        // Generate a system prompt with real context
        const contextString = articulos
            ? `\nYour specific catalog of items (Top 50):\n${articulos.map(a => `- ${a.name} (${a.unit || 'uds'})`).join('\n')}`
            : ''

        const systemPrompt = `You are the AI assistant for MARGINBITES, an advanced restaurant and inventory management system that replaces TSpoonLab. 
You speak Spanish natively but can understand other languages.
Your goal is to help the restaurant manager (the user) analyze their business, understand their inventory, and eventually place orders.
Be professional, concise, and helpful.

${contextString}`

        // Call the language model
        const result = streamText({
            model: openai('gpt-4o'),
            system: systemPrompt,
            messages,
            // In the future we will add tools here to interact with the database directly
        })

        // Respond with the stream
        return result.toDataStreamResponse()

    } catch (error: any) {
        console.error('Chat API Error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}
