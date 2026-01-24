import { supabase } from '../lib/supabase';

// Check if user has admin role from database
export const isAdmin = async (userId: string | undefined): Promise<boolean> => {
  if (!userId) return false;
  
  try {
    // Query role assignments table to check if user has admin role
    // Using single role check to avoid .in() query issues with RLS
    const { data, error } = await supabase
      .from('user_role_assignments')
      .select('role_name')
      .eq('user_id', userId);
    
    if (error) {
      // RLS might block this query for non-admin users, that's expected
      // Only log in development mode
      if (import.meta.env.DEV) {
        console.debug('Admin check: user is not admin or RLS blocked query');
      }
      return false;
    }
    
    // Check if any of the returned roles are admin roles
    const adminRoles = ['super_admin', 'super-admin', 'admin'];
    return data?.some(row => adminRoles.includes(row.role_name)) ?? false;
  } catch {
    // Silently fail - user is not admin
    return false;
  }
};

export const getDefaultRoute = async (userId: string | undefined): Promise<string> => {
  const admin = await isAdmin(userId);
  return admin ? '/admin/dashboard' : '/';
};
