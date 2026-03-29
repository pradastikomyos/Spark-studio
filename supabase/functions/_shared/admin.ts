import { json } from './http.ts'
import { createServiceClient } from './supabase.ts'
import { requireAuthenticatedRequest } from './auth.ts'

const ADMIN_ROLES = new Set(['admin', 'super_admin', 'super-admin'])

type AdminContext = {
  user: { id: string; email?: string | null }
  supabaseService: ReturnType<typeof createServiceClient>
}

export async function requireAdminContext(req: Request): Promise<{ context?: AdminContext; response?: Response }> {
  const authResult = await requireAuthenticatedRequest(req)
  if (authResult.response) return { response: authResult.response }

  const authContext = authResult.context
  if (!authContext) {
    return {
      response: json(req, { error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const supabaseService = createServiceClient(authContext.supabaseEnv.url, authContext.supabaseEnv.serviceRoleKey)
  const { data: roleRows, error: roleError } = await supabaseService
    .from('user_role_assignments')
    .select('role_name')
    .eq('user_id', authContext.user.id)

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
        id: authContext.user.id,
        email: authContext.user.email,
      },
      supabaseService,
    },
  }
}
