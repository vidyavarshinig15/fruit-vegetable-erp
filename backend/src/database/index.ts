import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables.');
}

const restUrl = SUPABASE_URL.endsWith('/')
  ? `${SUPABASE_URL}rest/v1`
  : `${SUPABASE_URL}/rest/v1`;

export const db = {
  /**
   * Run a PostgREST query on a Supabase table.
   * @param path The PostgREST path, e.g. "products?shop_id=eq.123"
   * @param options Request parameters
   */
  async query<T = any>(
    path: string,
    options: {
      method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
      body?: any;
      headers?: Record<string, string>;
    } = {}
  ): Promise<T[]> {
    const method = options.method || 'GET';
    const headers: Record<string, string> = {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // If writing data, ask PostgREST to return the modified records
    if (method !== 'GET') {
      headers['Prefer'] = 'return=representation';
    }

    const url = `${restUrl}/${path}`;

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Supabase PostgREST error (${response.status}): ${errorText}`);
      }

      if (response.status === 204) {
        return [];
      }

      return response.json();
    } catch (error) {
      console.error(`Database query failed on ${url}:`, error);
      throw error;
    }
  }
};
