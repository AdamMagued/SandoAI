import { NextRequest } from "next/server";
import {
  ACTIONS_CORS_HEADERS,
  type ActionGetResponse,
  type ActionPostRequest,
  type ActionPostResponse,
} from "@solana/actions";
import {
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  clusterApiUrl,
} from "@solana/web3.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Memo program v2 — lets the user attach the verdict text to a real on-chain
// transaction without us needing a custodial fee-payer keypair.
const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
);

const ICON_URL =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Sandwich_clip_art.svg/240px-Sandwich_clip_art.svg.png";

interface ActionParams {
  sandwich: string;
  reasoning: string;
  confidence: number;
  mood: string;
  weather: string;
}

function readParams(request: NextRequest): ActionParams {
  const sp = new URL(request.url).searchParams;
  const confidenceRaw = Number(sp.get("confidence") ?? "97.3");
  return {
    sandwich: sp.get("sandwich") || "Grilled Cheese",
    reasoning:
      sp.get("reasoning") ||
      "When the algorithms fail, warmth prevails. The grilled cheese endures.",
    confidence: Number.isFinite(confidenceRaw) ? confidenceRaw : 97.3,
    mood: sp.get("mood") || "contemplative",
    weather: sp.get("weather") || "overcast",
  };
}

function buildLabel({ sandwich, confidence }: ActionParams): string {
  return `Immortalize "${sandwich}" (${confidence.toFixed(1)}% conf.)`;
}

function buildDescription({
  sandwich,
  reasoning,
  mood,
  weather,
}: ActionParams): string {
  return `Mood: ${mood} · Weather: ${weather}\n\nVerdict: ${sandwich}\n\n${reasoning}`;
}

function buildMemoText(params: ActionParams): string {
  return `SandoAI verdict :: ${params.sandwich} :: mood=${params.mood} :: weather=${params.weather} :: confidence=${params.confidence}`;
}

export async function GET(request: NextRequest) {
  const params = readParams(request);
  const body: ActionGetResponse = {
    type: "action",
    icon: ICON_URL,
    title: `SandoAI: Immortalize "${params.sandwich}"`,
    description: buildDescription(params),
    label: buildLabel(params),
  };
  return Response.json(body, { headers: ACTIONS_CORS_HEADERS });
}

export async function OPTIONS() {
  return new Response(null, { headers: ACTIONS_CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  let postBody: ActionPostRequest;
  try {
    postBody = (await request.json()) as ActionPostRequest;
  } catch {
    return Response.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: ACTIONS_CORS_HEADERS }
    );
  }

  let userPubkey: PublicKey;
  try {
    if (typeof postBody.account !== "string" || postBody.account.length === 0) {
      throw new Error("missing account");
    }
    userPubkey = new PublicKey(postBody.account);
  } catch {
    return Response.json(
      { error: "Insufficient cryptographic cheese. Provide a valid Solana account." },
      { status: 400, headers: ACTIONS_CORS_HEADERS }
    );
  }

  const params = readParams(request);

  try {
    const endpoint = process.env.SOLANA_RPC_URL || clusterApiUrl("devnet");
    const connection = new Connection(endpoint, "confirmed");

    const memoIx = new TransactionInstruction({
      keys: [{ pubkey: userPubkey, isSigner: true, isWritable: true }],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(buildMemoText(params), "utf8"),
    });

    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    const message = new TransactionMessage({
      payerKey: userPubkey,
      recentBlockhash: blockhash,
      instructions: [memoIx],
    }).compileToV0Message();

    const tx = new VersionedTransaction(message);
    const serialized = Buffer.from(tx.serialize()).toString("base64");

    const response: ActionPostResponse = {
      type: "transaction",
      transaction: serialized,
      message: `Sandwich "${params.sandwich}" inscribed onto Solana devnet.`,
    };
    return Response.json(response, { headers: ACTIONS_CORS_HEADERS });
  } catch (err) {
    console.error("Solana action error:", err);
    return Response.json(
      {
        error:
          "Insufficient cryptographic cheese. Transaction failed. Your sandwich remains mortal.",
      },
      { status: 503, headers: ACTIONS_CORS_HEADERS }
    );
  }
}
