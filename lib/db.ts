import mysql, { type ExecuteValues } from 'mysql2/promise';

// Create a connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rentals_dashboard',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    dateStrings: true, // Prevent automatic timezone conversion by keeping dates as strings
});

// Helper to sanitize parameters (converts undefined to null for MySQL)
const sanitizeParams = (params?: unknown[]): ExecuteValues => {
    if (!params) return [];
    return params.map(p => p === undefined ? null : p) as ExecuteValues;
};

// Helper function to execute queries
export async function query<T = unknown>(
    sql: string,
    params?: unknown[]
): Promise<T[]> {
    try {
        const [rows] = await pool.execute(sql, sanitizeParams(params));
        return rows as T[];
    } catch (error: unknown) {
        console.error("Database Query Error:", error);
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`DB Error: ${msg}`);
    }
}

// Helper function to execute a single query and return first result
export async function queryOne<T = unknown>(
    sql: string,
    params?: unknown[]
): Promise<T | null> {
    const rows = await query<T>(sql, params || []);
    return rows[0] || null;
}

// Helper function for INSERT/UPDATE/DELETE
export async function execute(
    sql: string,
    params?: unknown[]
): Promise<mysql.ResultSetHeader> {
    try {
        const [result] = await pool.execute(sql, sanitizeParams(params));
        return result as mysql.ResultSetHeader;
    } catch (error: unknown) {
        console.error("Database Execute Error:", error);
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`DB Error: ${msg}`);
    }
}

// Get a connection from the pool (for transactions)
export async function getConnection() {
    return pool.getConnection();
}

// Generate UUID
export function generateUUID(): string {
    return crypto.randomUUID();
}

// Helper function for Transactions
export async function executeTransaction(callback: (connection: mysql.PoolConnection) => Promise<void>) {
    const connection = await getConnection();
    try {
        await connection.beginTransaction();
        await callback(connection);
        await connection.commit();
    } catch (error: unknown) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export default pool;
