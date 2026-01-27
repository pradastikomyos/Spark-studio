# Fix: Session Expired 401 Error pada Booking

## 🐛 Masalah

User kaleb@gmail.com tidak bisa membeli tiket dan mendapat error 401 Unauthorized dari edge function `create-midtrans-token`.

### Root Cause

**Session Mismatch antara Browser dan Server:**

1. User login → session dibuat di `auth.sessions` (server)
2. Token JWT disimpan di browser localStorage
3. Session di server expired/dihapus (cleanup job atau TTL)
4. Browser masih punya token di localStorage
5. `supabase.auth.getSession()` membaca dari localStorage (tidak validasi ke server)
6. AuthContext menganggap user masih login
7. Edge function verify token ke server → **401 karena session tidak ada di database**

### Data Investigasi

```sql
-- User ada di auth.users ✅
SELECT * FROM auth.users WHERE email = 'kaleb@gmail.com';
-- Result: User exists, last_sign_in_at = 2026-01-27 01:39:08

-- Tapi TIDAK ada session aktif ❌
SELECT * FROM auth.sessions WHERE user_id = 'd3268509-b605-46d0-8d83-e86fc14bab9b';
-- Result: Empty (0 rows)

-- Edge function logs menunjukkan 401
-- POST /create-midtrans-token → 401 Unauthorized
```

## ✅ Solusi yang Diimplementasikan

### 1. Session Validation di AuthContext

**File:** `src/contexts/AuthContext.tsx`

Menambahkan validasi session saat initialization:

```typescript
// Validate session by checking if it's actually valid on server
if (session) {
  try {
    // Try to get user to validate session is still valid
    const { data: { user: validatedUser }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !validatedUser) {
      // Session is invalid on server, clear it
      console.warn('Session invalid on server, clearing local session');
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setIsAdmin(false);
    } else {
      // Session is valid
      setSession(session);
      setUser(validatedUser);
    }
  } catch (validationError) {
    // On validation error, clear session to be safe
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  }
}
```

**Benefit:**
- Deteksi expired session saat app load
- Auto-logout jika session invalid
- Mencegah user stuck di "logged in" state palsu

### 2. Enhanced Error Handling di PaymentPage

**File:** `src/pages/PaymentPage.tsx`

#### A. Pre-flight Session Check

```typescript
// Get auth session token and validate it's still valid
const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

if (sessionError || !sessionData.session) {
  // Session expired or invalid - force re-login
  await supabase.auth.signOut(); // Clear invalid session from localStorage
  alert('Your session has expired. Please login again.');
  navigate('/login', { state: { returnTo: location.pathname, returnState: state } });
  return;
}
```

#### B. 401 Response Handling

```typescript
if (!response.ok) {
  // Handle 401 Unauthorized - session expired on server
  if (response.status === 401) {
    await supabase.auth.signOut(); // Clear invalid session
    alert('Your session has expired. Please login again.');
    navigate('/login', { state: { returnTo: location.pathname, returnState: state } });
    return;
  }
  throw new Error(data.error || 'Failed to create payment');
}
```

**Benefit:**
- Graceful handling untuk expired session
- Clear error message untuk user
- Auto-redirect ke login dengan return path
- Preserve booking state untuk resume setelah login

## 🎯 Impact

### Before
- ❌ User stuck dengan "logged in" state tapi tidak bisa booking
- ❌ Cryptic 401 error tanpa penjelasan
- ❌ Harus manual clear localStorage atau hard refresh

### After
- ✅ Auto-detect expired session saat app load
- ✅ Clear error message: "Your session has expired. Please login again."
- ✅ Auto-redirect ke login page
- ✅ Preserve booking state untuk resume

## 🔍 Testing Checklist

- [ ] User dengan expired session auto-logout saat app load
- [ ] Booking attempt dengan expired session redirect ke login
- [ ] Login ulang berhasil dan bisa lanjut booking
- [ ] Return path berfungsi setelah login
- [ ] Booking state preserved setelah re-login

## 📝 Notes

### Kenapa Session Bisa Hilang?

1. **TTL (Time To Live):** Supabase session default 1 jam, refresh token 30 hari
2. **Manual Cleanup:** Admin bisa hapus session via dashboard
3. **Security Policy:** Supabase bisa revoke session jika detect suspicious activity
4. **Database Reset:** Development environment reset bisa hapus sessions

### Best Practices

1. **Always validate session before critical operations** (payment, booking)
2. **Use `supabase.auth.getUser()` untuk server-side validation**, bukan hanya `getSession()`
3. **Handle 401 gracefully** dengan redirect ke login
4. **Preserve user context** (return path, form state) untuk better UX

## 🔗 Related Files

- `src/contexts/AuthContext.tsx` - Session validation logic
- `src/pages/PaymentPage.tsx` - Enhanced error handling
- `supabase/functions/create-midtrans-token/index.ts` - Edge function auth check
