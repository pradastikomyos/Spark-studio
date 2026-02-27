export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface ProductImage {
  id: number;
  product_id: number;
  image_url: string;
  display_order: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

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
          image_url: string | null
          is_active: boolean
          name: string
          sku: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          category_id: number
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: number
          image_url?: string | null
          is_active?: boolean
          name: string
          sku: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          category_id?: number
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: number
          image_url?: string | null
          is_active?: boolean
          name?: string
          sku?: string
          slug?: string
          updated_at?: string | null
        }
      }
      product_variants: {
        Row: {
          attributes: Json | null
          created_at: string | null
          id: number
          is_active: boolean
          name: string
          price: number | null
          product_id: number
          reserved_stock: number
          sku: string
          stock: number
          updated_at: string | null
        }
        Insert: {
          attributes?: Json | null
          created_at?: string | null
          id?: number
          is_active?: boolean
          name: string
          price?: number | null
          product_id: number
          reserved_stock?: number
          sku: string
          stock?: number
          updated_at?: string | null
        }
        Update: {
          attributes?: Json | null
          created_at?: string | null
          id?: number
          is_active?: boolean
          name?: string
          price?: number | null
          product_id?: number
          reserved_stock?: number
          sku?: string
          stock?: number
          updated_at?: string | null
        }
      }
      categories: {
        Row: {
          created_at: string | null
          id: number
          is_active: boolean
          name: string
          parent_id: number | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          is_active?: boolean
          name: string
          parent_id?: number | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          is_active?: boolean
          name?: string
          parent_id?: number | null
          slug?: string
          updated_at?: string | null
        }
      }
      fashion_collections: {
        Row: {
          id: number
          title: string
          slug: string
          description: string | null
          cover_image_url: string | null
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          title: string
          slug: string
          description?: string | null
          cover_image_url?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          title?: string
          slug?: string
          description?: string | null
          cover_image_url?: string | null
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
      }
      fashion_looks: {
        Row: {
          id: number
          collection_id: number
          look_number: number
          model_image_url: string
          model_name: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          collection_id: number
          look_number: number
          model_image_url: string
          model_name?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          collection_id?: number
          look_number?: number
          model_image_url?: string
          model_name?: string | null
          sort_order?: number
          updated_at?: string
        }
      }
      fashion_look_items: {
        Row: {
          id: number
          look_id: number
          product_variant_id: number
          label: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: number
          look_id: number
          product_variant_id: number
          label?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: number
          look_id?: number
          product_variant_id?: number
          label?: string | null
          sort_order?: number
        }
      }
    }
  }
}
