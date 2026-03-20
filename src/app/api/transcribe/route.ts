import OpenAI from 'openai'
import { createClient } from '@/lib/supabase-server'

const openai = new OpenAI()

export async function POST(req: Request) {
    try {
        // Authenticate user
        const supabase = await createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            return new Response('Unauthorized', { status: 401 })
        }

        const formData = await req.formData()
        const audioFile = formData.get('audio') as File
        if (!audioFile) {
            return Response.json({ error: 'No audio file provided' }, { status: 400 })
        }

        // Use Whisper-1 model to transcribe audio
        const transcription = await openai.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
            language: 'es', // Default to Spanish
        })

        return Response.json({ text: transcription.text })

    } catch (error: any) {
        console.error('Transcription error:', error)
        return Response.json({ error: error.message }, { status: 500 })
    }
}
