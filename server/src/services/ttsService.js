export async function generateTTS(text) {
  // Placeholder: replace with provider call (Google TTS, ElevenLabs, Azure, etc.).
  // Returning UTF-8 bytes lets the flow work end-to-end in development.
  return Buffer.from(text, "utf-8");
}
