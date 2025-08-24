import { Pool } from 'pg';

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:admin@localhost:5432/postgres',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
