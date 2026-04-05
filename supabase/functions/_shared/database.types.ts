export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type GenericRow = Record<string, unknown>

type GenericTable = {
  Row: GenericRow
  Insert: GenericRow
  Update: GenericRow
  Relationships: []
}

type GenericFunction = {
  Args: Record<string, unknown>
  Returns: unknown
}

type OrdersRow = {
  id: number
  order_number: string
  user_id: string | null
  status?: string | null
  total_amount?: number | null
  expires_at?: string | null
  payment_id?: string | null
  payment_url?: string | null
  payment_data?: Json | null
  tickets_issued_at?: string | null
  capacity_released_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

type OrderItemsRow = {
  id: number
  order_id: number
  ticket_id: number
  selected_date: string
  selected_time_slots: Json | null
  quantity: number
  unit_price?: number | null
  subtotal?: number | null
  created_at?: string | null
  updated_at?: string | null
}

type OrderProductsRow = {
  id: number
  user_id?: string | null
  order_number: string
  channel?: string | null
  status?: string | null
  payment_status?: string | null
  payment_expired_at?: string | null
  payment_data?: Json | null
  total?: number | string | null
  voucher_id?: string | null
  voucher_code?: string | null
  discount_amount?: number | string | null
  pickup_code?: string | null
  pickup_status?: string | null
  pickup_expires_at?: string | null
  stock_released_at?: string | null
  paid_at?: string | null
  expired_at?: string | null
  updated_at?: string | null
  completed_at?: string | null
}

type OrderProductItemsRow = {
  id?: number
  order_product_id: number
  product_variant_id: number
  quantity: number
}

type PurchasedTicketsRow = {
  id?: number
  order_item_id: number
  user_id: string | null
  ticket_id: number
  valid_date: string
  time_slot: string | null
  status: string
  ticket_code?: string | null
  queue_number?: number | null
  queue_overflow?: boolean | null
  created_at?: string | null
  updated_at?: string | null
  used_at?: string | null
}

type WebhookLogsRow = {
  id?: number
  order_number: string | null
  event_type: string
  payload: Json | null
  processed_at: string
  success: boolean
  error_message?: string | null
}

type VoucherUsageRow = {
  id?: string
  voucher_id: string
  user_id: string
  order_product_id: number
  discount_amount?: number | null
  used_at?: string | null
}

type ProductVariantsRow = {
  id: number
  product_id?: number | null
  name?: string | null
  sku?: string | null
  price?: number | string | null
  stock?: number | null
  reserved_stock?: number | null
  is_active?: boolean | null
  attributes?: Json
  created_at?: string | null
  updated_at?: string | null
}

type ProductsRow = {
  id: number
  name?: string | null
  slug?: string | null
  description?: string | null
  category_id?: number | null
  sku?: string | null
  price?: number | string | null
  is_active?: boolean | null
  deleted_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  available_from?: string | null
  available_until?: string | null
  time_slots?: Json | null
}

type ProductImagesRow = {
  id?: number
  product_id?: number | null
  image_url: string
  is_primary?: boolean | null
  display_order?: number | null
  image_provider?: 'supabase' | 'imagekit' | null
  provider_file_id?: string | null
  provider_file_path?: string | null
  provider_original_url?: string | null
  migrated_at?: string | null
  updated_at?: string | null
}

type ReservationsRow = {
  id?: number
  status?: string | null
  expires_at?: string | null
  updated_at?: string | null
}

type StockReservationsRow = {
  id?: number
  reserved_until?: string | null
}

type TicketAvailabilitiesRow = {
  id?: number
  ticket_id?: number | null
  date?: string | null
  time_slot?: string | null
  sold_capacity?: number | null
  reserved_capacity?: number | null
  version?: number | null
  updated_at?: string | null
}

type UserRoleAssignmentsRow = {
  user_id: string
  role_name: string
}

type ProfilesRow = {
  id: string
  name?: string | null
}

type PaymentEffectRunsRow = {
  id?: number
  effect_scope: string
  order_ref: string
  effect_type: string
  effect_key?: string | null
  status: 'in_progress' | 'completed' | 'failed'
  started_at?: string | null
  heartbeat_at?: string | null
  completed_at?: string | null
  last_error?: string | null
  metadata?: Json | null
}

type TicketsRow = {
  id: number
  name?: string | null
  price?: number | string | null
  is_active?: boolean | null
  available_from?: string | null
  available_until?: string | null
  time_slots?: Json | null
}

type TicketBookingSettingsRow = {
  ticket_id: number
  max_tickets_per_booking?: number | null
  booking_window_days?: number | null
}

export type Database = {
  public: {
    Tables: Record<string, GenericTable> & {
      orders: {
        Row: OrdersRow
        Insert: Partial<OrdersRow>
        Update: Partial<OrdersRow>
        Relationships: []
      }
      order_items: {
        Row: OrderItemsRow
        Insert: Partial<OrderItemsRow>
        Update: Partial<OrderItemsRow>
        Relationships: []
      }
      order_products: {
        Row: OrderProductsRow
        Insert: Partial<OrderProductsRow>
        Update: Partial<OrderProductsRow>
        Relationships: []
      }
      order_product_items: {
        Row: OrderProductItemsRow
        Insert: Partial<OrderProductItemsRow>
        Update: Partial<OrderProductItemsRow>
        Relationships: []
      }
      purchased_tickets: {
        Row: PurchasedTicketsRow
        Insert: Partial<PurchasedTicketsRow>
        Update: Partial<PurchasedTicketsRow>
        Relationships: []
      }
      webhook_logs: {
        Row: WebhookLogsRow
        Insert: Partial<WebhookLogsRow>
        Update: Partial<WebhookLogsRow>
        Relationships: []
      }
      voucher_usage: {
        Row: VoucherUsageRow
        Insert: Partial<VoucherUsageRow>
        Update: Partial<VoucherUsageRow>
        Relationships: []
      }
      product_variants: {
        Row: ProductVariantsRow
        Insert: Partial<ProductVariantsRow>
        Update: Partial<ProductVariantsRow>
        Relationships: []
      }
      products: {
        Row: ProductsRow
        Insert: Partial<ProductsRow>
        Update: Partial<ProductsRow>
        Relationships: []
      }
      product_images: {
        Row: ProductImagesRow
        Insert: Partial<ProductImagesRow>
        Update: Partial<ProductImagesRow>
        Relationships: []
      }
      reservations: {
        Row: ReservationsRow
        Insert: Partial<ReservationsRow>
        Update: Partial<ReservationsRow>
        Relationships: []
      }
      stock_reservations: {
        Row: StockReservationsRow
        Insert: Partial<StockReservationsRow>
        Update: Partial<StockReservationsRow>
        Relationships: []
      }
      ticket_availabilities: {
        Row: TicketAvailabilitiesRow
        Insert: Partial<TicketAvailabilitiesRow>
        Update: Partial<TicketAvailabilitiesRow>
        Relationships: []
      }
      user_role_assignments: {
        Row: UserRoleAssignmentsRow
        Insert: Partial<UserRoleAssignmentsRow>
        Update: Partial<UserRoleAssignmentsRow>
        Relationships: []
      }
      profiles: {
        Row: ProfilesRow
        Insert: Partial<ProfilesRow>
        Update: Partial<ProfilesRow>
        Relationships: []
      }
      payment_effect_runs: {
        Row: PaymentEffectRunsRow
        Insert: Partial<PaymentEffectRunsRow>
        Update: Partial<PaymentEffectRunsRow>
        Relationships: []
      }
      tickets: {
        Row: TicketsRow
        Insert: Partial<TicketsRow>
        Update: Partial<TicketsRow>
        Relationships: []
      }
      ticket_booking_settings: {
        Row: TicketBookingSettingsRow
        Insert: Partial<TicketBookingSettingsRow>
        Update: Partial<TicketBookingSettingsRow>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, GenericFunction> & {
      finalize_ticket_capacity: {
        Args: {
          p_ticket_id: number
          p_date: string
          p_time_slot: string | null
          p_quantity: number
        }
        Returns: boolean
      }
      release_ticket_capacity: {
        Args: {
          p_ticket_id: number
          p_date: string
          p_time_slot: string | null
          p_quantity: number
        }
        Returns: boolean
      }
      release_voucher_quota: {
        Args: { p_voucher_id: string }
        Returns: boolean
      }
      generate_pickup_code: {
        Args: Record<string, never>
        Returns: string
      }
      release_product_stock: {
        Args: { p_variant_id: number; p_quantity: number }
        Returns: boolean
      }
      reserve_product_stock: {
        Args: { p_variant_id: number; p_quantity: number }
        Returns: boolean
      }
      reserve_ticket_capacity: {
        Args: {
          p_ticket_id: number
          p_date: string
          p_time_slot: string | null
          p_quantity: number
        }
        Returns: boolean
      }
      validate_and_reserve_voucher: {
        Args: Record<string, unknown>
        Returns: Array<{
          voucher_id: string | null
          discount_type: string | null
          discount_value: number | null
          discount_amount: number | null
          error_message: string | null
        }>
      }
      save_inventory_product: {
        Args: {
          p_product_id?: number | null
          p_name: string
          p_slug: string
          p_description?: string | null
          p_category_id?: number | null
          p_sku: string
          p_is_active: boolean
          p_variants?: Json[]
          p_new_images?: Json[]
          p_removed_image_urls?: string[]
          p_sync_variants?: boolean
        }
        Returns: Json
      }
      delete_inventory_product: {
        Args: {
          p_product_id: number
          p_deleted_at?: string | null
        }
        Returns: Json
      }
      validate_entrance_ticket_scan: {
        Args: { p_ticket_code: string }
        Returns: Json
      }
      list_inventory_product_page: {
        Args: {
          p_search_query?: string
          p_category_slug?: string
          p_stock_filter?: string
          p_page?: number
          p_page_size?: number
        }
        Returns: Array<{ product_id: number; total_count: number }>
      }
      soft_delete_product_cascade: {
        Args: { p_product_id: number; p_deleted_at?: string }
        Returns: null
      }
      complete_product_pickup_atomic: {
        Args: { p_pickup_code: string; p_picked_up_by: string }
        Returns: Json
      }
      complete_cashier_product_pickup_atomic: {
        Args: { p_pickup_code: string; p_picked_up_by: string }
        Returns: Json
      }
      save_entrance_booking_config: {
        Args: {
          p_ticket_id: number
          p_is_active: boolean
          p_price: number
          p_available_from: string
          p_available_until: string
          p_time_slots: Json
          p_max_tickets_per_booking: number
          p_booking_window_days: number
          p_auto_generate_days_ahead: number
          p_default_slot_capacity: number
        }
        Returns: Json
      }
      claim_payment_effect_run: {
        Args: {
          p_effect_scope: string
          p_order_ref: string
          p_effect_type: string
          p_effect_key?: string
          p_stale_after_seconds?: number
        }
        Returns: Array<{ claimed: boolean; status: string }>
      }
      complete_payment_effect_run: {
        Args: {
          p_effect_scope: string
          p_order_ref: string
          p_effect_type: string
          p_effect_key?: string
          p_metadata?: Json | null
        }
        Returns: boolean
      }
      fail_payment_effect_run: {
        Args: {
          p_effect_scope: string
          p_order_ref: string
          p_effect_type: string
          p_effect_key?: string
          p_error?: string | null
          p_metadata?: Json | null
        }
        Returns: boolean
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
