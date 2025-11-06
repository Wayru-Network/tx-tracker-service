

export interface HotspotsStakesOutput {
    id: number
    created_at: string
    updated_at: string
    published_at: string
    created_by_id: number
    updated_by_id: number
    staker_wallet_address: string
    amount: number
    unlocks_in: string
    model: string
    name: string
    network_id: number
    earned_wayru: number
    status: 'staked' | 'unstaked'
}


export interface CreateStakeInput {
    walletAddress: string;
    amount: string;
    externalNftMint: string;
    stakeNftMint: string;
}