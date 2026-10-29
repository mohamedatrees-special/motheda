import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Pool } = pg;

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface PostgresTransactionClient {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
}

export interface PostgresClient {
  readonly isPostgres: true;
  readonly engineType: 'PG_POOL' | 'PGLITE';
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (tx: PostgresTransactionClient) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

class PgPoolClient implements PostgresClient {
  public readonly isPostgres = true;
  public readonly engineType = 'PG_POOL' as const;
  private pool: pg.Pool;

  constructor(connectionString: string) {
    const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    const maxConnections = parseInt(process.env.PG_MAX_CONNECTIONS || '10', 10);

    this.pool = new Pool({
      connectionString,
      max: maxConnections,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: isLocal ? false : { rejectUnauthorized: false },
    });

    this.pool.on('error', (err) => {
      console.error('❌ [PostgreSQL Pool Error]:', err.message);
    });
  }

  public async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    const res = await this.pool.query(sql, params);
    return {
      rows: res.rows as T[],
      rowCount: res.rowCount ?? res.rows.length,
    };
  }

  public async exec(sql: string): Promise<void> {
    await this.pool.query(sql);
  }

  public async transaction<T>(fn: (tx: PostgresTransactionClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const txClient: PostgresTransactionClient = {
        query: async <R = any>(sql: string, params?: any[]) => {
          const res = await client.query(sql, params);
          return { rows: res.rows as R[], rowCount: res.rowCount ?? res.rows.length };
        },
      };
      const result = await fn(txClient);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}

class PGliteClient implements PostgresClient {
  public readonly isPostgres = true;
  public readonly engineType = 'PGLITE' as const;
  private pglite: PGlite;

  constructor(storageDir?: string) {
    if (storageDir) {
      fs.mkdirSync(storageDir, { recursive: true });
      this.pglite = new PGlite(storageDir);
    } else {
      this.pglite = new PGlite();
    }
  }

  public async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    const res = await this.pglite.query(sql, params);
    return {
      rows: (res.rows || []) as T[],
      rowCount: res.rows ? res.rows.length : 0,
    };
  }

  public async exec(sql: string): Promise<void> {
    await this.pglite.exec(sql);
  }

  public async transaction<T>(fn: (tx: PostgresTransactionClient) => Promise<T>): Promise<T> {
    return await this.pglite.transaction(async (tx) => {
      const txClient: PostgresTransactionClient = {
        query: async <R = any>(sql: string, params?: any[]) => {
          const res = await tx.query(sql, params);
          return { rows: (res.rows || []) as R[], rowCount: res.rows ? res.rows.length : 0 };
        },
      };
      return await fn(txClient);
    });
  }

  public async close(): Promise<void> {
    await this.pglite.close();
  }
}

let activePostgresClient: PostgresClient | null = null;

/**
 * Resolves the authoritative PostgreSQL client.
 * In production (`NODE_ENV === 'production'`), DATABASE_URL is strictly MANDATORY (Fail-Closed).
 * In development/testing, if DATABASE_URL is absent, a real persistent PostgreSQL 16 WASM engine (PGlite)
 * is initialized in `data/postgres` ensuring all DDL, SQL dialect, transactions, and types are 100% PostgreSQL.
 */
export function getPostgresClient(customDir?: string): PostgresClient {
  if (activePostgresClient) {
    return activePostgresClient;
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (process.env.NODE_ENV === 'production') {
    if (!databaseUrl || databaseUrl.includes('localhost') || databaseUrl.includes('placeholder')) {
      throw new Error(
        'FATAL PRODUCTION CONFIGURATION ERROR: DATABASE_URL is missing or invalid in production. ' +
        'Al-Motaheda requires a persistent, managed PostgreSQL instance (e.g. Supabase / Cloud SQL) ' +
        'to guarantee order and customer data persistence on Cloud Run. ' +
        'Silent SQLite fallback is strictly prohibited in production.'
      );
    }
    activePostgresClient = new PgPoolClient(databaseUrl);
    return activePostgresClient;
  }

  if (databaseUrl && !databaseUrl.includes('placeholder')) {
    activePostgresClient = new PgPoolClient(databaseUrl);
    return activePostgresClient;
  }

  // Development & Testing: Persistent PostgreSQL 16 WASM engine
  const pgDir = customDir || path.resolve(process.cwd(), 'data', 'postgres');
  activePostgresClient = new PGliteClient(pgDir);
  return activePostgresClient;
}

export function resetPostgresClientForTesting(client: PostgresClient | null) {
  activePostgresClient = client;
}

export function createIsolatedTestPostgresClient(dir?: string): PostgresClient {
  return new PGliteClient(dir);
}
