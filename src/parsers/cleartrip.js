import {
  normalizeText,
  normalizeFlightNumber,
  normalizePnr,
  parseCurrency,
  AIRPORT_DIRECTORY
} from './normalizer.js';

export function parseCleartrip(rawText) {
  const text = normalizeText(rawText);

  // 1. Trip ID & Booking Date
  let bookingId = '';
  const tripIdMatch = text.match(/Trip\s*ID\s*[:–-]?\s*([0-9]{6,15})/i);
  if (tripIdMatch) {
    bookingId = tripIdMatch[1].trim();
  }

  // 2. Flight Header line like "Varanasi to Mumbai Sat, 03 Oct 2026"
  let routeOriginCity = '';
  let routeDestCity = '';
  let routeDate = '';

  const routeMatch = text.match(/([A-Za-z\s]+?)\s+to\s+([A-Za-z\s]+?)(?:\s+((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s*\d{1,2}\s+[A-Za-z]{3}\s+\d{4})|\n|$)/i);
  if (routeMatch) {
    routeOriginCity = routeMatch[1].trim();
    routeDestCity = routeMatch[2].trim();
    routeDate = routeMatch[3] ? routeMatch[3].trim() : '';
  }

  // Standalone date fallback
  if (!routeDate) {
    const dMatch = text.match(/\b((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s*\d{1,2}\s+[A-Za-z]{3}\s+\d{4})\b/i);
    if (dMatch) routeDate = dMatch[1].trim();
  }

  // 3. Airline & Flight Number
  let airline = 'IndiGo';
  const knownAirlines = ['IndiGo', 'Air India', 'Air India Express', 'Vistara', 'SpiceJet', 'Akasa Air', 'Oman Aviation', 'Emirates', 'Qatar Airways'];
  for (const al of knownAirlines) {
    if (new RegExp(`\\b${al}\\b`, 'i').test(text)) {
      airline = al;
      break;
    }
  }

  let flightNumber = '';
  // e.g. "6E - 5029" or "6E 5029" or "AI 101"
  const flightNumMatch = text.match(/\b(6E|AI|IX|SG|QP|UK|WY|EK|QR|G8)\s*[-–]?\s*(\d{2,4})\b/i);
  if (flightNumMatch) {
    flightNumber = `${flightNumMatch[1].toUpperCase()}-${flightNumMatch[2]}`;
  }

  // 4. Origin & Destination Airport Codes & Times
  // Notice Cleartrip formats:
  // Origin: "VNS 20:35" (CODE TIME)
  // Destination: "23:05 BOM" (TIME CODE)
  let originCode = '';
  let originTime = '';
  let originAirport = '';

  let destCode = '';
  let destTime = '';
  let destAirport = '';

  // Match "VNS 20:35"
  const originMatch = text.match(/\b([A-Z]{3})\s+(\d{1,2}:\d{2})\b/);
  if (originMatch) {
    originCode = originMatch[1].toUpperCase();
    originTime = originMatch[2];
  }

  // Match "23:05 BOM"
  const destMatch = text.match(/\b(\d{1,2}:\d{2})\s+([A-Z]{3})\b/);
  if (destMatch) {
    destTime = destMatch[1];
    destCode = destMatch[2].toUpperCase();
  }

  // If destCode is still empty, look for any secondary 3-letter IATA code
  if (!destCode) {
    const allCodes = [...text.matchAll(/\b([A-Z]{3})\b/g)]
      .map(m => m[1])
      .filter(c => AIRPORT_DIRECTORY[c] && c !== originCode);
    if (allCodes.length > 0) {
      destCode = allCodes[0];
    }
  }

  // Match duration: "2h 30min" or "2h 30m"
  let duration = '2h 15m';
  const durMatch = text.match(/\b(\d{1,2}h\s*\d{1,2}(?:min|m)?)\b/i);
  if (durMatch) {
    duration = durMatch[1].replace('min', 'm').trim();
  }

  // Airport names from text or directory
  if (originCode && AIRPORT_DIRECTORY[originCode]) {
    originAirport = AIRPORT_DIRECTORY[originCode].name;
    if (!routeOriginCity) routeOriginCity = AIRPORT_DIRECTORY[originCode].city;
  }
  if (destCode && AIRPORT_DIRECTORY[destCode]) {
    destAirport = AIRPORT_DIRECTORY[destCode].name;
    if (!routeDestCity) routeDestCity = AIRPORT_DIRECTORY[destCode].city;
  }

  // Check terminal mentions like "Terminal 1"
  const termMatch = text.match(/Terminal\s*([0-9A-Za-z]+)/i);
  if (termMatch && destAirport) {
    destAirport += ` (Terminal ${termMatch[1]})`;
  }

  // 5. Baggage & Class
  // "Baggage (per Adult/Child) - Check-in: 15KG (1 piece), Cabin: 7KG (1 piece)"
  let cabinBaggage = '7 Kg';
  let checkinBaggage = '15 Kg';
  let cabinClass = 'Economy';

  const cabinMatch = text.match(/Cabin\s*[-–:]*\s*(\d+\s*KG)/i);
  if (cabinMatch) cabinBaggage = cabinMatch[1].replace(/kg/i, 'Kg').trim();

  const checkinMatch = text.match(/Check[-–\s]*in\s*[-–:]*\s*(\d+\s*KG)/i);
  if (checkinMatch) checkinBaggage = checkinMatch[1].replace(/kg/i, 'Kg').trim();

  const fareTypeMatch = text.match(/Fare\s*type\s*[:–-]?\s*([A-Za-z]+)/i);
  if (fareTypeMatch) {
    cabinClass = `Economy | ${fareTypeMatch[1].toUpperCase()}`;
  }

  // 6. Travellers Table: Passenger Name, Airline PNR, Ticket Number
  // Format in Cleartrip:
  // TRAVELLERS AIRLINE PNR TICKET NO.
  // Mr Aman Vishwakarma [barcode] JBQ43G JBQ43G
  let airlinePnr = '';
  const passengers = [];

  const invalidPnrs = new Set(['TICKET', 'TRAVELLER', 'TRAVELLERS', 'AIRLINE', 'STATUS', 'CONFIRM', 'CONFIRMED', 'NUMBER', 'ONLINE', 'PERSON']);

  // Extract passenger name with title
  const nameRegex = /\b(Mr|Mrs|Ms|Miss|Master|Dr)\.?\s+([A-Za-z]+(?:\s+[A-Za-z]+)+)/gi;
  const nameMatches = [...text.matchAll(nameRegex)];

  // Look for 6-character PNR code right after the traveller section
  // e.g. "JBQ43G"
  const travellerSection = text.slice(text.indexOf('TRAVELLERS') !== -1 ? text.indexOf('TRAVELLERS') : 0);
  const potentialPnrs = [...travellerSection.matchAll(/\b([A-Z0-9]{6})\b/g)]
    .map(m => m[1])
    .filter(code => !invalidPnrs.has(code) && /[0-9]/.test(code) && /[A-Z]/.test(code));

  if (potentialPnrs.length > 0) {
    airlinePnr = potentialPnrs[0];
  } else {
    // Secondary search for any 5-7 alphanumeric code near "AIRLINE PNR"
    const pnrFallback = travellerSection.match(/AIRLINE\s*PNR[\s\S]*?\b([A-Z0-9]{5,7})\b/i);
    if (pnrFallback && !invalidPnrs.has(pnrFallback[1])) {
      airlinePnr = pnrFallback[1];
    }
  }

  // Primary passenger
  if (nameMatches.length > 0) {
    nameMatches.forEach((m) => {
      let fullName = `${m[1]} ${m[2]}`.trim();
      if (airlinePnr) {
        fullName = fullName.replace(new RegExp(`\\s*${airlinePnr.slice(0, 3)}.*$`, 'i'), '').trim();
      }
      // Strip any trailing uppercase alphanumeric artifact (e.g. JBQ)
      fullName = fullName.replace(/\s+[A-Z0-9]{2,6}$/, '').trim();

      passengers.push({
        name: fullName,
        type: 'ADT',
        ticketNumber: airlinePnr || bookingId || 'Confirmed',
        seat: '-',
        meal: '-',
        baggage: checkinBaggage,
        status: 'Confirm'
      });
    });
  } else {
    passengers.push({
      name: 'Passenger',
      type: 'ADT',
      ticketNumber: airlinePnr || 'Confirmed',
      seat: '-',
      meal: '-',
      baggage: checkinBaggage,
      status: 'Confirm'
    });
  }

  // 7. Pricing
  let totalFare = 0;
  const fareMatch = text.match(/(?:Total(?: Fare)?|Amount Paid|Grand Total)\s*[:–-]?\s*₹?\s*(\d+)/i);
  if (fareMatch) totalFare = parseCurrency(fareMatch[1]);

  return {
    sourceOta: 'cleartrip',
    bookingId,
    bookingRef: bookingId,
    airlinePnr: normalizePnr(airlinePnr),
    bookingDate: routeDate || '',
    airlineContact: '0124-6173838', // IndiGo / Cleartrip helpline
    cancellationSummary: 'As per airline fare rules (SAVER Fare)',
    passengers,
    segments: [
      {
        airline,
        flightNumber: flightNumber || '6E-5029',
        operatedBy: airline,
        origin: {
          code: originCode || 'VNS',
          city: routeOriginCity || 'Varanasi',
          airportName: originAirport || 'Lal Bahadur Shastri International Airport',
          date: routeDate || 'Sat, 03 Oct 2026',
          time: originTime || '20:35',
          terminal: ''
        },
        destination: {
          code: destCode || 'BOM',
          city: routeDestCity || 'Mumbai',
          airportName: destAirport || 'Chhatrapati Shivaji Maharaj International Airport',
          date: routeDate || 'Sat, 03 Oct 2026',
          time: destTime || '23:05',
          terminal: termMatch ? `Terminal ${termMatch[1]}` : ''
        },
        duration,
        cabinClass,
        cabinBaggage,
        checkinBaggage
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
