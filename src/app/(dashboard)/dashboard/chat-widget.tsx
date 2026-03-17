'use client'

import { useRef, useEffect } from 'react'
import { Send, Loader2, Bot, User } from 'lucide-react'
import { useChat } from 'ai/react'
import ReactMarkdown from 'react-markdown'

export default function ChatWidget() {
    const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
        api: '/api/chat',
        initialMessages: [
            {
                id: 'welcome',
                role: 'assistant',
                content: '¡Hola! Soy Margin, tu asistente inteligente de MARGINBITES. Puedo ayudarte a analizar tu inventario, ver proveedores o preparar pedidos. ¿En qué te ayudo hoy?'
            }
        ]
    })

    // Auto-scroll to bottom of chat
    const messagesEndRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    return (
        <div className="flex flex-col h-[600px] bg-white shadow-xl rounded-xl overflow-hidden border border-gray-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-black text-white flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="bg-white/10 p-2 rounded-full">
                        <Bot className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold leading-none mb-1">
                            Asistente Inteligente
                        </h3>
                        <p className="text-xs text-gray-300">Impulsado por GPT-4o</p>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-gray-50/50">
                {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                            {/* Avatar */}
                            <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${m.role === 'user' ? 'bg-gray-200 text-gray-600' : 'bg-black text-white'
                                }`}>
                                {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                            </div>

                            {/* Bubble */}
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
                <form onSubmit={handleSubmit} className="flex space-x-3 max-w-3xl mx-auto">
                    <input
                        className="flex-1 w-full rounded-full border-gray-300 bg-gray-50 py-3 px-5 focus:border-black focus:ring-black focus:bg-white sm:text-sm border shadow-inner transition-all"
                        placeholder="Pregunta por tu stock, precios o pide ayuda..."
                        value={input}
                        onChange={handleInputChange}
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="inline-flex items-center justify-center h-11 w-11 flex-shrink-0 rounded-full shadow-md text-white bg-black hover:bg-gray-800 disabled:opacity-50 disabled:hover:bg-black transition-colors"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </form>
            </div>
        </div>
    )
}
