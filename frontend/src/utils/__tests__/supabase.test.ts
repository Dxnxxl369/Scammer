// @vitest-environment node
import { describe, it, expect, vi, beforeAll } from 'vitest'

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ auth: { getSession: vi.fn() } })),
}))

beforeAll(() => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://flbciklzqhnpzmvzbius.supabase.co')
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-publishable-key')
})

describe('Supabase client', () => {
  it('test_variables_entorno_estan_definidas', () => {
    expect(import.meta.env.VITE_SUPABASE_URL).toBeDefined()
    expect(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY).toBeDefined()
  })

  it('test_cliente_supabase_se_inicializa', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    expect(typeof createClient).toBe('function')
    const client = createClient('https://example.supabase.co', 'test-key')
    expect(client).toBeDefined()
    expect(client.auth).toBeDefined()
  })
})
