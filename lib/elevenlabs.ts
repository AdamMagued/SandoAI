// ElevenLabs TTS adapter.
//
// Defaults are tuned for the most human-sounding output ElevenLabs ships:
//   • model_id           = eleven_multilingual_v2  (their highest-quality, most
//                          natural model — also the one that supports `style`)
//   • output_format      = mp3_44100_128           (full-quality MP3)
//   • voice_settings:
//       stability        = 0.35   (lower = more variation, more human)
//       similarity_boost = 0.85   (preserve cloned voice character)
//       style            = 0.45   (lean into expressive prosody)
//       use_speaker_boost = true  (cleaner, more present voice)
//
// All of these can be overridden by environment variables so you can A/B test
// without touching code:
//   ELEVENLABS_MODEL_ID, ELEVENLABS_OUTPUT_FORMAT,
//   ELEVENLABS_STABILITY, ELEVENLABS_SIMILARITY_BOOST,
//   ELEVENLABS_STYLE, ELEVENLABS_SPEAKER_BOOST

function envStr(name: string, fallback: string): string {
  const raw = process.env[name];
  if (typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function envFloat(name: string, fallback: number): number {
  const raw = process.env[name];
  if (typeof raw !== "string") return fallback;
  const n = parseFloat(raw.trim());
  return Number.isFinite(n) ? n : fallback;
}

function envBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (typeof raw !== "string") return fallback;
  const v = raw.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(v)) return true;
  if (["false", "0", "no", "off"].includes(v)) return false;
  return fallback;
}

export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
}

export function getVoiceSettings(): VoiceSettings {
  return {
    stability: envFloat("ELEVENLABS_STABILITY", 0.35),
    similarity_boost: envFloat("ELEVENLABS_SIMILARITY_BOOST", 0.85),
    style: envFloat("ELEVENLABS_STYLE", 0.45),
    use_speaker_boost: envBool("ELEVENLABS_SPEAKER_BOOST", true),
  };
}

export function getModelId(): string {
  return envStr("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2");
}

export function getOutputFormat(): string {
  return envStr("ELEVENLABS_OUTPUT_FORMAT", "mp3_44100_128");
}

export interface SynthesizeOptions {
  voiceId?: string;
  modelId?: string;
  outputFormat?: string;
  voiceSettings?: Partial<VoiceSettings>;
}

export async function synthesizeSpeech(
  text: string,
  options: SynthesizeOptions = {}
): Promise<ArrayBuffer> {
  const apiKey = envStr("ELEVENLABS_API_KEY", "");
  const voiceId = options.voiceId ?? envStr("ELEVENLABS_VOICE_ID", "");
  const modelId = options.modelId ?? getModelId();
  const outputFormat = options.outputFormat ?? getOutputFormat();
  const voiceSettings: VoiceSettings = { ...getVoiceSettings(), ...options.voiceSettings };

  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not configured");
  if (!voiceId) throw new Error("ELEVENLABS_VOICE_ID not configured");

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${encodeURIComponent(outputFormat)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: voiceSettings,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `ElevenLabs error: ${response.status}${detail ? ` — ${detail.slice(0, 200)}` : ""}`
    );
  }

  return response.arrayBuffer();
}
