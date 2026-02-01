import { describe, it, expect, vi } from 'vitest'
import * as fc from 'fast-check'

// Simulation of the Edge Function auth logic
async function mockAuthLogic(authHeader: string | null, supabase: any) {
    if (!authHeader) {
        return {
            status: 401,
            body: { error: 'Missing authorization header' }
        }
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user?.id) {
        const isExpired = authError?.message?.toLowerCase().includes('expired')
        return {
            status: 401,
            body: {
                error: isExpired ? 'Session Expired' : 'Unauthorized',
                code: isExpired ? 'SESSION_EXPIRED' : 'INVALID_TOKEN',
                message: authError?.message || 'Invalid or expired session'
            }
        }
    }

    return { status: 200, body: { user } }
}

describe('Edge Function Auth Logic', () => {
    it('should return SESSION_EXPIRED when token contains "expired"', async () => {
        const supabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: null },
                    error: { message: 'JWT expired' }
                })
            }
        }

        const response = await mockAuthLogic('Bearer some-expired-token', supabase)
        expect(response.status).toBe(401)
        expect(response.body.code).toBe('SESSION_EXPIRED')
        expect(response.body.error).toBe('Session Expired')
    })

    it('should return INVALID_TOKEN for other auth errors', async () => {
        const supabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: null },
                    error: { message: 'Invalid signature' }
                })
            }
        }

        const response = await mockAuthLogic('Bearer some-invalid-token', supabase)
        expect(response.status).toBe(401)
        expect(response.body.code).toBe('INVALID_TOKEN')
        expect(response.body.error).toBe('Unauthorized')
    })

    it('should be robust across different error messages (Property Test)', async () => {
        await fc.assert(
            fc.asyncProperty(fc.string(), async (errMsg) => {
                const supabase = {
                    auth: {
                        getUser: vi.fn().mockResolvedValue({
                            data: { user: null },
                            error: { message: errMsg }
                        })
                    }
                }

                const response = await mockAuthLogic('Bearer token', supabase)
                expect(response.status).toBe(401)

                if (errMsg.toLowerCase().includes('expired')) {
                    expect(response.body.code).toBe('SESSION_EXPIRED')
                } else {
                    expect(response.body.code).toBe('INVALID_TOKEN')
                }
            })
        )
    })
})
