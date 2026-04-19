import { describe, expect, it, vi } from "vitest";
import { Keypair, VersionedTransaction } from "@solana/web3.js";
import { NextRequest } from "next/server";
import {
  GET,
  OPTIONS,
  POST,
} from "@/app/api/actions/mint-sandwich/route";

function asNextRequest(input: Request): NextRequest {
  return input as unknown as NextRequest;
}

function buildUrl(params: Record<string, string> = {}): string {
  const u = new URL("http://localhost/api/actions/mint-sandwich");
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
}

describe("Solana mint-sandwich action", () => {
  describe("GET", () => {
    it("returns ActionGetResponse with verdict baked in and CORS headers", async () => {
      const url = buildUrl({
        sandwich: "BLT",
        reasoning: "rain demands bacon",
        confidence: "98.4",
        mood: "melancholic",
        weather: "thunderstorm",
      });
      const res = await GET(asNextRequest(new Request(url)));
      expect(res.status).toBe(200);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBeTruthy();

      const body = (await res.json()) as {
        type: string;
        title: string;
        description: string;
        label: string;
        icon: string;
      };
      expect(body.type).toBe("action");
      expect(body.title).toContain("BLT");
      expect(body.label).toContain("BLT");
      expect(body.label).toContain("98.4");
      expect(body.description).toContain("melancholic");
      expect(body.description).toContain("thunderstorm");
      expect(body.description).toContain("rain demands bacon");
      expect(body.icon).toMatch(/^https?:\/\//);
    });

    it("falls back to defaults when params are missing", async () => {
      const res = await GET(asNextRequest(new Request(buildUrl())));
      const body = (await res.json()) as { title: string };
      expect(body.title).toContain("Grilled Cheese");
    });
  });

  describe("OPTIONS", () => {
    it("responds with empty body and CORS headers", async () => {
      const res = await OPTIONS();
      expect(res.status).toBe(200);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBeTruthy();
    });
  });

  describe("POST", () => {
    it("returns 400 on invalid JSON", async () => {
      const res = await POST(
        asNextRequest(
          new Request(buildUrl(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{nope",
          })
        )
      );
      expect(res.status).toBe(400);
    });

    it("rejects requests without a valid account", async () => {
      const res = await POST(
        asNextRequest(
          new Request(buildUrl(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ account: "" }),
          })
        )
      );
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toMatch(/cryptographic cheese/i);
    });

    it("returns a serialized devnet memo transaction signed by the user", async () => {
      // Stub the network call to keep the test offline + deterministic.
      const ConnectionMod = await import("@solana/web3.js");
      const blockhash = "11111111111111111111111111111111";
      const spy = vi
        .spyOn(ConnectionMod.Connection.prototype, "getLatestBlockhash")
        .mockResolvedValue({ blockhash, lastValidBlockHeight: 1 });

      const user = Keypair.generate();
      const res = await POST(
        asNextRequest(
          new Request(buildUrl({ sandwich: "Cuban" }), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ account: user.publicKey.toBase58() }),
          })
        )
      );

      expect(res.status).toBe(200);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBeTruthy();
      const body = (await res.json()) as {
        type: string;
        transaction: string;
        message: string;
      };
      expect(body.type).toBe("transaction");
      expect(body.message).toContain("Cuban");

      const tx = VersionedTransaction.deserialize(
        Buffer.from(body.transaction, "base64")
      );
      // The user must be the fee payer (first static account) of the message.
      const accounts = tx.message.staticAccountKeys.map((k) => k.toBase58());
      expect(accounts[0]).toBe(user.publicKey.toBase58());
      expect(tx.message.compiledInstructions.length).toBe(1);

      // Decode the memo instruction's data to confirm the verdict text was written.
      const instr = tx.message.compiledInstructions[0]!;
      const memoText = Buffer.from(instr.data).toString("utf8");
      expect(memoText).toContain("Cuban");
      expect(memoText).toContain("SandoAI verdict");

      spy.mockRestore();
    });

    it("returns the cryptographic-cheese failsafe when the RPC fails", async () => {
      const ConnectionMod = await import("@solana/web3.js");
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const spy = vi
        .spyOn(ConnectionMod.Connection.prototype, "getLatestBlockhash")
        .mockRejectedValue(new Error("network down"));

      const user = Keypair.generate();
      const res = await POST(
        asNextRequest(
          new Request(buildUrl(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ account: user.publicKey.toBase58() }),
          })
        )
      );
      expect(res.status).toBe(503);
      const body = (await res.json()) as { error: string };
      expect(body.error).toMatch(/cryptographic cheese/i);
      expect(body.error).toMatch(/sandwich remains mortal/i);

      spy.mockRestore();
      errSpy.mockRestore();
    });
  });
});
