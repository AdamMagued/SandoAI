import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getModelId,
  getOutputFormat,
  getVoiceSettings,
  synthesizeSpeech,
} from "@/lib/elevenlabs";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("voice defaults", () => {
  it("defaults to the natural multilingual_v2 model and 128kbps mp3", () => {
    delete process.env.ELEVENLABS_MODEL_ID;
    delete process.env.ELEVENLABS_OUTPUT_FORMAT;
    expect(getModelId()).toBe("eleven_multilingual_v2");
    expect(getOutputFormat()).toBe("mp3_44100_128");
  });

  it("returns human-tuned voice settings by default", () => {
    delete process.env.ELEVENLABS_STABILITY;
    delete process.env.ELEVENLABS_SIMILARITY_BOOST;
    delete process.env.ELEVENLABS_STYLE;
    delete process.env.ELEVENLABS_SPEAKER_BOOST;
    const s = getVoiceSettings();
    expect(s.stability).toBeGreaterThan(0);
    expect(s.stability).toBeLessThan(0.6);
    expect(s.similarity_boost).toBeGreaterThanOrEqual(0.7);
    expect(s.style).toBeGreaterThan(0);
    expect(s.use_speaker_boost).toBe(true);
  });

  it("respects env overrides", () => {
    process.env.ELEVENLABS_MODEL_ID = "eleven_v3";
    process.env.ELEVENLABS_OUTPUT_FORMAT = "mp3_22050_32";
    process.env.ELEVENLABS_STABILITY = "0.2";
    process.env.ELEVENLABS_STYLE = "0.7";
    process.env.ELEVENLABS_SPEAKER_BOOST = "false";
    expect(getModelId()).toBe("eleven_v3");
    expect(getOutputFormat()).toBe("mp3_22050_32");
    const s = getVoiceSettings();
    expect(s.stability).toBe(0.2);
    expect(s.style).toBe(0.7);
    expect(s.use_speaker_boost).toBe(false);
  });

  it("trims whitespace from env values (handles `KEY= value` quirk)", () => {
    process.env.ELEVENLABS_MODEL_ID = "  eleven_turbo_v2_5  ";
    expect(getModelId()).toBe("eleven_turbo_v2_5");
  });
});

describe("synthesizeSpeech", () => {
  it("posts to the right URL with model + voice settings + auth header", async () => {
    process.env.ELEVENLABS_API_KEY = "test-key";
    process.env.ELEVENLABS_VOICE_ID = "voice-abc";
    delete process.env.ELEVENLABS_MODEL_ID;

    const fetchMock = vi.fn(
      async (_url: string | URL, _init?: RequestInit) => ({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
        text: async () => "",
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await synthesizeSpeech("hello world");

    expect(fetchMock).toHaveBeenCalledOnce();
    const call = fetchMock.mock.calls[0]!;
    const url = call[0];
    const init = call[1] as RequestInit;
    expect(String(url)).toContain("/v1/text-to-speech/voice-abc");
    expect(String(url)).toContain("output_format=");
    const headers = init.headers as Record<string, string>;
    expect(headers["xi-api-key"]).toBe("test-key");
    expect(headers["Content-Type"]).toBe("application/json");
    const body = JSON.parse(init.body as string);
    expect(body.text).toBe("hello world");
    expect(body.model_id).toBe("eleven_multilingual_v2");
    expect(body.voice_settings.use_speaker_boost).toBe(true);
    expect(typeof body.voice_settings.style).toBe("number");
  });

  it("throws a descriptive error when ElevenLabs returns a non-2xx", async () => {
    process.env.ELEVENLABS_API_KEY = "test-key";
    process.env.ELEVENLABS_VOICE_ID = "voice-abc";

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 401,
        arrayBuffer: async () => new ArrayBuffer(0),
        text: async () => "invalid api key",
      }))
    );

    await expect(synthesizeSpeech("hi")).rejects.toThrow(/401/);
  });

  it("refuses to call the API without an API key", async () => {
    delete process.env.ELEVENLABS_API_KEY;
    process.env.ELEVENLABS_VOICE_ID = "voice-abc";
    await expect(synthesizeSpeech("hi")).rejects.toThrow(/ELEVENLABS_API_KEY/);
  });

  it("refuses to call the API without a voice id", async () => {
    process.env.ELEVENLABS_API_KEY = "test-key";
    delete process.env.ELEVENLABS_VOICE_ID;
    await expect(synthesizeSpeech("hi")).rejects.toThrow(/ELEVENLABS_VOICE_ID/);
  });

  it("allows per-call overrides for voice id, model, and settings", async () => {
    process.env.ELEVENLABS_API_KEY = "test-key";
    process.env.ELEVENLABS_VOICE_ID = "default-voice";

    const fetchMock = vi.fn(
      async (_url: string | URL, _init?: RequestInit) => ({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(4),
        text: async () => "",
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await synthesizeSpeech("test", {
      voiceId: "override-voice",
      modelId: "eleven_turbo_v2_5",
      voiceSettings: { stability: 0.1 },
    });

    const call = fetchMock.mock.calls[0]!;
    const url = call[0];
    const init = call[1] as RequestInit;
    expect(String(url)).toContain("/v1/text-to-speech/override-voice");
    const body = JSON.parse(init.body as string);
    expect(body.model_id).toBe("eleven_turbo_v2_5");
    expect(body.voice_settings.stability).toBe(0.1);
    expect(body.voice_settings.use_speaker_boost).toBe(true);
  });
});
