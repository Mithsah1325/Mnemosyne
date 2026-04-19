export function toBase64Audio(buffer) {
  return Buffer.isBuffer(buffer) ? buffer.toString("base64") : "";
}
