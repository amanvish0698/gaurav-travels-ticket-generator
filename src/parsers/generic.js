import {
  normalizeText,
  normalizeFlightNumber,
  normalizePnr,
  parseCurrency,
  AIRPORT_DIRECTORY
} from './normalizer.js';

export function parseGenericTicket(rawText) {
  const text = normalizeText(rawText);

  // 1. PNR extraction (strictly exclude table headers like TICKET, TRAVELLER, AIRLINE)
  let airlinePnr = '';
  const invalidWords = new Set(['TICKET', 'TRAVELLER', 'TRAVELLERS', 'AIRLINE', 'STATUS', 'CONFIRM', 'CONFIRMED', 'NUMBER', 'FLIGHT', 'ONLINE', 'PERSON', 'TRAVEL']);
  
  const pnrCandidates = [...text.matchAll(/\b(?:PNR|Airline PNR|Booking Ref(?:erence)?)\s*[:–-]?\s*([A-Z0-9]{5,8})\b/gi)]
    .map(m => m[1].toUpperCase())
    .filter(val => !invalidWords.has(val));

  if (pnrCandidates.length > 0) {
    airlinePnr = normalizePnr(pnrCandidates[0]);
  } else {
    // Look for 6-character alphanumeric uppercase code containing both numbers and letters
    const looseMatches = [...text.matchAll(/\b([A-Z0-9]{6})\b/g)]
      .map(m => m[1].toUpperCase())
      .filter(val => !invalidWords.has(val) && /[0-9]/.test(val) && /[A-Z]/.test(val));
    if (looseMatches.length > 0) {
      airlinePnr = looseMatches[0];
    }
  }

  // 2. Booking ID
  let bookingId = '';
  const bookingMatch = text.match(/\b(?:Booking\s*ID|Trip\s*ID|Order\s*ID|Ref\s*#?)\s*[:–-]?\s*([A-Z0-9_-]+)\b/i);
  if (bookingMatch) {
    bookingId = bookingMatch[1];
  }

  // 3. Flight & Airline
  let airline = '';
  let flightNumber = '';
  const flightMatch = text.match(/\b(6E|AI|IX|SG|QP|UK|WY|EK|QR|G8|[A-Z0-9]{2})\s*[-–]?\s*(\d{2,4})\b/);
  if (flightMatch) {
    flightNumber = normalizeFlightNumber(`${flightMatch[1]}-${flightMatch[2]}`);
  }

  // Common airlines in India & Global
  const knownAirlines = ['IndiGo', 'Air India', 'Vistara', 'SpiceJet', 'Akasa Air', 'Air India Express', 'Oman Aviation', 'Oman Air', 'Emirates', 'Qatar Airways', 'Etihad Airways', 'FlyDubai', 'Gulf Air', 'Singapore Airlines', 'Thai Airways', 'Lufthansa', 'British Airways'];
  for (const al of knownAirlines) {
    if (new RegExp(`\\b${al}\\b`, 'i').test(text)) {
      airline = al;
      break;
    }
  }

  // 4. Origin & Destination
  let originCode = '';
  let originTime = '';
  let destCode = '';
  let destTime = '';

  // Match either "VNS 20:35" (CODE TIME) or "20:35 VNS" / "23:05 BOM" (TIME CODE)
  const codeAndTimePairs = [];
  const regexCodeTime = /\b([A-Z]{3})\s+(\d{1,2}:\d{2})\b/g;
  const regexTimeCode = /\b(\d{1,2}:\d{2})\s+([A-Z]{3})\b/g;

  let match;
  while ((match = regexCodeTime.exec(text)) !== null) {
    if (AIRPORT_DIRECTORY[match[1].toUpperCase()]) {
      codeAndTimePairs.push({ code: match[1].toUpperCase(), time: match[2], index: match.index });
    }
  }
  while ((match = regexTimeCode.exec(text)) !== null) {
    if (AIRPORT_DIRECTORY[match[2].toUpperCase()]) {
      codeAndTimePairs.push({ code: match[2].toUpperCase(), time: match[1], index: match.index });
    }
  }

  // Sort by appearance in text
  codeAndTimePairs.sort((a, b) => a.index - b.index);

  if (codeAndTimePairs.length >= 2) {
    originCode = codeAndTimePairs[0].code;
    originTime = codeAndTimePairs[0].time;
    destCode = codeAndTimePairs[1].code;
    destTime = codeAndTimePairs[1].time;
  } else if (codeAndTimePairs.length === 1) {
    originCode = codeAndTimePairs[0].code;
    originTime = codeAndTimePairs[0].time;
  }

  // Date
  let flightDate = '';
  const dateMatch = text.match(/\b((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)?\s*\d{1,2}\s+[A-Za-z]{3}\s+\d{4})\b/);
  if (dateMatch) {
    flightDate = dateMatch[1].trim();
  }

  // Duration
  let duration = '';
  const durMatch = text.match(/\b(\d{1,2}h\s*\d{1,2}m)\b/i);
  if (durMatch) duration = durMatch[1];

  // 5. Passengers
  const passengers = [];
  const passengerNameRegex = /\b(Mr|Mrs|Ms|Miss|Master|Dr)\.?\s+([A-Za-z]+(?:\s+[A-Za-z]+)+)/gi;
  const nameMatches = [...text.matchAll(passengerNameRegex)];

  const ticketMatches = [...text.matchAll(/\b(\d{10,14}(?:\/\d+)*)\b/g)];

  if (nameMatches.length > 0) {
    nameMatches.forEach((m, idx) => {
      let fullName = `${m[1]} ${m[2]}`.trim();
      if (airlinePnr && fullName.endsWith(airlinePnr)) {
        fullName = fullName.replace(new RegExp(`\\s*${airlinePnr}$`), '').trim();
      }
      passengers.push({
        name: fullName,
        type: 'ADT',
        ticketNumber: ticketMatches[idx] ? ticketMatches[idx][1] : '',
        seat: '-',
        meal: '-',
        baggage: '15 Kg',
        status: 'Confirm'
      });
    });
  } else {
    passengers.push({
      name: '',
      type: 'ADT',
      ticketNumber: '',
      seat: '-',
      meal: '-',
      baggage: '15 Kg',
      status: 'Confirm'
    });
  }

  // 6. Total fare
  let totalFare = 0;
  const fareMatch = text.match(/(?:Total(?: Fare)?|Grand Total|Amount Paid)\s*[:–-]?\s*₹?\s*(\d+)/i);
  if (fareMatch) {
    totalFare = parseCurrency(fareMatch[1]);
  }

  return {
    sourceOta: 'generic',
    bookingId: bookingId || 'N/A',
    airlinePnr,
    bookingDate: flightDate || '',
    airlineContact: '1800-XXX-XXXX',
    cancellationSummary: 'As per operating airline terms & conditions',
    passengers,
    segments: [
      {
        airline: airline || 'Airline',
        flightNumber: flightNumber || 'FL-101',
        operatedBy: airline || 'Airline',
        origin: {
          code: originCode || 'DEL',
          city: (AIRPORT_DIRECTORY[originCode] && AIRPORT_DIRECTORY[originCode].city) || 'Origin City',
          airportName: (AIRPORT_DIRECTORY[originCode] && AIRPORT_DIRECTORY[originCode].name) || 'Airport',
          date: flightDate || 'TBD',
          time: originTime || '00:00',
          terminal: ''
        },
        destination: {
          code: destCode || 'BOM',
          city: (AIRPORT_DIRECTORY[destCode] && AIRPORT_DIRECTORY[destCode].city) || 'Destination City',
          airportName: (AIRPORT_DIRECTORY[destCode] && AIRPORT_DIRECTORY[destCode].name) || 'Airport',
          date: flightDate || 'TBD',
          time: destTime || '00:00',
          terminal: ''
        },
        duration: duration || '2h 15m',
        cabinClass: 'Economy',
        cabinBaggage: '7 Kg',
        checkinBaggage: '15 Kg'
      }
    ],
    pricing: {
      otaBaseFare: totalFare,
      otaTaxes: 0,
      otaDiscount: 0,
      otaTotal: totalFare,
      serviceFee: 500,
      customerTotal: totalFare + 500,
      showFeeBreakdown: false
    },
    validation: {
      isValid: Boolean(airlinePnr && passengers[0]?.name),
      warnings: []
    }
  };
}
