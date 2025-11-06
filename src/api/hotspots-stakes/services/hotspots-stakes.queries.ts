import pool from "@config/db";
import {
    calcOffset,
    calcTotalPages,
} from "@helpers/pagination/pagination.helper";
import { CreateStakeInput, HotspotsStakesOutput } from "@interfaces/api/hotspots-stakes/hotspots-stakes";

export const getStakesByWalletAddress = async ({
    walletAddress,
    page,
    pageSize,
}: {
    walletAddress: string;
    page: number;
    pageSize: number;
}): Promise<{
    data: HotspotsStakesOutput[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}> => {
    try {
        await pool.connect();
        const offset = calcOffset(page, pageSize);

        // query data
        const { rows: data } = await pool.query<HotspotsStakesOutput>(`
        SELECT 
            hs.*,
            n.model,
            n.name,
            nnl.network_id
        FROM hotspot_stake hs
        LEFT JOIN hotspot_stake_nfnode_links hsnl ON hs.id = hsnl.hotspots_stakes_id
        LEFT JOIN nfnodes n ON hsnl.nfnode_id = n.id
        LEFT JOIN networks_nfnode_links nnl ON n.id = nnl.nfnode_id
        WHERE hs.staker_wallet_address = '${walletAddress}'
        AND nnl.network_id IS NOT NULL
        ORDER BY hs.id
        LIMIT ${pageSize} OFFSET ${offset}
    `);

        // query count
        const { rows: countResult } = await pool.query<{ total: string }>(`
       SELECT COUNT(DISTINCT hs.id) as total
        FROM hotspot_stake hs
        LEFT JOIN hotspot_stake_nfnode_links hsnl ON hs.id = hsnl.hotspots_stakes_id
        LEFT JOIN nfnodes n ON hsnl.nfnode_id = n.id
        LEFT JOIN networks_nfnode_links nnl ON n.id = nnl.nfnode_id
        WHERE hs.staker_wallet_address = '${walletAddress}'
        AND nnl.network_id IS NOT NULL
    `);
        const total = parseInt(countResult[0]?.total ?? "0");

        // for the moment, we are using a fixed value for the earned wayru
        for (const d of data) {
            //TODO: for the moment, we are using a fixed value for the earned wayru
            const randomNumber = Math.random() * 900 + 100;
            d.earned_wayru = parseFloat(randomNumber.toFixed(6));
        }

        return {
            data: data,
            pagination: {
                page,
                pageSize,
                total: total,
                totalPages: calcTotalPages(total, pageSize),
            },
        };
    } catch (error) {
        console.error("Error getting stakes by wallet address:", error);
        return {
            data: [],
            pagination: {
                page,
                pageSize,
                total: 0,
                totalPages: 0,
            },
        };
    }
};

export const stake = async ({
    walletAddress,
    amount: amountProps,
    externalNftMint,
    stakeNftMint,
}: CreateStakeInput): Promise<{ success: boolean; message: string; stakeId?: number }> => {
    const client = await pool.connect();
    console.log('Amount props:', amountProps, 'Type:', typeof amountProps);

    // Ensure amount is properly converted to number
    const amount = typeof amountProps === 'string' ? parseFloat(amountProps) : Number(amountProps);

    if (isNaN(amount)) {
        throw new Error(`Invalid amount value: ${amountProps}`);
    }

    console.log('Creating stake:', { walletAddress, amount, externalNftMint, amountType: typeof amount });

    try {
        // Start transaction
        await client.query('BEGIN');

        // Check if the nfnode exists (using the same client for transaction)
        const nfnodeResult = await client.query<{ id: number; solana_asset_id: string; model: string; name: string }>(
            'SELECT * FROM nfnodes WHERE solana_asset_id = $1',
            [externalNftMint]
        );
        const nfnode = nfnodeResult.rows?.length > 0 ? nfnodeResult.rows[0] : null;
        if (!nfnode) {
            throw new Error("Nfnode not found");
        }

        // current date + 90 days, format: YYYY-MM-DD HH:mm:ss (Postgres-friendly)
        const unlocksIn = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
            .toISOString()
            .replace('T', ' ')
            .substring(0, 19);

        // Check if a stake already exists with the same walletAddress and externalNftMint with status != 'unstaked'
        const existingStakeResult = await client.query<{ id: number; amount: string | number }>(`
            SELECT hs.id, hs.amount
            FROM hotspot_stake hs
            INNER JOIN hotspot_stake_nfnode_links hsnl ON hs.id = hsnl.hotspots_stakes_id
            WHERE hs.staker_wallet_address = $1 
            AND hsnl.nfnode_id = $2
            AND hs.status != 'unstaked'
            LIMIT 1
        `, [walletAddress, nfnode.id]);

        let stakeId: number;
        let isUpdate = false;

        console.log('Existing stake result:', existingStakeResult.rows);
        if (existingStakeResult.rows?.length > 0) {
            // Update existing stake by adding the new amount
            const existingStake = existingStakeResult.rows[0];
            stakeId = existingStake.id;

            // Parse amount from database (PostgreSQL returns numeric as string)
            // If amount is null, undefined, or NaN, treat it as 0
            let existingAmount = 0;
            if (existingStake.amount !== null && existingStake.amount !== undefined) {
                const parsed = typeof existingStake.amount === 'string'
                    ? parseFloat(existingStake.amount)
                    : Number(existingStake.amount);

                if (!isNaN(parsed)) {
                    existingAmount = parsed;
                }
            }

            console.log('Existing stake raw amount:', existingStake.amount, 'Parsed amount:', existingAmount);

            const newAmount = existingAmount + amount;
            isUpdate = true;

            console.log('Updating stake - Existing amount:', existingAmount, 'New amount to add:', amount, 'Total:', newAmount);
            const amountToSave = newAmount.toString();
            console.log('Updating with amount value:', amountToSave, 'Type:', typeof amountToSave);

            const updateResult = await client.query<{ id: number; amount: string | number }>(`
                UPDATE hotspot_stake 
                SET amount = $1::numeric, updated_at = $2, status = 'staked', unlocks_in = $3::timestamp
                WHERE id = $4
                RETURNING id, amount
            `, [amountToSave, new Date().toISOString(), unlocksIn, stakeId]);

            const savedAmount = typeof updateResult.rows[0]?.amount === 'string'
                ? parseFloat(updateResult.rows[0].amount)
                : Number(updateResult.rows[0]?.amount);
            console.log('Stake updated - Amount saved:', savedAmount, 'Raw value:', updateResult.rows[0]?.amount);
            console.log('Stake updated successfully');
        } else {
            // Insert new stake into hotspot_stake and get the ID
            console.log('Inserting new stake with amount:', amount, 'Type:', typeof amount);
            const amountToInsert = amount.toString();
            console.log('Inserting with amount value:', amountToInsert, 'Type:', typeof amountToInsert);

            const stakeResult = await client.query<{ id: number; amount: string | number }>(`
                INSERT INTO hotspot_stake (staker_wallet_address, amount, status, created_at, published_at, stake_nft_mint, unlocks_in)
                VALUES ($1, $2::numeric, $3, $4, $5, $6, $7::timestamp)
                RETURNING id, amount
            `, [walletAddress, amountToInsert, 'staked', new Date().toISOString(), new Date().toISOString(), stakeNftMint, unlocksIn]);

            stakeId = stakeResult.rows[0]?.id;
            const insertedAmountRaw = stakeResult.rows[0]?.amount;
            const insertedAmount = typeof insertedAmountRaw === 'string'
                ? parseFloat(insertedAmountRaw)
                : Number(insertedAmountRaw);
            console.log('Stake inserted - ID:', stakeId, 'Amount saved:', insertedAmount, 'Raw value:', insertedAmountRaw);

            if (!stakeId) {
                throw new Error("Failed to create stake: No ID returned");
            }

            // Insert into hotspot_stake_nfnode_links (relationship table)
            await client.query(`
                INSERT INTO hotspot_stake_nfnode_links (hotspots_stakes_id, nfnode_id)
                VALUES ($1, $2)
            `, [stakeId, nfnode.id]);

            console.log('Stake created successfully');
        }

        // Commit transaction
        await client.query('COMMIT');

        return {
            success: true,
            message: isUpdate ? "Stake updated successfully" : "Stake created successfully",
            stakeId,
        };
    } catch (error) {
        // Rollback transaction on error
        await client.query('ROLLBACK');
        console.error("Error creating stake:", error);

        const errorMessage = error instanceof Error ? error.message : "Error creating stake";
        return {
            success: false,
            message: errorMessage,
        };
    } finally {
        // Release client back to pool
        client.release();
    }
}

export const unStake = async ({
    walletAddress,
    amount: amountProps,
    externalNftMint,
    stakeNftMint,
}: CreateStakeInput): Promise<{ success: boolean; message: string; stakeId?: number }> => {
    const client = await pool.connect();
    console.log('Amount props:', amountProps);
    const amount = Number(amountProps);
    console.log('Unstaking stake:', { walletAddress, amount, externalNftMint });

    try {
        // Start transaction
        await client.query('BEGIN');

        // Check if the nfnode exists (using the same client for transaction)
        const nfnodeResult = await client.query<{ id: number; solana_asset_id: string; model: string; name: string }>(
            'SELECT * FROM nfnodes WHERE solana_asset_id = $1',
            [externalNftMint]
        );
        const nfnode = nfnodeResult.rows?.length > 0 ? nfnodeResult.rows[0] : null;
        if (!nfnode) {
            throw new Error("Nfnode not found");
        }

        // Check if the stake exists using JOIN with the relationship table
        const stakeResult = await client.query<{ id: number }>(`
            SELECT hs.*
            FROM hotspot_stake hs
            INNER JOIN hotspot_stake_nfnode_links hsnl ON hs.id = hsnl.hotspots_stakes_id
            WHERE hs.staker_wallet_address = $1 
            AND hsnl.nfnode_id = $2
            AND hs.status = 'staked'
            AND hs.stake_nft_mint = $3
        `, [walletAddress, nfnode.id, stakeNftMint]);
        const stake = stakeResult.rows?.length > 0 ? stakeResult.rows[0] : null;
        if (!stake) {
            throw new Error("Stake not found");
        }

        // Update the stake status to unstaked
        await client.query(`
            UPDATE hotspot_stake SET status = $1 WHERE id = $2
        `, ['unstaked', stake.id]);

        // Commit transaction
        await client.query('COMMIT');

        return {
            success: true,
            message: "Stake deleted successfully",
            stakeId: stake.id,
        };
    } catch (error) {
        // Rollback transaction on error
        await client.query('ROLLBACK');
        console.error("Error deleting stake:", error);
        const errorMessage = error instanceof Error ? error.message : "Error deleting stake";
        return {
            success: false,
            message: errorMessage,
        };
    } finally {
        // Release client back to pool
        client.release();
    }
}

