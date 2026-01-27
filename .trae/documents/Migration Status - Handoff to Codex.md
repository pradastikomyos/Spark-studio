# Migration Status - Handoff to Codex

## ✅ **Completed by Claude (Phase 1)**

### 1. Created `public.profiles` Table
- UUID primary key (FK to auth.users.id)
- Columns: id, name, email, phone, avatar_url, timestamps
- RLS policies enabled
- Indexes created

**Status:** ✅ LIVE in production database

### 2. Backfilled Profile Data
- 7 profiles created from auth.users
- Data merged from public.users (name, phone)
- All users now have profiles

**Verification:**
```sql
SELECT COUNT(*) FROM public.profiles; -- Result: 7
```

### 3. Created Auto-Sync Trigger
- Function: `public.handle_new_user()`
- Trigger: `on_auth_user_created`
- Auto-creates profile when user signs up

**Benefit:** Future signups (email, OAuth, magic link) automatically get profiles

### 4. Documentation Created
- `.trae/documents/UUID Migration Plan.md` - Full migration plan
- `supabase/migrations/20260127_migrate_user_fk_to_uuid.sql` - Phase 2 SQL script

---

## 🚧 **Pending (Phase 2) - Ready for Execution**

### Migration SQL Script Ready
File: `supabase/migrations/20260127_migrate_user_fk_to_uuid.sql`

This script will:
1. Create user_id_mapping table (bigint → UUID)
2. Migrate 9 tables with user_id FK:
   - orders
   - order_products
   - purchased_tickets
   - reservations
   - user_addresses
   - shipping_voucher_usage
   - product_reviews
   - ticket_reviews
   - order_products.picked_up_by

3. Change all user_id columns from bigint → UUID
4. Point all FK to auth.users.id (not profiles!)
5. Add CASCADE delete for GDPR compliance
6. Verify no orphaned records

### How to Execute Phase 2

**Option A: Via Supabase Dashboard (RECOMMENDED)**
1. Go to Supabase Dashboard → SQL Editor
2. Copy content from `supabase/migrations/20260127_migrate_user_fk_to_uuid.sql`
3. Paste and run
4. Watch for NOTICE messages (progress indicators)
5. If any EXCEPTION raised, migration will rollback automatically

**Option B: Via MCP Supabase Tool**
```typescript
// Split into smaller chunks due to MCP limits
// Execute each PHASE section separately
mcp_supabase_execute_sql({
  project_id: "hogzjapnkvsihvvbgcdb",
  query: "-- PHASE 2.1 content here"
})
```

**Estimated Time:** 5-10 minutes
**Risk:** LOW (has rollback on error)
**Downtime:** None (online migration)

---

## ⚠️ **Important Notes**

### Why FK to auth.users not profiles?

```
❌ WRONG:
orders.user_id → profiles.id

✅ CORRECT:
orders.user_id → auth.users.id
```

**Reason:**
- auth.users is source of truth (managed by Supabase)
- profiles can be deleted, auth.users cannot
- Referential integrity requires FK to auth.users
- profiles is just metadata, not identity

### Current State

**Frontend:**
- ✅ ProductOrders.tsx joins to profiles
- ✅ OrderTicket.tsx joins to profiles
- ✅ Edge functions deployed

**Database:**
- ✅ profiles table exists with data
- ✅ Auto-sync trigger active
- ⚠️ FK still point to public.users (bigint)
- ⚠️ public.users still exists (legacy)

**Impact:**
- Frontend queries work (profiles exists)
- New signups work (trigger creates profiles)
- Legacy data still uses public.users FK
- Need Phase 2 to complete migration

---

## 🎯 **Next Steps for Codex**

### Immediate (Before Launch)

1. **Execute Phase 2 Migration**
   - Run `supabase/migrations/20260127_migrate_user_fk_to_uuid.sql`
   - Verify success messages
   - Check for any errors

2. **Test Critical Flows**
   - [ ] Signup new user
   - [ ] Login existing user
   - [ ] Create booking
   - [ ] Make payment
   - [ ] View My Tickets
   - [ ] Admin: View Product Orders
   - [ ] Admin: Scan Ticket

3. **Verify Data Integrity**
   ```sql
   -- No orphaned orders
   SELECT COUNT(*) FROM orders o
   LEFT JOIN auth.users au ON o.user_id = au.id
   WHERE au.id IS NULL;
   -- Expected: 0
   
   -- No orphaned tickets
   SELECT COUNT(*) FROM purchased_tickets pt
   LEFT JOIN auth.users au ON pt.user_id = au.id
   WHERE au.id IS NULL;
   -- Expected: 0
   ```

4. **Monitor for Issues**
   - Check edge function logs
   - Check for 500 errors
   - Check customer support tickets

### After 1 Week Stable (Phase 4)

5. **Drop Legacy Table**
   ```sql
   -- Verify no more FK to public.users
   SELECT * FROM information_schema.table_constraints
   WHERE constraint_type = 'FOREIGN KEY'
     AND table_schema = 'public'
     AND constraint_name LIKE '%users%';
   -- Expected: Empty or only auth.users references
   
   -- Drop public.users
   DROP TABLE IF EXISTS public.users CASCADE;
   
   -- Drop mapping table
   DROP TABLE IF EXISTS public.user_id_mapping;
   ```

---

## 📊 **Migration Progress**

| Phase | Status | Owner | ETA |
|-------|--------|-------|-----|
| Phase 1: Profiles Setup | ✅ Complete | Claude | Done |
| Phase 2: FK Migration | 🚧 Ready | Codex | 10 min |
| Phase 3: Testing | ⏳ Pending | Codex | 30 min |
| Phase 4: Cleanup | ⏳ Pending | Codex | 1 week |

**Overall: 25% Complete**

---

## 🔒 **Rollback Plan**

If Phase 2 fails:

1. **Automatic Rollback**
   - Migration script uses transactions
   - Any EXCEPTION will auto-rollback
   - Database returns to pre-migration state

2. **Manual Rollback** (if needed)
   ```sql
   -- Restore from backup
   -- (Take backup before Phase 2!)
   ```

3. **Code Rollback**
   ```bash
   git revert {commit_hash}
   supabase functions deploy --project-ref hogzjapnkvsihvvbgcdb
   ```

---

## 📞 **Support**

If issues arise:

1. Check `.trae/documents/UUID Migration Plan.md` for details
2. Check migration SQL comments for explanations
3. Check Supabase logs for errors
4. Rollback if critical issue found

---

## ✨ **Benefits After Migration**

- ✅ Single source of truth (auth.users)
- ✅ No race conditions
- ✅ No manual sync code
- ✅ OAuth works automatically
- ✅ GDPR compliant (CASCADE delete)
- ✅ Scalable architecture
- ✅ Industry best practice
- ✅ Future-proof

---

**Prepared by:** Claude
**Date:** 2026-01-27
**Status:** Phase 1 Complete, Phase 2 Ready for Execution
