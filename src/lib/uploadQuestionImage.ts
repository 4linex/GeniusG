import { supabase } from '@/lib/supabase'

export async function uploadQuestionImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Envie apenas arquivos de imagem')
  }

  const ext = file.name.split('.').pop() || 'jpg'
  const path = `questions/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { error } = await supabase.storage.from('question-images').upload(path, file)
  if (error) throw new Error('Erro ao enviar imagem')

  const {
    data: { publicUrl },
  } = supabase.storage.from('question-images').getPublicUrl(path)

  return publicUrl
}
