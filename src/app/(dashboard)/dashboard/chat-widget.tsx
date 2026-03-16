'use client'

import { useState } from 'react'
import { Send, Loader2 } from 'lucide-react'

export default function ChatWidget() {
    const [messages, setMessages] = useState<{ role: string, content: string }[]>([
        { role: 'assistant', content: '¡Hola! Soy tu asistente de MARGINBITES. ¿En qué te puedo ayudar hoy?' }
    ])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || loading) return

        const newMessages = [...messages, { role: 'user', content: input }]
        setMessages(newMessages)
        setInput('')
        setLoading(true)

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: newMessages.slice(-5) }), // Send last 5 for context
            })

            const data = await res.json()
            if (data.message) {
                setMessages(prev => [...prev, data.message])
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-[500px] bg-white shadow sm:rounded-lg overflow-hidden border border-gray-200">
            <div className="px-4 py-5 border-b border-gray-200 sm:px-6 bg-gray-50">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Asistente IA
                </h3>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${msg.role === 'user' ? 'bg-black text-white' : 'bg-gray-100 text-gray-900'
                            }`}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 rounded-lg px-4 py-2 text-sm text-gray-500 flex items-center">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Escribiendo...
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-gray-200">
                <form onSubmit={handleSend} className="flex space-x-2">
                    <input
                        type="text"
                        className="flex-1 block w-full rounded-md border-gray-300 py-2 px-3 focus:border-black focus:ring-black sm:text-sm border"
                        placeholder="Pregunta por tu stock o haz pedidos..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black hover:bg-gray-800 disabled:opacity-50"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </form>
            </div>
        </div>
    )
}
