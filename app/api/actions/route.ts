import { ActionPostResponse, ActionGetResponse, createPostResponse, ACTIONS_CORS_HEADERS } from "@solana/actions";
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { connection } from "@/lib/solana";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sandwich = searchParams.get('sandwich') || 'Unknown Sandwich';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  const payload: ActionGetResponse = {
    title: "Immortalize on Solana",
    icon: `${appUrl}/sandwich-icon.png`,
    description: `Mint "${sandwich}" onto the blockchain forever`,
    label: "Mint Sandwich",
    links: {
      actions: [{
        label: "Mint on Devnet",
        href: `/api/actions?sandwich=${sandwich}`,
        type: "transaction"
      }]
    }
  };

  return Response.json(payload, {
    headers: ACTIONS_CORS_HEADERS
  });
}

export const OPTIONS = async () => {
    return new Response(null, { headers: ACTIONS_CORS_HEADERS });
};

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sandwich = searchParams.get('sandwich') || 'Unknown Sandwich';
    const body = await request.json();
    const account = body.account;

    if (!account) {
      return new Response('Invalid account', { status: 400, headers: ACTIONS_CORS_HEADERS });
    }

    const sender = new PublicKey(account);

    const tx = new Transaction();
    
    // Create memo instruction
    tx.add(
      new TransactionInstruction({
        programId: new PublicKey('Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwamv6yv'),
        keys: [],
        data: Buffer.from(`SandoAI Verdict: ${sandwich}`, 'utf-8'),
      })
    );

    tx.feePayer = sender;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        transaction: tx,
        message: `Successfully immortalized "${sandwich}" on devnet!`,
        type: "transaction"
      }
    });

    return Response.json(payload, { headers: ACTIONS_CORS_HEADERS });
  } catch (err) {
    console.error(err);
    return new Response('Insufficient cryptographic cheese. Your sandwich remains mortal.', { 
        status: 500,
        headers: ACTIONS_CORS_HEADERS
    });
  }
}
