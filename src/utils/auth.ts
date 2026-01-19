import { supabase } from '../lib/supabase';

// Check if user has admin role from database
export const isAdmin = async (userId: string | undefined): Promise<boolean> => {
  if (!userId) return false;
  
  try {
    // Query role assignments table to check if user has admin role
    const { data, error } = await supabase
      .from('user_role_assignments')
      .select('role_name')
      .eq('user_id', userId)
      .in('role_name', ['super_admin', 'super-admin', 'admin']);
    
    if (error) {
      return false;
    }
    
    return data && data.length > 0;
  } catch (error) {
    return false;
  }
};

export const getDefaultRoute = async (userId: string | undefined): Promise<string> => {
  const admin = await isAdmin(userId);
  return admin ? '/admin/dashboard' : '/';
};
