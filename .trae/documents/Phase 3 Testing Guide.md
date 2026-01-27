# Phase 3: Testing Guide - UUID Migration

**Status**: Ready for Testing  
**Date**: 2026-01-27  
**Tester**: Operator (Codex)

---

## 🔐 Auth Configuration Summary

### Email Confirmation Status
- **Current Setting**: ENABLED (email_confirmed_at is populated for all users)
- **Impact**: New signups will auto-confirm (no email verification required)
- **Evidence**: 
  - 6 out of 7 users have `email_confirmed_at` populated
  - Only `nazriel@gmail.com` (created today) is unconfirmed but never signed in
  - All active users are confirmed

### Password Requirements
- **Minimum Length**: 6 characters
- **Validation**: Enforced in frontend (SignUp.tsx line 32-35)
- **Recommendation for Testing**: Use passwords with 6+ characters

### Identity Providers
- **Email/Password**: ✅ Active (7 users)
- **OAuth (Google/GitHub)**: ❌ Not configured (UI present but not functional)
- **Testing Method**: Use email/password only

---

## 📋 Testing Credentials

### Test Account Recommendations

**Option 1: Create Fresh Test Account**
```
Email: test-uuid-migration@gmail.com
Password: test123 (6 chars minimum)
Name: UUID Test User
```

**Option 2: Use Existing Test Account**
```
Email: testing@gmail.com
Password: [ask admin for password]
Status: Already has 0 orders, safe for testing
```

**Option 3: Admin Account (for admin flows)**
```
Email: admin@gmail.com
Password: [ask admin for password]
Role: Admin
```

---

## ✅ Phase 3 Testing Checklist

### 1. Signup Flow + Auto-Profile Creation

**Test Steps:**
1. Navigate to `/signup`
2. Fill form:
   - Name: "UUID Test User"
   - Email: "test-uuid-migration@gmail.com"
   - Password: "test123"
   - Confirm Password: "test123"
3. Click "Sign Up"
4. Wait for success message
5. Redirect to `/login`

**Expected Results:**
- ✅ Signup succeeds without errors
- ✅ User created in `auth.users` with UUID
- ✅ Profile auto-created in `public.profiles` via trigger
- ✅ Profile has correct name and email
- ✅ No errors in browser console
- ✅ No errors in Supabase logs

**Verification Query:**
```sql
-- Check if profile was created
SELECT 
  u.id,
  u.email,
  u.created_at as auth_created,
  p.name,
  p.email as profile_email,
  p.created_at as profile_created
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'test-uuid-migration@gmail.com';
```

---

### 2. Login Flow

**Test Steps:**
1. Navigate to `/login`
2. Enter credentials:
   - Email: "test-uuid-migration@gmail.com"
   - Password: "test123"
3. Click "Sign In"

**Expected Results:**
- ✅ Login succeeds
- ✅ Redirects to `/` (home page for non-admin)
- ✅ User session active
- ✅ No 401 errors in console
- ✅ AuthContext loads user correctly

---

### 3. Booking Flow (Critical Path)

**Test Steps:**
1. Login as test user
2. Navigate to `/on-stage` or `/events`
3. Select a ticket/event
4. Click "Book Now"
5. Fill booking form (date, time slot, quantity)
6. Proceed to payment

**Expected Results:**
- ✅ Booking form loads without errors
- ✅ Available slots display correctly
- ✅ Can select date and time
- ✅ Proceeds to payment page
- ✅ No session expired errors
- ✅ No 401 errors

---

### 4. Payment Flow (Midtrans Sandbox)

**Test Steps:**
1. Continue from booking flow
2. Review order details
3. Click "Pay Now"
4. Midtrans Snap modal opens
5. Use Midtrans sandbox test card:
   - Card: `4811 1111 1111 1114`
   - Expiry: Any future date
   - CVV: `123`
6. Complete payment

**Expected Results:**
- ✅ Midtrans token created successfully
- ✅ Snap modal opens
- ✅ Payment succeeds in sandbox
- ✅ Order created in `orders` table with UUID `user_id`
- ✅ Purchased ticket created in `purchased_tickets` with UUID `user_id`
- ✅ Webhook processes payment status
- ✅ Redirects to success page

**Verification Query:**
```sql
-- Check order was created with UUID
SELECT 
  o.id,
  o.user_id,
  o.total_amount,
  o.payment_status,
  p.name as customer_name
FROM orders o
JOIN profiles p ON p.id = o.user_id
WHERE o.user_id = (
  SELECT id FROM auth.users WHERE email = 'test-uuid-migration@gmail.com'
)
ORDER BY o.created_at DESC
LIMIT 1;
```

---

### 5. My Tickets Page

**Test Steps:**
1. After successful payment, navigate to `/my-tickets`
2. Verify purchased tickets display

**Expected Results:**
- ✅ Tickets load without errors
- ✅ Correct ticket details shown
- ✅ QR code displays
- ✅ User name from `profiles` table shown correctly

**Verification Query:**
```sql
-- Check purchased tickets
SELECT 
  pt.id,
  pt.user_id,
  pt.ticket_id,
  pt.qr_code,
  p.name as customer_name,
  p.email
FROM purchased_tickets pt
JOIN profiles p ON p.id = pt.user_id
WHERE pt.user_id = (
  SELECT id FROM auth.users WHERE email = 'test-uuid-migration@gmail.com'
);
```

---

### 6. My Orders Page (Product Orders)

**Test Steps:**
1. Navigate to `/shop`
2. Add product to cart
3. Proceed to checkout
4. Complete payment (Midtrans sandbox)
5. Navigate to `/my-orders`

**Expected Results:**
- ✅ Product order created with UUID `user_id`
- ✅ Orders display correctly
- ✅ Customer name from `profiles` shown
- ✅ Order status updates correctly

**Verification Query:**
```sql
-- Check product orders
SELECT 
  op.id,
  op.user_id,
  op.product_id,
  op.quantity,
  op.status,
  p.name as customer_name
FROM order_products op
JOIN profiles p ON p.id = op.user_id
WHERE op.user_id = (
  SELECT id FROM auth.users WHERE email = 'test-uuid-migration@gmail.com'
);
```

---

### 7. Admin: Product Orders View

**Test Steps:**
1. Login as admin (`admin@gmail.com`)
2. Navigate to `/admin/product-orders`
3. Verify all orders display with customer names

**Expected Results:**
- ✅ All orders load (including legacy and new UUID orders)
- ✅ Customer names from `profiles` display correctly
- ✅ No "Unknown User" entries
- ✅ Can filter/search orders
- ✅ No console errors

**Code Reference:**
- File: `src/pages/admin/ProductOrders.tsx`
- Join: `profiles!order_products_user_id_foreign`

---

### 8. Admin: Ticket Scan (QR Scanner)

**Test Steps:**
1. Login as admin
2. Navigate to `/admin/stage-manager` or `/scan/:stageCode`
3. Scan QR code from purchased ticket
4. Verify ticket validation

**Expected Results:**
- ✅ QR scanner loads
- ✅ Ticket validates successfully
- ✅ Customer name from `profiles` displays
- ✅ Scan recorded with correct `user_id` (UUID)
- ✅ No errors during scan

**Code Reference:**
- File: `src/pages/admin/OrderTicket.tsx`
- Join: `profiles!inner`

---

### 9. Admin: Product Pickup Flow

**Test Steps:**
1. Login as admin
2. Navigate to `/admin/product-orders`
3. Find an order with status "paid"
4. Click "Mark as Picked Up"
5. Confirm pickup

**Expected Results:**
- ✅ Pickup status updates
- ✅ `picked_up_by` field set to admin UUID
- ✅ `picked_up_at` timestamp recorded
- ✅ No FK constraint errors
- ✅ Edge function `complete-product-pickup` succeeds

**Verification Query:**
```sql
-- Check pickup was recorded
SELECT 
  op.id,
  op.user_id as customer_id,
  op.picked_up_by as admin_id,
  op.picked_up_at,
  customer.name as customer_name,
  admin.name as admin_name
FROM order_products op
JOIN profiles customer ON customer.id = op.user_id
LEFT JOIN profiles admin ON admin.id = op.picked_up_by
WHERE op.picked_up_by IS NOT NULL
ORDER BY op.picked_up_at DESC
LIMIT 5;
```

---

### 10. Legacy User Data Integrity

**Test Steps:**
1. Login as existing user (e.g., `kaleb@gmail.com`)
2. Navigate to `/my-tickets`
3. Verify historical tickets display
4. Navigate to `/my-orders`
5. Verify historical orders display

**Expected Results:**
- ✅ All historical data intact
- ✅ Old orders (migrated from bigint) display correctly
- ✅ User can see all past purchases
- ✅ No orphaned records
- ✅ No data loss

**Verification Query:**
```sql
-- Check legacy user's migrated data
SELECT 
  'orders' as table_name,
  COUNT(*) as record_count
FROM orders
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'kaleb@gmail.com')
UNION ALL
SELECT 
  'purchased_tickets',
  COUNT(*)
FROM purchased_tickets
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'kaleb@gmail.com')
UNION ALL
SELECT 
  'order_products',
  COUNT(*)
FROM order_products
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'kaleb@gmail.com');
```

---

## 🔍 Edge Function Logs Monitoring

During testing, monitor edge function logs for errors:

**Functions to Monitor:**
1. `create-midtrans-token` - Ticket payment token creation
2. `create-midtrans-product-token` - Product payment token creation
3. `midtrans-webhook` - Payment status updates
4. `sync-midtrans-status` - Manual status sync
5. `complete-product-pickup` - Product pickup completion

**How to Check Logs:**
```bash
# Via Supabase Dashboard
# Navigate to: Edge Functions > [function-name] > Logs

# Or use MCP Supabase tool
mcp_supabase_get_logs(project_id="hogzjapnkvsihvvbgcdb", service="edge-function")
```

**Look for:**
- ❌ 401 Unauthorized errors
- ❌ FK constraint violations
- ❌ NULL user_id errors
- ❌ Type mismatch errors (bigint vs UUID)
- ✅ Successful payment processing
- ✅ Successful webhook handling

---

## 🚨 Known Issues to Watch For

### Issue 1: Session Expired (Fixed)
- **Symptom**: 401 errors during payment
- **Fix**: Already implemented in `AuthContext.tsx` and `PaymentPage.tsx`
- **Test**: Verify no 401 errors during booking/payment flow

### Issue 2: Orphaned Records
- **Symptom**: Orders without matching user
- **Prevention**: Migration script validates all mappings
- **Test**: Run verification queries after each test

### Issue 3: Picked Up By NULL
- **Symptom**: Admin pickup fails
- **Fix**: `picked_up_by` uses `ON DELETE SET NULL` (correct behavior)
- **Test**: Verify pickup flow works and records admin UUID

---

## 📊 Success Criteria

All tests must pass with:
- ✅ 0 console errors
- ✅ 0 edge function errors
- ✅ 0 orphaned records
- ✅ 100% data integrity
- ✅ All flows complete end-to-end
- ✅ Legacy data accessible
- ✅ New signups create profiles automatically

---

## 🐛 Bug Reporting Template

If you encounter issues, report using this format:

```
**Test Case**: [e.g., "Booking Flow - Step 4"]
**Expected**: [What should happen]
**Actual**: [What actually happened]
**Error Message**: [Console/log error]
**User**: [Email used for testing]
**Timestamp**: [When it occurred]
**Browser**: [Chrome/Firefox/etc.]
**Screenshots**: [If applicable]
```

---

## 📝 Testing Notes

### Midtrans Sandbox Test Cards

**Success Scenarios:**
- `4811 1111 1111 1114` - Success
- `4911 1111 1111 1113` - Success (3DS)

**Failure Scenarios:**
- `4911 1111 1111 1121` - Denied by bank
- `4811 1111 1111 1123` - Insufficient funds

**Use for testing:**
- Expiry: Any future date (e.g., 12/28)
- CVV: `123`
- OTP (for 3DS): `112233`

### Email Confirmation
- Currently auto-confirmed (no email verification needed)
- If you see "Please confirm your email" error, check Supabase Auth settings
- All test accounts will be auto-confirmed

### Password Reset
- Not tested in this phase
- If needed, use Supabase dashboard to reset password manually

---

## ✅ Post-Testing Actions

After all tests pass:

1. **Document Results**: Update this file with test results
2. **Monitor Production**: Watch logs for 1 week
3. **Proceed to Phase 4**: Execute cleanup SQL (drop `public.users`)
4. **Update Documentation**: Mark migration as complete

---

## 🎯 Ready to Test!

You're all set! Start with Test Case #1 (Signup Flow) and work through the checklist sequentially.

**Good luck, Operator! 🚀**
