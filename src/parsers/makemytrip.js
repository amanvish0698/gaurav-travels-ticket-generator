import { parseGenericTicket } from './generic.js';
import { normalizeText, normalizePnr, parseCurrency } from './normalizer.js';

export function parseMakeMyTrip(rawText) {
  const generic = parseGenericTicket(rawText);
  generic.sourceOta = 'makemytrip';
  const text = normalizeText(rawText);

  // MMT specific booking ID
  const mmtIdMatch = text.match(/\b(?:NF|NN|NC|NL)\d{12,18}\b/i) || text.match(/Booking\s*ID\s*[:–-]?\s*([A-Z0-9]+)/i);
  if (mmtIdMatch) {
    generic.bookingId = mmtIdMatch[1] || mmtIdMatch[0];
  }

  // MMT PNR pattern
  const mmtPnrMatch = text.match(/PNR\s*[:–-]?\s*([A-Z0-9]{5,8})/i);
  if (mmtPnrMatch) {
    generic.airlinePnr = normalizePnr(mmtPnrMatch[1]);
  }

  return generic;
}
