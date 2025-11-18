import pool from '@config/db';
import { getSolanaConnection } from '@services/web3/solana/solana-connection.service';
import { DepinProgramManager } from '@services/web3/program/depin-program/depin-program-manager.service';
import { RewardSystemManager } from '@services/web3/program/reward-system/reward-system-mananger.service';

/**
 * Health status interface
 */
export interface HealthStatus {
    status: 'ok' | 'degraded' | 'down';
    timestamp: string;
    services: {
        database: 'connected' | 'disconnected' | 'unknown';
        solana: 'connected' | 'disconnected' | 'unknown';
        depin: 'connected' | 'disconnected' | 'unknown';
        rewardSystem: 'connected' | 'disconnected' | 'unknown';
    };
}

/**
 * Service to perform health checks
 * Reusable health check logic that can be used by both HTTP endpoint and heartbeat service
 */
export class HealthCheckService {
    /**
     * Perform a complete health check of all services
     * @returns HealthStatus object with status of all services
     */
    static async performHealthCheck(): Promise<HealthStatus> {
        const health: HealthStatus = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            services: {
                database: 'unknown',
                solana: 'unknown',
                depin: 'unknown',
                rewardSystem: 'unknown',
            },
        };

        // Check database connection
        try {
            const client = await pool.connect();
            await client.query('SELECT 1');
            client.release();
            health.services.database = 'connected';
        } catch (_error) {
            console.error('Database connection error:', _error);
            health.status = 'degraded';
            health.services.database = 'disconnected';
        }

        // Check Solana connection
        try {
            const connection = getSolanaConnection('confirmed');
            await connection.getVersion();
            health.services.solana = 'connected';
        } catch (_error) {
            console.error('Solana connection error:', _error);
            health.status = 'degraded';
            health.services.solana = 'disconnected';
        }

        // Check Depin Program connection
        try {
            const depinProgramManager = await DepinProgramManager.getInstance();
            const programId = depinProgramManager.programId;
            if (programId) {
                health.services.depin = 'connected';
            } else {
                health.status = 'degraded';
                health.services.depin = 'disconnected';
            }
        } catch (_error) {
            console.error('Depin Program connection error:', _error);
            health.status = 'degraded';
            health.services.depin = 'disconnected';
        }

        // Check Reward System connection
        try {
            const rewardSystemManager = await RewardSystemManager.getInstance();
            const programId = rewardSystemManager.programId;
            if (programId) {
                health.services.rewardSystem = 'connected';
            } else {
                health.status = 'degraded';
                health.services.rewardSystem = 'disconnected';
            }
        } catch (_error) {
            console.error('Reward System connection error:', _error);
            health.status = 'degraded';
            health.services.rewardSystem = 'disconnected';
        }

        // If critical services are down, set status to degraded
        if (health.services.database === 'disconnected' || health.services.solana === 'disconnected') {
            health.status = 'degraded';
        }

        return health;
    }
}

