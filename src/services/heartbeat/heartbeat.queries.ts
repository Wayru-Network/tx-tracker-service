import pool from '@config/db';
import { PoolClient } from 'pg';
import { SERVICE_NAME } from '@constants/main';
import { HealthStatus } from '@services/health/health-check.service';

/**
 * Check if the heartbeats table exists
 * @returns true if table exists, false otherwise
 */
const tableExists = async (client: PoolClient): Promise<boolean> => {
    try {
        const query = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'heartbeats'
            );
        `;
        const result = await client.query<{ exists: boolean }>(query);
        return result.rows[0]?.exists ?? false;
    } catch {
        return false;
    }
};

/**
 * Update heartbeat in database
 * First attempts UPDATE, if no rows affected then INSERT
 * Verifies table exists before attempting operation
 * @param healthStatus - Health status to store in extra_info
 */
export const updateHeartbeat = async (healthStatus: HealthStatus): Promise<void> => {
    const client = await pool.connect();

    try {
        // Check if table exists first
        const exists = await tableExists(client);
        if (!exists) {
            // Table doesn't exist, silently return (don't log or throw)
            return;
        }

        // First, try to UPDATE existing record
        const updateQuery = `
            UPDATE heartbeats
            SET last_seen_at = NOW(),
                extra_info = $2
            WHERE service_name = $1
        `;

        const updateResult = await client.query(updateQuery, [
            SERVICE_NAME,
            JSON.stringify(healthStatus),
        ]);

        // If no rows were affected, the record doesn't exist, so INSERT it
        if (updateResult.rowCount === 0) {
            const insertQuery = `
                INSERT INTO heartbeats (service_name, last_seen_at, extra_info, created_at, published_at)
                VALUES ($1, NOW(), $2, NOW(), NOW())
            `;

            await client.query(insertQuery, [
                SERVICE_NAME,
                JSON.stringify(healthStatus),
            ]);
        }
    } catch (error) {
        // Log error but don't throw - heartbeat failure shouldn't crash the service
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Check if error is due to table not existing
        if (
            errorMessage.includes('does not exist') ||
            errorMessage.includes('relation') ||
            errorMessage.includes('heartbeats')
        ) {
            // Table doesn't exist, silently return
            return;
        }
        console.error('❌ Error updating heartbeat:', errorMessage);
    } finally {
        client.release();
    }
};

/**
 * Get current heartbeat status
 * If document doesn't exist, creates a new one with default status
 * Verifies table exists before attempting operation
 * @returns Heartbeat record or null if table doesn't exist
 */
export const getHeartbeat = async (): Promise<{
    service_name: string;
    last_seen_at: Date;
    extra_info: HealthStatus;
} | null> => {
    const client = await pool.connect();

    try {
        // Check if table exists first
        const exists = await tableExists(client);
        if (!exists) {
            // Table doesn't exist, silently return null
            return null;
        }

        const query = `
            SELECT service_name, last_seen_at, extra_info
            FROM heartbeats
            WHERE service_name = $1
        `;

        const result = await client.query<{
            service_name: string;
            last_seen_at: Date;
            extra_info: string | HealthStatus;
        }>(query, [SERVICE_NAME]);

        // If no document found, create one with default status
        if (result.rows.length === 0) {
            const defaultHealthStatus: HealthStatus = {
                status: 'ok',
                timestamp: new Date().toISOString(),
                services: {
                    database: 'unknown',
                    solana: 'unknown',
                    depin: 'unknown',
                    rewardSystem: 'unknown',
                },
            };

            const insertQuery = `
                INSERT INTO heartbeats (service_name, last_seen_at, extra_info, created_at, published_at)
                VALUES ($1, NOW(), $2, NOW(), NOW())
                RETURNING service_name, last_seen_at, extra_info
            `;

            const insertResult = await client.query<{
                service_name: string;
                last_seen_at: Date;
                extra_info: string | HealthStatus;
            }>(insertQuery, [
                SERVICE_NAME,
                JSON.stringify(defaultHealthStatus),
            ]);

            if (insertResult.rows.length === 0) {
                return null;
            }

            const row = insertResult.rows[0];
            const extraInfo: HealthStatus = typeof row.extra_info === 'string'
                ? JSON.parse(row.extra_info) as HealthStatus
                : row.extra_info;

            return {
                service_name: row.service_name,
                last_seen_at: row.last_seen_at,
                extra_info: extraInfo,
            };
        }

        const row = result.rows[0];
        const extraInfo: HealthStatus = typeof row.extra_info === 'string'
            ? JSON.parse(row.extra_info) as HealthStatus
            : row.extra_info;

        return {
            service_name: row.service_name,
            last_seen_at: row.last_seen_at,
            extra_info: extraInfo,
        };
    } catch (error) {
        // Check if error is due to table not existing
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage.includes('does not exist') || errorMessage.includes('relation') || errorMessage.includes('heartbeats')) {
            // Table doesn't exist, silently return null
            return null;
        }
        console.error('❌ Error getting heartbeat:', errorMessage);
        return null;
    } finally {
        client.release();
    }
};

