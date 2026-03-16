'use client'

import { useState } from 'react'
import { Upload, Loader2, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AlbaranUpload() {
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const router = useRouter()

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setLoading(true)
        setSuccess(false)
        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await fetch('/api/ocr', {
                method: 'POST',
                body: formData,
            })

            if (!res.ok) throw new Error('Error subiendo albarán')

            setSuccess(true)
            router.refresh()

            /** 
             * Ideally redirect to a detail page here 
             * router.push(`/albaranes/${data.data.id}`)
             */
            setTimeout(() => setSuccess(false), 3000)
        } catch (error) {
            console.error(error)
            alert("Error procesando albarán")
        } finally {
            setLoading(false)
            if (e.target) e.target.value = '' // Reset input
        }
    }

    return (
        <div>
            <label className={`
        inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white 
        ${loading ? 'bg-gray-400 cursor-not-allowed' : success ? 'bg-green-600 hover:bg-green-700' : 'bg-black hover:bg-gray-800 cursor-pointer'}
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors
      `}>
                {loading ? (
                    <><Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" /> Procesando IA...</>
                ) : success ? (
                    <><CheckCircle2 className="-ml-1 mr-2 h-5 w-5" /> Completado</>
                ) : (
                    <><Upload className="-ml-1 mr-2 h-5 w-5" /> Subir Albarán</>
                )}
                <input
                    type="file"
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    disabled={loading}
                />
            </label>
        </div>
    )
}
