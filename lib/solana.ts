import { Connection } from '@solana/web3.js';

const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
export const connection = new Connection(rpcUrl, 'confirmed');
