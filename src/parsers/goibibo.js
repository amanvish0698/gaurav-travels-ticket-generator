import { parseGenericTicket } from './generic.js';
import { normalizeText, normalizePnr } from './normalizer.js';

export function parseGoibibo(rawText) {
  const generic = parseGenericTicket(rawText);
  generic.sourceOta = 'goibibo';
  const text = normalizeText(rawText);

  // Goibibo Booking ID (e.g. GOFLT...)
  const goIdMatch = text.match(/\b(GO[A-Z0-9]+)\b/i) || text.match(/Booking\s*ID\s*[:–-]?\s*([A-Z0-9]+)/i);
  if (goIdMatch) {
    generic.bookingId = goIdMatch[1] || goIdMatch[0];
  }

  const pnrMatch = text.match(/PNR\s*[:–-]?\s*([A-Z0-9]{5,8})/i);
  if (pnrMatch) {
    generic.airlinePnr = normalizePnr(pnrMatch[1]);
  }

  return generic;
}
