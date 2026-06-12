import { useState } from 'react'
import { Image, Upload } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface QuestionMediaFieldsProps {
  imageUrl?: string | null
  onImageChange: (url: string | null) => void
}

export function QuestionMediaFields({ imageUrl, onImageChange }: QuestionMediaFieldsProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setUploadError('Envie apenas arquivos de imagem')
      return
    }

    setUploadError('')
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `questions/${Date.now()}.${ext}`

    const { error } = await supabase.storage.from('question-images').upload(path, file)
    if (error) {
      setUploadError('Erro ao enviar imagem')
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('question-images').getPublicUrl(path)
    onImageChange(publicUrl)
    setUploading(false)
  }

  return (
    <div className="space-y-4 pt-2 border-t border-white/10">
      <p className="text-sm font-medium text-slate-300">Mídia</p>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Imagem</label>
        <div className="flex flex-col gap-3">
          <label className="cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 hover:bg-white/10 transition-colors">
              <Upload size={16} />
              {uploading ? 'Enviando...' : 'Upload de imagem'}
            </span>
          </label>
          {imageUrl && (
            <div className="relative group">
              <img src={imageUrl} alt="" className="rounded-xl max-h-36 object-contain border border-white/10" />
              <button
                type="button"
                onClick={() => onImageChange(null)}
                className="absolute top-2 right-2 text-xs px-2 py-1 rounded-lg bg-black/60 text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Remover
              </button>
            </div>
          )}
          {!imageUrl && (
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Image size={12} />
              Ilustre a questão com uma imagem
            </p>
          )}
        </div>
        {uploadError && <p className="text-xs text-red-400 mt-1">{uploadError}</p>}
      </div>
    </div>
  )
}
