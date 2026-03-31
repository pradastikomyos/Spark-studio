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
      orders: {
        Row: {
          id: number
          order_number: string
          user_id: string | null
          status?: string | null
          tickets_issued_at?: string | null
          capacity_released_at?: string | null
          updated_at?: string | null
        }
      }
      order_items: {
        Row: {
          id: number
          order_id: number
          ticket_id: number
          selected_date: string
          selected_time_slots: Json | null
          quantity: number
        }
      }
      order_products: {
        Row: {
          id: number
          order_number: string
          status?: string | null
          payment_status?: string | null
          total?: unknown
          pickup_code?: string | null
          pickup_status?: string | null
          pickup_expires_at?: string | null
          stock_released_at?: string | null
          paid_at?: string | null
          updated_at?: string | null
        }
      }
      order_product_items: {
        Row: {
          id?: number
          order_product_id: number
          product_variant_id: number
          quantity: number
        }
      }
      purchased_tickets: {
        Row: {
          id?: number
          order_item_id: number
          user_id: string | null
          ticket_id: number
          valid_date: string
          time_slot: string | null
          status: string
          ticket_code?: string
          queue_number?: number | null
          queue_overflow?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      webhook_logs: {
        Row: {
          id?: number
          order_number: string | null
          event_type: string
          payload: Json | null
          processed_at: string
          success: boolean
          error_message?: string | null
        }
      }
    }
  }
}
