# UUID Migration Plan - User System Refactor

## 🎯 **Objective**

Migrate dari dual-table system (auth.users + public.users) ke single source of truth (auth.users + profiles) dengan UUID sebagai primary key.

## ✅ **Phase 1: COMPLETED**

### 1.1 Create Profiles Table ✅
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Status:** ✅ Created
**Rows:** 7 profiles (all auth.users mapped)

### 1.2 Backfill Data ✅
- Merged data from auth.users + public.users
- Matched by email
- Fallback to raw_user_meta_data->>'name' or email prefix

**Status:** ✅ Completed
**Result:** All 7 users have profiles

### 1.3 Auto-Sync Trigger ✅
```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**Status:** ✅ Created
**Benefit:** Future signups auto-create profiles (OAuth, email, magic link, etc)

---

## 🚧 **Phase 2: FK Migration (IN PROGRESS)**

### 2.1 Create Mapping Table

Need temporary table to map old bigint IDs → new UUID IDs:

```sql
CREATE TABLE public.user_id_mapping (
  old_id BIGINT PRIMARY KEY,
  new_id UUID NOT NULL REFERENCES auth.users(id),
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Populate mapping
INSERT INTO public.user_id_mapping (old_id, new_id, email)
SELECT 
  pu.id as old_id,
  au.id as new_id,
  au.email
FROM public.users pu
INNER JOIN auth.users au ON pu.email = au.email;
```

### 2.2 Tables to Migrate

FK columns that need migration from bigint → UUID:

| Table | Column | Current FK | New FK |
|-------|--------|-----------|--------|
| orders | user_id | public.users.id | auth.users.id |
| order_products | user_id | public.users.id | auth.users.id |
| purchased_tickets | user_id | public.users.id | auth.users.id |
| reservations | user_id | public.users.id | auth.users.id |
| user_addresses | user_id | public.users.id | auth.users.id |
| shipping_voucher_usage | user_id | public.users.id | auth.users.id |
| product_reviews | user_id | public.users.id | auth.users.id |
| ticket_reviews | user_id | public.users.id | auth.users.id |

### 2.3 Migration Steps (Per Table)

For each table:

```sql
-- 1. Add new UUID column
ALTER TABLE {table_name} ADD COLUMN user_id_new UUID;

-- 2. Populate with mapped UUIDs
UPDATE {table_name} t
SET user_id_new = m.new_id
FROM public.user_id_mapping m
WHERE t.user_id = m.old_id;

-- 3. Verify no NULLs (all mapped)
SELECT COUNT(*) FROM {table_name} WHERE user_id_new IS NULL;

-- 4. Drop old FK constraint
ALTER TABLE {table_name} DROP CONSTRAINT IF EXISTS {old_fk_name};

-- 5. Drop old column
ALTER TABLE {table_name} DROP COLUMN user_id;

-- 6. Rename new column
ALTER TABLE {table_name} RENAME COLUMN user_id_new TO user_id;

-- 7. Add FK constraint to auth.users
ALTER TABLE {table_name}
  ADD CONSTRAINT {table_name}_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 8. Create index
CREATE INDEX IF NOT EXISTS {table_name}_user_id_idx ON {table_name}(user_id);
```

---

## 🧪 **Phase 3: Testing**

### 3.1 Data Integrity Tests

```sql
-- Test 1: All profiles have auth.users
SELECT COUNT(*) FROM public.profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE au.id IS NULL;
-- Expected: 0

-- Test 2: All orders have valid user_id
SELECT COUNT(*) FROM orders o
LEFT JOIN auth.users au ON o.user_id = au.id
WHERE au.id IS NULL;
-- Expected: 0

-- Test 3: No orphaned data
SELECT 
  'orders' as table_name,
  COUNT(*) as orphaned_count
FROM orders o
LEFT JOIN auth.users au ON o.user_id = au.id
WHERE au.id IS NULL
UNION ALL
SELECT 
  'purchased_tickets',
  COUNT(*)
FROM purchased_tickets pt
LEFT JOIN auth.users au ON pt.user_id = au.id
WHERE au.id IS NULL;
-- Expected: All 0
```

### 3.2 Application Tests

- [ ] Signup flow (email/password)
- [ ] Signup flow (OAuth - if enabled)
- [ ] Login flow
- [ ] Booking flow (create order)
- [ ] Payment flow
- [ ] My Tickets page
- [ ] Admin Product Orders page
- [ ] Admin Ticket Scan page
- [ ] Profile update

---

## 🗑️ **Phase 4: Cleanup**

### 4.1 Drop Legacy Table

```sql
-- Verify no more references to public.users
SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'users'
  AND tc.table_schema = 'public';
-- Expected: Empty result

-- Drop public.users
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop mapping table
DROP TABLE IF EXISTS public.user_id_mapping;
```

### 4.2 Update Edge Functions

Remove any references to public.users in edge functions:

- [x] create-midtrans-token (already uses auth.users)
- [ ] Check other edge functions

---

## 📊 **Current Status**

| Phase | Status | Progress |
|-------|--------|----------|
| Phase 1: Profiles Setup | ✅ Complete | 100% |
| Phase 2: FK Migration | 🚧 Pending | 0% |
| Phase 3: Testing | ⏳ Waiting | 0% |
| Phase 4: Cleanup | ⏳ Waiting | 0% |

**Overall Progress: 25%**

---

## 🎯 **Next Steps**

1. **Execute Phase 2** - Migrate FK columns to UUID
2. **Test thoroughly** - Verify all flows work
3. **Deploy to production** - After staging tests pass
4. **Monitor** - Watch for any issues
5. **Cleanup** - Drop public.users after 1 week stable

---

## 🔒 **Rollback Plan**

If migration fails:

```sql
-- 1. Restore from backup
pg_restore backup_before_migration.sql

-- 2. Revert code changes
git revert {commit_hash}

-- 3. Redeploy edge functions
supabase functions deploy --project-ref hogzjapnkvsihvvbgcdb
```

**Backup taken:** Before Phase 2 execution
**Rollback time:** ~5 minutes

---

## 📝 **Notes**

- **Why FK to auth.users not profiles?** 
  - auth.users is source of truth
  - profiles can be deleted, auth.users cannot
  - Referential integrity requires FK to auth.users

- **Why CASCADE delete?**
  - GDPR compliance
  - User deletion should remove all related data
  - Prevents orphaned records

- **Why UUID not bigint?**
  - Non-sequential (security)
  - Supabase standard
  - Supports distributed systems
  - Industry best practice
