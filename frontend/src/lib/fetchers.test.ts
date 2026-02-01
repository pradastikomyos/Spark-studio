import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabaseFetcher, supabaseListFetcher, supabaseSingleFetcher, supabaseAuthFetcher, APIError } from './fetchers';
import { supabase } from './supabase';

// Mock the supabase client
vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn(),
    },
  },
}));

describe('Fetcher Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('supabaseFetcher', () => {
    it('should return data on successful query', async () => {
      const mockData = [{ id: 1, name: 'Test' }];
      const mockQuery = vi.fn().mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await supabaseFetcher(mockQuery);

      expect(result).toEqual(mockData);
      expect(mockQuery).toHaveBeenCalled();
    });

    it('should return empty array when data is null', async () => {
      const mockQuery = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await supabaseFetcher(mockQuery);

      expect(result).toEqual([]);
    });

    it('should throw APIError with status 404 on PGRST116 error', async () => {
      const mockQuery = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      await expect(supabaseFetcher(mockQuery)).rejects.toThrow('Not found');
      
      try {
        await supabaseFetcher(mockQuery);
      } catch (error) {
        expect((error as APIError).status).toBe(404);
        expect((error as APIError).info).toEqual({ code: 'PGRST116', message: 'Not found' });
      }
    });

    it('should throw APIError with status 500 on other errors', async () => {
      const mockQuery = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST000', message: 'Server error' },
      });

      await expect(supabaseFetcher(mockQuery)).rejects.toThrow('Server error');
      
      try {
        await supabaseFetcher(mockQuery);
      } catch (error) {
        expect((error as APIError).status).toBe(500);
        expect((error as APIError).info).toEqual({ code: 'PGRST000', message: 'Server error' });
      }
    });
  });

  describe('supabaseListFetcher', () => {
    it('should fetch list without filters', async () => {
      const mockData = [{ id: 1, name: 'Product 1' }, { id: 2, name: 'Product 2' }];
      const mockSelect = vi.fn().mockResolvedValue({
        data: mockData,
        error: null,
      });
      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      vi.mocked(supabase.from).mockReturnValue(mockFrom() as any);

      const result = await supabaseListFetcher('products');

      expect(supabase.from).toHaveBeenCalledWith('products');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(result).toEqual(mockData);
    });

    it('should fetch list with custom select', async () => {
      const mockData = [{ id: 1 }, { id: 2 }];
      const mockSelect = vi.fn().mockResolvedValue({
        data: mockData,
        error: null,
      });
      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      vi.mocked(supabase.from).mockReturnValue(mockFrom() as any);

      const result = await supabaseListFetcher('products', 'id');

      expect(mockSelect).toHaveBeenCalledWith('id');
      expect(result).toEqual(mockData);
    });

    it('should apply filters when provided', async () => {
      const mockData = [{ id: 1, is_active: true }];
      const mockEq = vi.fn().mockResolvedValue({
        data: mockData,
        error: null,
      });
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });
      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      vi.mocked(supabase.from).mockReturnValue(mockFrom() as any);

      const filters = (query: any) => query.eq('is_active', true);
      const result = await supabaseListFetcher('products', '*', filters);

      expect(mockEq).toHaveBeenCalledWith('is_active', true);
      expect(result).toEqual(mockData);
    });

    it('should throw APIError on query failure', async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST000', message: 'Database error' },
      });
      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      vi.mocked(supabase.from).mockReturnValue(mockFrom() as any);

      await expect(supabaseListFetcher('products')).rejects.toThrow('Database error');
    });
  });

  describe('supabaseSingleFetcher', () => {
    it('should fetch single record by ID', async () => {
      const mockData = { id: 1, name: 'Product 1' };
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockData,
        error: null,
      });
      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });
      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      vi.mocked(supabase.from).mockReturnValue(mockFrom() as any);

      const result = await supabaseSingleFetcher('products', 1);

      expect(supabase.from).toHaveBeenCalledWith('products');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('id', 1);
      expect(result).toEqual(mockData);
    });

    it('should fetch single record with custom select', async () => {
      const mockData = { id: 1 };
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockData,
        error: null,
      });
      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });
      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      vi.mocked(supabase.from).mockReturnValue(mockFrom() as any);

      const result = await supabaseSingleFetcher('products', 1, 'id');

      expect(mockSelect).toHaveBeenCalledWith('id');
      expect(result).toEqual(mockData);
    });

    it('should return null on PGRST116 (not found) error', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });
      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });
      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      vi.mocked(supabase.from).mockReturnValue(mockFrom() as any);

      const result = await supabaseSingleFetcher('products', 999);

      expect(result).toBeNull();
    });

    it('should throw APIError with status 500 on other errors', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST000', message: 'Server error' },
      });
      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });
      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      vi.mocked(supabase.from).mockReturnValue(mockFrom() as any);

      await expect(supabaseSingleFetcher('products', 1)).rejects.toThrow('Server error');
      
      try {
        await supabaseSingleFetcher('products', 1);
      } catch (error) {
        expect((error as APIError).status).toBe(500);
      }
    });

    it('should work with string IDs', async () => {
      const mockData = { id: 'abc-123', name: 'Product' };
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockData,
        error: null,
      });
      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });
      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      vi.mocked(supabase.from).mockReturnValue(mockFrom() as any);

      const result = await supabaseSingleFetcher('products', 'abc-123');

      expect(mockEq).toHaveBeenCalledWith('id', 'abc-123');
      expect(result).toEqual(mockData);
    });
  });

  describe('supabaseAuthFetcher', () => {
    it('should fetch data when session exists', async () => {
      const mockData = [{ id: 1, user_id: 'user-123' }];
      const mockQuery = vi.fn().mockResolvedValue({
        data: mockData,
        error: null,
      });

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: { user: { id: 'user-123' } } as any,
        },
        error: null,
      });

      const result = await supabaseAuthFetcher(mockQuery);

      expect(supabase.auth.getSession).toHaveBeenCalled();
      expect(result).toEqual(mockData);
    });

    it('should throw APIError with status 401 when no session', async () => {
      const mockQuery = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: null,
        },
        error: null,
      });

      await expect(supabaseAuthFetcher(mockQuery)).rejects.toThrow('Unauthorized');
      
      try {
        await supabaseAuthFetcher(mockQuery);
      } catch (error) {
        expect((error as APIError).status).toBe(401);
      }

      // Query should not be called if no session
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should propagate query errors after session check', async () => {
      const mockQuery = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST000', message: 'Query error' },
      });

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: { user: { id: 'user-123' } } as any,
        },
        error: null,
      });

      await expect(supabaseAuthFetcher(mockQuery)).rejects.toThrow('Query error');
    });
  });
});
