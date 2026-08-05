import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables.');
}

const restUrl = SUPABASE_URL.endsWith('/')
  ? `${SUPABASE_URL}rest/v1`
  : `${SUPABASE_URL}/rest/v1`;

const sanitizeBodyUUIDs = (body: any): any => {
  if (!body) return body;
  if (Array.isArray(body)) {
    return body.map(sanitizeBodyUUIDs);
  }
  if (typeof body !== 'object') return body;
  const uuidKeys = ['created_by', 'updated_by', 'deleted_by', 'p_created_by', 'p_updated_by', 'user_id'];
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const sanitized = { ...body };
  for (const key of Object.keys(sanitized)) {
    if (uuidKeys.includes(key)) {
      const val = sanitized[key];
      if (typeof val === 'string' && !uuidRegex.test(val)) {
        sanitized[key] = null;
      }
    }
  }
  return sanitized;
};

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
    const sanitizedBody = options.body ? sanitizeBodyUUIDs(options.body) : undefined;

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: sanitizedBody ? JSON.stringify(sanitizedBody) : undefined,
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
