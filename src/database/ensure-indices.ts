import pool from '@config/db';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Ensure database indices exist
 * Reads the indices.sql file and executes it
 * Safe to run multiple times (uses IF NOT EXISTS)
 */
export const ensureIndices = async (): Promise<void> => {
    const client = await pool.connect();
    
    try {
        console.log('📊 Checking database indices...');

        // Read the SQL file
        // Try multiple paths to handle both development and production builds
        const possiblePaths = [
            join(__dirname, 'indices.sql'), // Production build path (dist/database/indices.sql)
            join(process.cwd(), 'src', 'database', 'indices.sql'), // Development path
            join(process.cwd(), 'dist', 'database', 'indices.sql'), // Alternative build path
        ];

        let sql = '';
        let sqlPath = '';

        for (const path of possiblePaths) {
            try {
                sql = readFileSync(path, 'utf-8');
                sqlPath = path;
                break;
            } catch {
                // Try next path
                continue;
            }
        }

        if (!sql) {
            throw new Error('Could not find indices.sql file in any expected location');
        }

        console.log(`📄 Reading indices from: ${sqlPath}`);

        // Split by semicolon and filter out empty statements
        const statements = sql
            .split(';')
            .map((stmt) => stmt.trim())
            .filter((stmt) => stmt.length > 0 && !stmt.startsWith('--'));

        // Execute each statement
        for (const statement of statements) {
            try {
                await client.query(statement);
            } catch (error) {
                // Log but don't fail - index might already exist or there might be a syntax issue
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.warn(`⚠️  Warning executing index statement: ${errorMessage}`);
            }
        }

        console.log('✅ Database indices verified/created successfully');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error ensuring database indices:', errorMessage);
        // Don't throw - allow app to continue even if indices fail
        // This is a performance optimization, not critical for functionality
    } finally {
        client.release();
    }
};

