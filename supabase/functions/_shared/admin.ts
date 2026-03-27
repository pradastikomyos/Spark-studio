import { json } from './http.ts'
import { getSupabaseEnv } from './env.ts'
import { createServiceClient, getUserFromAuthHeader } from './supabase.ts'

const ADMIN_ROLES = new Set(['admin', 'super_admin', 'super-admin'])

type AdminContext = {
  user: { id: string; email?: string | null }
  supabaseService: ReturnType<typeof createServiceClient>
}

export async function requireAdminContext(req: Request): Promise<{ context?: AdminContext; response?: Response }> {
  const { url: supabaseUrl, anonKey: supabaseAnonKey, serviceRoleKey: supabaseServiceKey } = getSupabaseEnv()
  const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization')

  if (!authHeader) {
    return {
      response: json(req, { error: 'Missing authorization header' }, { status: 401 }),
    }
  }

  const { user, error: authError } = await getUserFromAuthHeader({
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    authHeader,
  })

  if (authError || !user?.id) {
    return {
      response: json(
        req,
        {
          error: 'Invalid token',
          details: authError?.message ?? null,
        },
        { status: 401 }
      ),
    }
  }

  const supabaseService = createServiceClient(supabaseUrl, supabaseServiceKey)
  const { data: roleRows, error: roleError } = await supabaseService
    .from('user_role_assignments')
    .select('role_name')
    .eq('user_id', user.id)

  if (roleError) {
    return {
      response: json(req, { error: 'Failed to verify role' }, { status: 500 }),
    }
  }

  const isAdmin =
    Array.isArray(roleRows) &&
    roleRows.some((row) => {
      const roleName = String((row as { role_name?: string }).role_name ?? '').toLowerCase()
      return ADMIN_ROLES.has(roleName)
    })

  if (!isAdmin) {
    return {
      response: json(req, { error: 'Forbidden' }, { status: 403 }),
    }
  }

  return {
    context: {
      user: {
        id: user.id,
        email: user.email,
      },
      supabaseService,
    },
  }
}
