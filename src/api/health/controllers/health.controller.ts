import { Context } from 'koa';
import pool from '@config/db';
import { getSolanaConnection } from '@services/web3/solana/solana-connection.service';
import { DepinProgramManager } from '@services/web3/program/depin-program/depin-program-manager.service';
import { RewardSystemManager } from '@services/web3/program/reward-system/reward-system-mananger.service';

/**
 * Health check controller
 * Checks the status of the application, database, and Solana connection
 */
export const healthCheck = async (ctx: Context): Promise<void> => {
    const health = {
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
        const programId = depinProgramManager.programId
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
        const programId = rewardSystemManager.programId
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

    // If any service is down, set status to degraded
    if (health.services.database === 'disconnected' || health.services.solana === 'disconnected') {
        ctx.status = 503; // Service Unavailable
    } else {
        ctx.status = 200;
    }

    ctx.body = health;
};

