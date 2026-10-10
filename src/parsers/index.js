import { detectOta } from './detector.js';
import { parseEaseMyTrip } from './easemytrip.js';
import { parseMakeMyTrip } from './makemytrip.js';
import { parseCleartrip } from './cleartrip.js';
import { parseGoibibo } from './goibibo.js';
import { parseGenericTicket } from './generic.js';

export function parseTicketText(rawText) {
  const detection = detectOta(rawText);
  let parsed;

  switch (detection.ota) {
    case 'easemytrip':
      parsed = parseEaseMyTrip(rawText);
      break;
    case 'makemytrip':
      parsed = parseMakeMyTrip(rawText);
      break;
    case 'cleartrip':
      parsed = parseCleartrip(rawText);
      break;
    case 'goibibo':
      parsed = parseGoibibo(rawText);
      break;
    default:
      parsed = parseGenericTicket(rawText);
      break;
  }

  // Validate critical fields
  const warnings = [];
  if (!parsed.airlinePnr) warnings.push('Airline PNR could not be detected');
  if (!parsed.passengers[0]?.name) warnings.push('Primary passenger name is missing');
  if (!parsed.segments[0]?.origin?.time) warnings.push('Departure time is missing');
  if (!parsed.segments[0]?.destination?.time) warnings.push('Arrival time is missing');

  parsed.validation = {
    isValid: warnings.length === 0,
    warnings,
    detectedOta: detection
  };

  return parsed;
}
