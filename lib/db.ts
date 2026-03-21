import mysql from 'mysql2/promise';

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

// Helper function to execute queries
export async function query<T = any>(
    sql: string,
    params?: any[]
): Promise<T[]> {
    try {
        const [rows] = await pool.execute(sql, params || []);
        return rows as T[];
    } catch (error: any) {
        console.error("Database Query Error:", error);
        throw new Error(`DB Error: ${error?.message || 'Unknown error'}`);
    }
}

// Helper function to execute a single query and return first result
export async function queryOne<T = any>(
    sql: string,
    params?: any[]
): Promise<T | null> {
    const rows = await query<T>(sql, params || []);
    return rows[0] || null;
}

// Helper function for INSERT/UPDATE/DELETE
export async function execute(
    sql: string,
    params?: any[]
): Promise<mysql.ResultSetHeader> {
    try {
        const [result] = await pool.execute(sql, params || []);
        return result as mysql.ResultSetHeader;
    } catch (error: any) {
        console.error("Database Execute Error:", error);
        throw new Error(`DB Error: ${error?.message || 'Unknown error'}`);
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
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export default pool;
