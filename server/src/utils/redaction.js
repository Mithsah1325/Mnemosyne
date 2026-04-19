const EMAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE = /\b(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3}\)?[\s-]?)\d{3}[\s-]?\d{4}\b/g;
const SSN = /\b\d{3}-\d{2}-\d{4}\b/g;

export function redactSensitiveText(input) {
  return String(input).replace(EMAIL, "[REDACTED_EMAIL]").replace(PHONE, "[REDACTED_PHONE]").replace(SSN, "[REDACTED_SSN]");
}
