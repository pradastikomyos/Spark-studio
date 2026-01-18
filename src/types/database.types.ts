export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          created_at: string | null
          email: string
          email_verified_at: string | null
          id: number
          name: string
          password: string
          phone_number: string | null
          remember_token: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          email_verified_at?: string | null
          id?: number
          name: string
          password: string
          phone_number?: string | null
          remember_token?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          email_verified_at?: string | null
          id?: number
          name?: string
          password?: string
          phone_number?: string | null
          remember_token?: string | null
          updated_at?: string | null
        }
      }
      tickets: {
        Row: {
          available_from: string
          available_until: string
          created_at: string | null
          description: string | null
          id: number
          is_active: boolean
          name: string
          price: number
          slug: string
          time_slots: Json | null
          type: string
          updated_at: string | null
        }
      }
      products: {
        Row: {
          category_id: number
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: number
          is_active: boolean
          name: string
          sku: string
          slug: string
          type: string
          updated_at: string | null
        }
      }
    }
  }
}
