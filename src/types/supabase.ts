export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'root' | 'admin' | 'professor' | 'aluno'
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: 'root' | 'admin' | 'professor' | 'aluno'
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'root' | 'admin' | 'professor' | 'aluno'
          created_at?: string
        }
      }
      questions: {
        Row: {
          id: string
          title: string
          enunciado: string
          comando: string | null
          codigo_item: string | null
          componente_curricular: string
          conteudo_programatico: string | null
          ano_serie: string
          descritor_saeb: string | null
          habilidade_bncc: string | null
          nivel_bloom: string | null
          nivel_dificuldade: string | null
          tempo_medio_resolucao: number | null
          tipo_texto_base: string | null
          fonte: string | null
          image_url: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          enunciado: string
          comando?: string | null
          codigo_item?: string | null
          componente_curricular?: string
          conteudo_programatico?: string | null
          ano_serie?: string
          descritor_saeb?: string | null
          habilidade_bncc?: string | null
          nivel_bloom?: string | null
          nivel_dificuldade?: string | null
          tempo_medio_resolucao?: number | null
          tipo_texto_base?: string | null
          fonte?: string | null
          image_url?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          enunciado?: string
          comando?: string | null
          codigo_item?: string | null
          componente_curricular?: string
          conteudo_programatico?: string | null
          ano_serie?: string
          descritor_saeb?: string | null
          habilidade_bncc?: string | null
          nivel_bloom?: string | null
          nivel_dificuldade?: string | null
          tempo_medio_resolucao?: number | null
          tipo_texto_base?: string | null
          fonte?: string | null
          image_url?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      question_alternatives: {
        Row: {
          id: string
          question_id: string
          letter: string
          text: string
          is_correct: boolean
          image_url: string | null
          order_index: number
        }
        Insert: {
          id?: string
          question_id: string
          letter: string
          text: string
          is_correct?: boolean
          image_url?: string | null
          order_index: number
        }
        Update: {
          id?: string
          question_id?: string
          letter?: string
          text?: string
          is_correct?: boolean
          image_url?: string | null
          order_index?: number
        }
      }
      forms: {
        Row: {
          id: string
          title: string
          description: string | null
          created_by: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          created_by?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          created_by?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      form_questions: {
        Row: {
          id: string
          form_id: string
          question_id: string
          order_index: number
        }
        Insert: {
          id?: string
          form_id: string
          question_id: string
          order_index: number
        }
        Update: {
          id?: string
          form_id?: string
          question_id?: string
          order_index?: number
        }
      }
      form_links: {
        Row: {
          id: string
          form_id: string
          slug: string
          professor_id: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          form_id: string
          slug: string
          professor_id: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          form_id?: string
          slug?: string
          professor_id?: string
          is_active?: boolean
          created_at?: string
        }
      }
      form_responses: {
        Row: {
          id: string
          form_id: string
          form_link_id: string | null
          student_name: string
          student_email: string
          score: number | null
          total_questions: number | null
          correct_answers: number | null
          completed_at: string
        }
        Insert: {
          id?: string
          form_id: string
          form_link_id?: string | null
          student_name: string
          student_email: string
          score?: number | null
          total_questions?: number | null
          correct_answers?: number | null
          completed_at?: string
        }
        Update: {
          id?: string
          form_id?: string
          form_link_id?: string | null
          student_name?: string
          student_email?: string
          score?: number | null
          total_questions?: number | null
          correct_answers?: number | null
          completed_at?: string
        }
      }
      response_answers: {
        Row: {
          id: string
          response_id: string
          question_id: string
          selected_alternative_id: string | null
          is_correct: boolean | null
        }
        Insert: {
          id?: string
          response_id: string
          question_id: string
          selected_alternative_id?: string | null
          is_correct?: boolean | null
        }
        Update: {
          id?: string
          response_id?: string
          question_id?: string
          selected_alternative_id?: string | null
          is_correct?: boolean | null
        }
      }
      learning_trails: {
        Row: {
          id: string
          title: string
          description: string | null
          min_score: number
          max_score: number
          pdf_url: string | null
          content: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          min_score: number
          max_score: number
          pdf_url?: string | null
          content?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          min_score?: number
          max_score?: number
          pdf_url?: string | null
          content?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      student_trail_assignments: {
        Row: {
          id: string
          response_id: string
          trail_id: string
          assigned_at: string
        }
        Insert: {
          id?: string
          response_id: string
          trail_id: string
          assigned_at?: string
        }
        Update: {
          id?: string
          response_id?: string
          trail_id?: string
          assigned_at?: string
        }
      }
    }
    Enums: {
      user_role: 'root' | 'admin' | 'professor' | 'aluno'
    }
  }
}
