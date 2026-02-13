# Voucher/Discount System Implementation Plan

**Date**: 2026-02-13  
**Feature**: Product Voucher/Coupon System  
**Status**: Planning Phase  
**Priority**: High (Boss Request)

---

## 📋 Executive Summary

Implement a flexible voucher/coupon system for product orders that allows:
- Admin to create and manage discount vouchers
- Customers to apply voucher codes at checkout
- Atomic quota management to prevent race conditions
- Category-based restrictions
- Percentage and fixed discount types

**Key Requirement**: All-in-one coupon (not per-product) to keep implementation simple.

---

## 🎯 Requirements (From Conversation)

### Functional Requirements
1. **Admin Voucher Management**
   - Create vouchers with redemption codes (e.g., "SPARKASIK")
   - Set discount type: percentage (e.g., 69%) or fixed amount
   - Define validity period (from date → to date)
   - Set usage quota/limit
   - Restrict to specific product categories (optional)
   - Set minimum purchase requirement (optional)
   - Set maximum discount cap for percentage discounts (optional)

2. **Customer Voucher Usage**
   - Input voucher code at checkout (similar to Shopee)
   - See discount applied in order summary
   - Validation feedback (expired, invalid, quota exceeded, etc.)

3. **System Behavior**
   - Atomic quota tracking (prevent race conditions)
   - Discount applied before Midtrans payment
   - Track voucher usage per order
   - Release quota if payment fails/expires

### Non-Functional Requirements
- **Performance**: Atomic operations using PostgreSQL FOR UPDATE locks
- **Security**: Server-side validation only (no client-side discount calculation)
- **Audit Trail**: Track all voucher usage with timestamps
- **Scalability**: Support high concurrent voucher redemptions

---

## 🗄️ Database Schema Analysis

### Existing Tables (Relevant)
- `order_products`: Has `discount_amount` column (already exists!)
- `order_products`: Has `discount_id` FK (points to old `discounts` table)
- `categories`: Product categories for voucher restrictions
- `product_variants`: For price calculation
- `profiles`: User info for voucher usage tracking

### New Tables Required
1. **`vouchers`** - Main voucher configuration
2. **`voucher_usage`** - Usage tracking and audit trail

### Schema Changes Required
- Add `voucher_code` column to `order_products` (for display)
- Add `voucher_id` column to `order_products` (FK to new vouchers table)

---

## 🏗️ Implementation Phases

### **Phase 1: Database Migration** ✅ (COMPLETED)
**File**: `supabase/migrations/20260213000000_add_voucher_system.sql`

**Tasks**:
- [x] Create `vouchers` table with constraints
- [x] Create `voucher_usage` tracking table
- [x] Add voucher columns to `order_products`
- [x] Create RPC function `validate_and_reserve_voucher()` with atomic locking
- [x] Create RPC function `release_voucher_quota()` for rollback
- [x] Set up RLS policies (admin full access, customers read-only active vouchers)
- [x] Add indexes for performance
- [x] Grant permissions

**Key Features**:
- Atomic quota management using `SELECT FOR UPDATE`
- Prevents race conditions on concurrent redemptions
- Validates: active status, date range, quota, min purchase, categories
- Returns calculated discount amount

**Testing Checklist**:
- [ ] Deploy migration to Supabase
- [ ] Verify tables created successfully
- [ ] Test RPC function with sample data
- [ ] Verify RLS policies work correctly
- [ ] Check indexes are created

---

### **Phase 2: Edge Functions**

#### 2.1 Create `validate-voucher` Edge Function
**File**: `supabase/functions/validate-voucher/index.ts`

**Purpose**: Standalone validation endpoint for frontend preview (optional)

**Input**:
```typescript
{
  code: string,
  subtotal: number,
  categoryIds: number[]
}
```

**Output**:
```typescript
{
  valid: boolean,
  discount_amount?: number,
  discount_type?: string,
  discount_value?: number,
  error?: string
}
```

**Tasks**:
- [ ] Create edge function file
- [ ] Implement JWT validation
- [ ] Call `validate_and_reserve_voucher()` RPC (with immediate rollback for preview)
- [ ] Handle error responses
- [ ] Add CORS headers
- [ ] Deploy function

---

#### 2.2 Update `create-midtrans-product-token` Edge Function
**File**: `supabase/functions/create-midtrans-product-token/index.ts`

**Changes Required**:
1. Accept optional `voucherCode` in request body
2. If voucher provided:
   - Extract category IDs from cart items
   - Call `validate_and_reserve_voucher()` RPC
   - Apply discount to `discount_amount` field
   - Reduce `total` sent to Midtrans
   - Store `voucher_id` and `voucher_code` in order
3. On error (stock reservation, order creation, Midtrans):
   - Call `release_voucher_quota()` to rollback
4. Create `voucher_usage` record after successful payment

**Tasks**:
- [ ] Add voucher validation logic
- [ ] Update order creation to include voucher fields
- [ ] Implement rollback on errors
- [ ] Update Midtrans payload with discounted total
- [ ] Test with valid/invalid vouchers
- [ ] Deploy function

---

#### 2.3 Update `create-cashier-product-order` Edge Function
**File**: `supabase/functions/create-cashier-product-order/index.ts`

**Changes Required**:
- Same as 2.2 but for cashier channel
- Apply discount before creating order
- Store voucher info in order record

**Tasks**:
- [ ] Add voucher validation logic
- [ ] Update order creation
- [ ] Test cashier flow with vouchers
- [ ] Deploy function

---

#### 2.4 Update Webhook/Sync Functions (Optional Enhancement)
**Files**: 
- `supabase/functions/midtrans-webhook/index.ts`
- `supabase/functions/sync-midtrans-product-status/index.ts`

**Changes**:
- On payment failure/expiry: Release voucher quota
- On payment success: Create `voucher_usage` record (if not already created)

**Tasks**:
- [ ] Add quota release logic on failure
- [ ] Ensure idempotency for usage tracking
- [ ] Test webhook scenarios
- [ ] Deploy functions

---

### **Phase 3: Admin UI - Voucher Manager**

#### 3.1 Create VoucherManager Page
**File**: `frontend/src/pages/admin/VoucherManager.tsx`

**Features**:
- List all vouchers with status indicators
- Create new voucher form
- Edit existing voucher
- Delete/deactivate voucher
- View usage statistics (used_count / quota)
- Filter by active/inactive/expired

**UI Components**:
- Voucher list table with:
  - Code, Type, Value, Valid Period, Quota, Status
  - Actions: Edit, Delete, Toggle Active
- Create/Edit modal with form:
  - Code (text input, uppercase)
  - Discount Type (dropdown: percentage/fixed)
  - Discount Value (number input)
  - Valid From/Until (date pickers)
  - Quota (number input)
  - Min Purchase (optional number)
  - Max Discount (optional, for percentage)
  - Applicable Categories (multi-select)
  - Active toggle

**Tasks**:
- [ ] Create VoucherManager component
- [ ] Implement CRUD operations using Supabase client
- [ ] Add form validation
- [ ] Add usage statistics display
- [ ] Style with Tailwind (match existing admin pages)
- [ ] Add loading states and error handling
- [ ] Test all CRUD operations

---

#### 3.2 Add to Admin Menu
**File**: `frontend/src/constants/adminMenu.ts`

**Changes**:
- Add "Vouchers" menu item under "Store" section
- Icon: `local_offer` or `confirmation_number`
- Route: `/admin/vouchers`

**Tasks**:
- [ ] Update admin menu constants
- [ ] Add route to App.tsx
- [ ] Verify navigation works
- [ ] Update admin menu tests (if any)

---

### **Phase 4: Customer UI - Checkout Integration**

#### 4.1 Update ProductCheckoutPage
**File**: `frontend/src/pages/ProductCheckoutPage.tsx`

**Changes**:
1. Add voucher input section:
   - Text input for voucher code
   - "Apply" button
   - Loading state during validation
   - Success/error message display
2. Add discount display in order summary:
   - Show original subtotal
   - Show discount amount (with voucher code)
   - Show final total
3. Update payment flow:
   - Include `voucherCode` in edge function call
   - Handle voucher-specific errors (expired, quota exceeded, etc.)
4. Clear voucher on payment failure

**UI Design**:
```
┌─────────────────────────────────┐
│ Order Summary                   │
├─────────────────────────────────┤
│ Subtotal:           Rp 100,000  │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Voucher Code                │ │
│ │ [SPARKASIK        ] [Apply] │ │
│ │ ✓ Discount applied: -30%    │ │
│ └─────────────────────────────┘ │
│                                 │
│ Discount (SPARKASIK): -Rp 30,000│
│ ─────────────────────────────── │
│ Total:              Rp 70,000   │
└─────────────────────────────────┘
```

**Tasks**:
- [ ] Add voucher input UI component
- [ ] Implement apply voucher logic
- [ ] Update order summary calculations
- [ ] Add discount display
- [ ] Handle validation errors gracefully
- [ ] Update payment submission to include voucher
- [ ] Test with various voucher scenarios
- [ ] Add loading/disabled states

---

#### 4.2 Update CartPage (Optional Enhancement)
**File**: `frontend/src/pages/CartPage.tsx`

**Changes**:
- Add voucher preview in cart summary
- Allow applying voucher before checkout
- Store applied voucher in state/context

**Tasks**:
- [ ] Add voucher input to cart summary
- [ ] Implement preview logic
- [ ] Pass voucher to checkout page
- [ ] Test cart → checkout flow

---

#### 4.3 Update Order Display Pages
**Files**:
- `frontend/src/pages/MyProductOrdersPage.tsx`
- `frontend/src/pages/ProductOrderSuccessPage.tsx`
- `frontend/src/pages/ProductOrderPendingPage.tsx`

**Changes**:
- Display applied voucher code (if any)
- Show discount amount in order breakdown
- Update total calculation display

**Tasks**:
- [ ] Add voucher display to order cards
- [ ] Update order summary breakdown
- [ ] Test with voucher and non-voucher orders
- [ ] Ensure responsive design

---

### **Phase 5: Localization (i18n)**

**Files**:
- `frontend/src/locales/en.json`
- `frontend/src/locales/id.json`

**Keys to Add**:
```json
{
  "voucher": {
    "title": "Voucher Code",
    "placeholder": "Enter voucher code",
    "apply": "Apply",
    "applied": "Voucher applied",
    "discount": "Discount",
    "errors": {
      "invalid": "Invalid voucher code",
      "expired": "Voucher has expired",
      "quotaExceeded": "Voucher quota exceeded",
      "minPurchase": "Minimum purchase not met",
      "categoryNotApplicable": "Voucher not applicable to selected products"
    }
  }
}
```

**Tasks**:
- [ ] Add English translations
- [ ] Add Indonesian translations
- [ ] Update all UI components to use i18n keys
- [ ] Test language switching

---

### **Phase 6: Testing & Validation**

#### 6.1 Database Testing
- [ ] Test atomic quota management (concurrent redemptions)
- [ ] Test voucher validation rules (dates, quota, categories)
- [ ] Test RLS policies (admin vs customer access)
- [ ] Test rollback scenarios (payment failure)

#### 6.2 Edge Function Testing
- [ ] Test voucher validation with valid codes
- [ ] Test with invalid/expired/quota-exceeded codes
- [ ] Test category restrictions
- [ ] Test min purchase requirements
- [ ] Test percentage vs fixed discounts
- [ ] Test max discount cap
- [ ] Test rollback on payment failure
- [ ] Test concurrent redemptions (load testing)

#### 6.3 Frontend Testing
- [ ] Test voucher input validation
- [ ] Test apply/remove voucher flow
- [ ] Test discount calculation display
- [ ] Test error message display
- [ ] Test with different discount types
- [ ] Test responsive design (mobile/desktop)
- [ ] Test accessibility (keyboard navigation, screen readers)

#### 6.4 Integration Testing
- [ ] Test complete flow: cart → checkout → apply voucher → pay → success
- [ ] Test with Midtrans sandbox
- [ ] Test cashier flow with vouchers
- [ ] Test order display with voucher info
- [ ] Test admin voucher management CRUD
- [ ] Test usage statistics accuracy

#### 6.5 Edge Cases
- [ ] Apply voucher, then remove items (min purchase no longer met)
- [ ] Apply voucher, then change quantity (recalculate discount)
- [ ] Multiple users trying same voucher simultaneously
- [ ] Voucher expires during checkout
- [ ] Payment window expires (release quota)
- [ ] User closes payment popup (release quota)

---

## 📊 Database Schema Details

### `vouchers` Table
```sql
CREATE TABLE public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  quota INTEGER NOT NULL CHECK (quota > 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  min_purchase NUMERIC CHECK (min_purchase >= 0),
  max_discount NUMERIC CHECK (max_discount >= 0),
  applicable_categories INTEGER[] DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_date_range CHECK (valid_until > valid_from),
  CONSTRAINT quota_not_exceeded CHECK (used_count <= quota)
);
```

### `voucher_usage` Table
```sql
CREATE TABLE public.voucher_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_product_id INTEGER NOT NULL REFERENCES public.order_products(id) ON DELETE CASCADE,
  discount_amount NUMERIC NOT NULL CHECK (discount_amount >= 0),
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_voucher_per_order UNIQUE(order_product_id)
);
```

### `order_products` Updates
```sql
ALTER TABLE public.order_products 
  ADD COLUMN voucher_code TEXT,
  ADD COLUMN voucher_id UUID REFERENCES public.vouchers(id) ON DELETE SET NULL;
```

---

## 🔐 Security Considerations

1. **Server-Side Validation Only**
   - Never trust client-side discount calculations
   - All voucher validation happens in edge functions
   - Use RPC functions for atomic operations

2. **RLS Policies**
   - Admins: Full CRUD access to vouchers
   - Customers: Read-only access to active vouchers
   - Users can only see their own voucher usage

3. **Atomic Operations**
   - Use `SELECT FOR UPDATE` to prevent race conditions
   - Quota increments are atomic
   - Rollback on payment failure

4. **Input Validation**
   - Sanitize voucher codes (uppercase, trim)
   - Validate discount values (positive numbers)
   - Validate date ranges (end > start)
   - Validate category IDs exist

---

## 📈 Success Metrics

1. **Functional**
   - [ ] Admin can create/edit/delete vouchers
   - [ ] Customers can apply vouchers at checkout
   - [ ] Discounts calculated correctly (percentage & fixed)
   - [ ] Quota tracking works accurately
   - [ ] No race conditions on concurrent redemptions

2. **Performance**
   - [ ] Voucher validation < 200ms
   - [ ] Checkout with voucher < 3s total
   - [ ] Support 100+ concurrent voucher redemptions

3. **User Experience**
   - [ ] Clear error messages for invalid vouchers
   - [ ] Discount visible in order summary
   - [ ] Mobile-friendly voucher input
   - [ ] Accessible to screen readers

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Review all code changes
- [ ] Run linter and fix issues
- [ ] Test on local/staging environment
- [ ] Verify database migration is idempotent
- [ ] Backup production database

### Deployment Steps
1. [ ] Deploy database migration using MCP Supabase tools
2. [ ] Verify migration success
3. [ ] Deploy edge functions (validate-voucher, create-midtrans-product-token, create-cashier-product-order)
4. [ ] Verify edge functions deployed successfully
5. [ ] Deploy frontend changes
6. [ ] Verify frontend build success
7. [ ] Test on production (with test voucher)

### Post-Deployment
- [ ] Monitor error logs for 24 hours
- [ ] Check voucher usage statistics
- [ ] Verify no performance degradation
- [ ] Create test vouchers for boss demo
- [ ] Document voucher creation process for team

---

## 📝 Notes & Decisions

### Design Decisions
1. **All-in-one coupon**: Simplified implementation, applies to entire cart
2. **Atomic quota management**: Prevents overselling vouchers
3. **Category restrictions**: Optional, uses array of category IDs
4. **Server-side only**: Security best practice, no client-side discount calculation

### Future Enhancements (Out of Scope)
- Per-product vouchers
- User-specific vouchers (targeted marketing)
- Voucher stacking (multiple vouchers per order)
- Auto-apply best voucher
- Voucher analytics dashboard
- Voucher expiry notifications
- Referral vouchers

### Known Limitations
- One voucher per order
- Cannot combine with other discounts (if `discount_id` is used)
- Category restriction is OR logic (any matching category)
- No per-user usage limit (only global quota)

---

## 🔗 Related Files

### Database
- `supabase/migrations/20260213000000_add_voucher_system.sql`

### Edge Functions
- `supabase/functions/validate-voucher/index.ts` (new)
- `supabase/functions/create-midtrans-product-token/index.ts` (update)
- `supabase/functions/create-cashier-product-order/index.ts` (update)

### Frontend - Admin
- `frontend/src/pages/admin/VoucherManager.tsx` (new)
- `frontend/src/constants/adminMenu.ts` (update)

### Frontend - Customer
- `frontend/src/pages/ProductCheckoutPage.tsx` (update)
- `frontend/src/pages/CartPage.tsx` (optional update)
- `frontend/src/pages/MyProductOrdersPage.tsx` (update)
- `frontend/src/pages/ProductOrderSuccessPage.tsx` (update)

### Localization
- `frontend/src/locales/en.json` (update)
- `frontend/src/locales/id.json` (update)

---

## ✅ Current Status

**Phase 1: Database Migration** - ✅ COMPLETED (migration file created)

**Next Steps**:
1. Deploy migration to Supabase
2. Test RPC functions
3. Start Phase 2: Edge Functions

---

**Last Updated**: 2026-02-13  
**Author**: Kiro AI Assistant  
**Reviewed By**: Pending (Prada + Kaleb)
