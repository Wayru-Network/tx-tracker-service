import { Keypair } from "@solana/web3.js"
import { base58 } from '@metaplex-foundation/umi/serializers';

export const getKeyPair = async (private_key: string): Promise<Keypair> => {
    const keypair = Keypair.fromSeed(base58.serialize(private_key).slice(0, 32))
    return keypair
}

