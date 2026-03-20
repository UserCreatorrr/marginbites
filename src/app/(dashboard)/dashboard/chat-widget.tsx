'use client'

import { useRef, useEffect, useState } from 'react'
import { Send, Loader2, Bot, User, Mic, MicOff } from 'lucide-react'
import { useChat } from 'ai/react'
import ReactMarkdown from 'react-markdown'

export default function ChatWidget() {
    const { messages, input, handleInputChange, handleSubmit, isLoading, setInput, append } = useChat({
        api: '/api/chat',
        initialMessages: [
            {
                id: 'welcome',
                role: 'assistant',
                content: '¡Hola! Soy Margin, tu asistente inteligente de MARGINBITES. Puedo ayudarte a analizar tu inventario, ver proveedores o preparar pedidos. ¿En qué te ayudo hoy?'
            }
        ]
    })

    // Voice recording state
    const [isRecording, setIsRecording] = useState(false)
    const [isTranscribing, setIsTranscribing] = useState(false)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])

    // Auto-scroll to bottom of chat
    const messagesEndRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorderRef.current = mediaRecorder
            audioChunksRef.current = []

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data)
                }
            }

            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach(track => track.stop())
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
                await transcribeAudio(audioBlob)
            }

            mediaRecorder.start()
            setIsRecording(true)
        } catch (error) {
            console.error('Error accessing microphone:', error)
            alert('No se pudo acceder al micrófono. Comprueba los permisos del navegador.')
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
        }
    }

    const transcribeAudio = async (audioBlob: Blob) => {
        setIsTranscribing(true)
        try {
            const formData = new FormData()
            formData.append('audio', audioBlob, 'recording.webm')

            const res = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData,
            })

            const data = await res.json()
            if (data.text) {
                // Directly send the transcribed text as a message
                await append({ role: 'user', content: data.text })
            }
        } catch (error) {
            console.error('Transcription error:', error)
        } finally {
            setIsTranscribing(false)
        }
    }

    const handleVoiceButton = () => {
        if (isRecording) {
            stopRecording()
        } else {
            startRecording()
        }
    }

    return (
        <div className="flex flex-col h-[600px] bg-white shadow-xl rounded-xl overflow-hidden border border-gray-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-black text-white flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="bg-white/10 p-2 rounded-full">
                        <Bot className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold leading-none mb-1">Asistente Inteligente</h3>
                        <p className="text-xs text-gray-300">GPT-4o · Whisper-1 · Texto y voz</p>
                    </div>
                </div>
                {(isRecording || isTranscribing) && (
                    <div className="flex items-center space-x-2 bg-red-500/20 border border-red-500/40 rounded-full px-3 py-1">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        <span className="text-xs text-red-300">{isTranscribing ? 'Transcribiendo...' : 'Grabando...'}</span>
                    </div>
                )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-gray-50/50">
                {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                            <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${m.role === 'user' ? 'bg-gray-200 text-gray-600' : 'bg-black text-white'
                                }`}>
                                {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                            </div>
                            <div className={`rounded-2xl px-5 py-3.5 shadow-sm text-sm ${m.role === 'user'
                                    ? 'bg-black text-white rounded-br-none'
                                    : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none prose prose-sm max-w-none'
                                }`}>
                                {m.role === 'user' ? (
                                    <p className="whitespace-pre-wrap">{m.content}</p>
                                ) : (
                                    <ReactMarkdown>{m.content}</ReactMarkdown>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                    <div className="flex justify-start">
                        <div className="flex items-center space-x-2 bg-white border border-gray-100 rounded-2xl rounded-bl-none px-5 py-3 shadow-sm">
                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                            <span className="text-sm text-gray-500">Margin está pensando...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100">
                <form onSubmit={handleSubmit} className="flex space-x-2 max-w-3xl mx-auto">
                    {/* Voice Button */}
                    <button
                        type="button"
                        onClick={handleVoiceButton}
                        disabled={isLoading || isTranscribing}
                        title={isRecording ? 'Detener grabación' : 'Grabar nota de voz'}
                        className={`inline-flex items-center justify-center h-11 w-11 flex-shrink-0 rounded-full shadow-md transition-colors disabled:opacity-50 ${isRecording
                                ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>

                    <input
                        className="flex-1 w-full rounded-full border-gray-300 bg-gray-50 py-3 px-5 focus:border-black focus:ring-black focus:bg-white sm:text-sm border shadow-inner transition-all"
                        placeholder={isRecording ? 'Grabando... pulsa el micrófono para detener' : 'Escribe o graba una nota de voz...'}
                        value={input}
                        onChange={handleInputChange}
                        disabled={isLoading || isRecording}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim() || isRecording}
                        className="inline-flex items-center justify-center h-11 w-11 flex-shrink-0 rounded-full shadow-md text-white bg-black hover:bg-gray-800 disabled:opacity-50 transition-colors"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </form>
            </div>
        </div>
    )
}
