import pool from "@config/db";
import {
    calcOffset,
    calcTotalPages,
} from "@helpers/pagination/pagination.helper";
import { HotspotsStakesOutput } from "@interfaces/api/hotspots-stakes/hotspots-stakes";

export const getStakesByWalletAddress = async ({
    walletAddress,
    page,
    pageSize,
}: {
    walletAddress: string;
    page: number;
    pageSize: number;
}) => {
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
        const total = parseInt(countResult[0]?.total || "0");

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
