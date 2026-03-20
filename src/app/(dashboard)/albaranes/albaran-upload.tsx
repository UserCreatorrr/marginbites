'use client'

import { useState, useRef } from 'react'
import { Upload, Loader2, CheckCircle2, Camera, X, FileText, Package, Euro } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ExtractedItem {
    name: string
    quantity: number
    unit: string
}

interface ExtractedData {
    provider_name?: string
    total_amount?: number
    items?: ExtractedItem[]
}

interface AlbaranResult {
    success: boolean
    data: {
        id: string
        extracted_data: ExtractedData
    }
}

export default function AlbaranUpload() {
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<AlbaranResult | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const cameraInputRef = useRef<HTMLInputElement>(null)

    const processFile = async (file: File) => {
        // Create preview
        if (file.type.startsWith('image/')) {
            const reader = new FileReader()
            reader.onloadend = () => setPreview(reader.result as string)
            reader.readAsDataURL(file)
        } else {
            setPreview(null)
        }

        setLoading(true)
        setResult(null)
        setError(null)

        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await fetch('/api/ocr', { method: 'POST', body: formData })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Error procesando albarán')
            setResult(data)
            router.refresh()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) processFile(file)
        if (e.target) e.target.value = ''
    }

    const reset = () => {
        setResult(null)
        setError(null)
        setPreview(null)
    }

    return (
        <div className="space-y-6">
            {/* Upload Actions */}
            {!loading && !result && (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-gray-400 transition-colors">
                    <FileText className="mx-auto h-12 w-12 text-gray-300" />
                    <p className="mt-3 text-sm font-medium text-gray-700">Sube o fotografía un albarán</p>
                    <p className="text-xs text-gray-400 mt-1">La IA extraerá los productos, cantidades y precios automáticamente</p>
                    <div className="mt-6 flex items-center justify-center gap-3">
                        {/* File upload */}
                        <label className="cursor-pointer inline-flex items-center px-4 py-2.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
                            <Upload className="h-4 w-4 mr-2" />
                            Subir archivo
                            <input ref={fileInputRef} type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileChange} />
                        </label>
                        {/* Camera capture */}
                        <label className="cursor-pointer inline-flex items-center px-4 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                            <Camera className="h-4 w-4 mr-2" />
                            Usar cámara
                            <input ref={cameraInputRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />
                        </label>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="border rounded-xl p-10 text-center bg-gray-50">
                    {preview && (
                        <img src={preview} alt="Albarán subido" className="max-h-48 mx-auto rounded-lg mb-6 object-contain shadow" />
                    )}
                    <Loader2 className="mx-auto h-10 w-10 text-gray-400 animate-spin" />
                    <p className="mt-3 text-sm font-medium text-gray-600">GPT-4o analizando el albarán...</p>
                    <p className="text-xs text-gray-400 mt-1">Extrayendo productos, cantidades y precios</p>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                    <p className="text-sm font-medium text-red-700">Error procesando el albarán</p>
                    <p className="text-xs text-red-500 mt-1">{error}</p>
                    <button onClick={reset} className="mt-3 text-xs text-red-600 underline">Intentar de nuevo</button>
                </div>
            )}

            {/* Result State */}
            {result && result.data && (
                <div className="rounded-xl border border-green-200 bg-green-50/50 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <span className="text-sm font-semibold text-green-800">Albarán procesado correctamente</span>
                        </div>
                        <button onClick={reset} className="text-gray-400 hover:text-gray-600">
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="bg-white rounded-lg border border-green-100 p-4 space-y-3">
                        {result.data.extracted_data?.provider_name && (
                            <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-600">Proveedor:</span>
                                <span className="text-sm font-medium">{result.data.extracted_data.provider_name}</span>
                            </div>
                        )}
                        {result.data.extracted_data?.total_amount !== undefined && (
                            <div className="flex items-center gap-2">
                                <Euro className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-600">Total:</span>
                                <span className="text-sm font-bold text-green-700">{result.data.extracted_data.total_amount}€</span>
                            </div>
                        )}
                        {result.data.extracted_data?.items && result.data.extracted_data.items.length > 0 && (
                            <div>
                                <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Artículos detectados</p>
                                <ul className="space-y-1">
                                    {result.data.extracted_data.items.map((item, i) => (
                                        <li key={i} className="text-xs text-gray-700 flex justify-between">
                                            <span>{item.name}</span>
                                            <span className="text-gray-500">{item.quantity} {item.unit}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    <button onClick={reset} className="w-full text-sm text-center text-gray-500 hover:text-gray-700 underline">
                        Subir otro albarán
                    </button>
                </div>
            )}
        </div>
    )
}
