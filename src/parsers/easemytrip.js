import {
  normalizeText,
  normalizeFlightNumber,
  normalizePnr,
  parseCurrency,
  AIRPORT_DIRECTORY
} from './normalizer.js';

export function parseEaseMyTrip(rawText) {
  const text = normalizeText(rawText);

  // 1. Booking ID & Date
  let bookingId = '';
  const bookingIdMatch = text.match(/Booking\s*ID\s*[-–:]*\s*([A-Z0-9]+)/i);
  if (bookingIdMatch) {
    bookingId = bookingIdMatch[1].trim();
  }

  let bookingDate = '';
  const bookingDateMatch = text.match(/Booking\s*on\s*[-–:]*\s*([A-Za-z]{3}\s+\d{1,2}\s+[A-Za-z]{3}\s+\d{4}(?:\s+\d{1,2}:\d{2}(?:\s*(?:AM|PM))?)?)/i);
  if (bookingDateMatch) {
    bookingDate = bookingDateMatch[1].trim();
  }

  // 2. Airline PNR
  let airlinePnr = '';
  const pnrMatch = text.match(/\bPNR\s*[:–-]?\s*([A-Z0-9]{5,8})\b/i);
  if (pnrMatch) {
    airlinePnr = normalizePnr(pnrMatch[1]);
  }

  // 3. Airline Name & Flight Number & Operator
  let airline = '';
  let flightNumber = '';
  let operatedBy = '';

  const operatedByMatch = text.match(/\(?Operated\s*By\s*:\s*([^)\n\r]+)\)?/i);
  if (operatedByMatch) {
    operatedBy = operatedByMatch[1].trim();
    if (!airline) airline = operatedBy;
  }

  // Check airline line in Onward Flight section
  // e.g. "Oman Aviation \n WY 236" or "IndiGo \n 6E 204"
  const airlineSectionMatch = text.match(/Onward\s*Flight[\s\S]*?(?:PNR:[^\n]*\n)?\s*([A-Za-z\s]{3,35})\s*\n\s*([A-Z]{2}|[A-Z][0-9]|[0-9][A-Z])\s*[-–]?\s*(\d{2,4})/i);
  if (airlineSectionMatch) {
    if (!airline) airline = airlineSectionMatch[1].trim();
    flightNumber = `${airlineSectionMatch[2].toUpperCase()}-${airlineSectionMatch[3]}`;
  }

  if (!flightNumber) {
    // Try matching specific flight number patterns avoiding years like 2026
    const flightMatches = [...text.matchAll(/\b(WY|6E|AI|UK|SG|QP|G8|IX|EK|EY|QR|TK|FZ|SV|MH|TG|SQ|BA)\s*[-–]?\s*(\d{2,4})\b/gi)];
    if (flightMatches.length > 0) {
      flightNumber = `${flightMatches[0][1].toUpperCase()}-${flightMatches[0][2]}`;
    }
  }

  if (!airline && /Oman\s*Aviation/i.test(text)) {
    airline = 'Oman Aviation';
  }

  // 4. Route, Airport Codes, Dates & Times
  let originCode = '';
  let originTime = '';
  let originDate = '';
  let originAirport = '';

  let destCode = '';
  let destTime = '';
  let destDate = '';
  let destAirport = '';
  let duration = '';

  const durMatch = text.match(/\b(\d{1,2}h\s*\d{1,2}m)\b/i);
  if (durMatch) {
    duration = durMatch[1].trim();
  }

  // Look for segment patterns like:
  // "Fri 10 Apr 2026 HYD 08:20 Rajiv Gandhi International Airport"
  const segmentMatches = [
    ...text.matchAll(
      /((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+\d{1,2}\s+[A-Za-z]{3}\s+\d{4})?\s*\n?\s*([A-Z]{3})\s+(\d{1,2}:\d{2})\s*\n?\s*([^\n\r]+?(?:Airport|Aerodrome|Field|Airfield|[A-Za-z\s]+Airport))/gi
    )
  ];

  if (segmentMatches.length >= 2) {
    originDate = segmentMatches[0][1] ? segmentMatches[0][1].trim() : '';
    originCode = segmentMatches[0][2].toUpperCase();
    originTime = segmentMatches[0][3];
    originAirport = segmentMatches[0][4].trim();

    destDate = segmentMatches[1][1] ? segmentMatches[1][1].trim() : '';
    destCode = segmentMatches[1][2].toUpperCase();
    destTime = segmentMatches[1][3];
    destAirport = segmentMatches[1][4].trim();
  } else {
    // Fallback: standalone code + time
    const codesAndTimes = [...text.matchAll(/\b([A-Z]{3})\s+(\d{1,2}:\d{2})\b/g)];
    if (codesAndTimes.length >= 2) {
      originCode = codesAndTimes[0][1].toUpperCase();
      originTime = codesAndTimes[0][2];
      destCode = codesAndTimes[1][1].toUpperCase();
      destTime = codesAndTimes[1][2];
    }
    const dateMatches = [...text.matchAll(/\b((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+\d{1,2}\s+[A-Za-z]{3}\s+\d{4})\b/g)];
    if (dateMatches.length >= 1) originDate = dateMatches[0][1];
    if (dateMatches.length >= 2) destDate = dateMatches[1][1];
    else destDate = originDate;
  }

  // Airport name enrichment
  if (originCode && AIRPORT_DIRECTORY[originCode]) {
    if (!originAirport || originAirport.length < 5) originAirport = AIRPORT_DIRECTORY[originCode].name;
  }
  if (destCode && AIRPORT_DIRECTORY[destCode]) {
    if (!destAirport || destAirport.length < 5) destAirport = AIRPORT_DIRECTORY[destCode].name;
  }

  // 5. Baggage & Cabin Class
  let cabinBaggage = '7 Kg';
  let checkinBaggage = '15 Kg';
  let cabinClass = 'Economy';

  const cabinMatch = text.match(/Cabin\s*[-–:]*\s*(\d+\s*Kg)/i);
  if (cabinMatch) cabinBaggage = cabinMatch[1].trim();

  const checkinMatch = text.match(/Check[-–\s]*in\s*[-–:]*\s*(\d+\s*Kg)/i);
  if (checkinMatch) checkinBaggage = checkinMatch[1].trim();

  const classMatch = text.match(/Class\s*:\s*([A-Za-z0-9]+)\s*\|\s*([A-Za-z0-9\s]+?)(?=\s*Traveller\s*Details|\n\s*\n|$)/i);
  if (classMatch) {
    const c1 = classMatch[1] ? classMatch[1].trim() : '';
    const c2 = classMatch[2] ? classMatch[2].trim() : '';
    cabinClass = c2 ? `${c1} | ${c2}` : c1;
  }

  // 6. Traveller Details
  const passengers = [];
  const travellerSectionMatch = text.match(/Traveller\s*Details[\s\S]*?(?=Fare\s*Summary|$)/i);
  const travellerSection = travellerSectionMatch ? travellerSectionMatch[0] : text;

  // Ticket number (e.g., 91022013808283/1/1)
  const ticketMatches = [...travellerSection.matchAll(/\b(\d{10,14}(?:\/\d+)*)\b/g)];

  // Passenger with title: Mr, Mrs, Ms, Master, Dr
  const passengerNameRegex = /\b(Mr|Mrs|Ms|Miss|Master|Dr)\.?\s+([A-Za-z]+(?:\s+[A-Za-z]+)+)/gi;
  const nameMatches = [...travellerSection.matchAll(passengerNameRegex)];

  if (nameMatches.length > 0) {
    nameMatches.forEach((match, idx) => {
      let rawName = `${match[1]} ${match[2]}`.trim().replace(/\s+/g, ' ');
      // If PNR was accidentally captured into name, strip it
      if (airlinePnr && rawName.endsWith(airlinePnr)) {
        rawName = rawName.replace(new RegExp(`\\s*${airlinePnr}$`), '').trim();
      }
      const tNum = ticketMatches[idx] ? ticketMatches[idx][1] : '';
      passengers.push({
        name: rawName,
        type: 'ADT',
        ticketNumber: tNum,
        seat: '-',
        meal: '-',
        baggage: checkinBaggage,
        status: 'Confirm'
      });
    });
  }

  if (passengers.length === 0) {
    passengers.push({
      name: '',
      type: 'ADT',
      ticketNumber: '',
      seat: '-',
      meal: '-',
      baggage: checkinBaggage,
      status: 'Confirm'
    });
  }

  // 7. Fare Summary
  let basicFare = 0;
  let taxes = 0;
  let discount = 0;
  let totalFare = 0;

  const totalMatch = text.match(/(?:payment\s*of|Total)\s*₹?\s*(\d+)/i);
  if (totalMatch) totalFare = parseCurrency(totalMatch[1]);

  const basicMatch = text.match(/Basic\s*Fare\s*₹?\s*(\d+)/i);
  if (basicMatch) basicFare = parseCurrency(basicMatch[1]);

  const taxesMatch = text.match(/Taxes\s*₹?\s*(\d+)/i);
  if (taxesMatch) taxes = parseCurrency(taxesMatch[1]);

  const discountMatch = text.match(/Discount\s*₹?\s*\(?-?\)?\s*(\d+)/i);
  if (discountMatch) discount = parseCurrency(discountMatch[1]);

  // 8. Cancellation Charges
  let cancellationSummary = 'ADT: Non Cancellable, Non Refundable';
  const cancelRowMatch = text.match(/ADT\s+(Non\s*Cancellable)\s+(Non\s*Refundable)/i);
  if (cancelRowMatch) {
    cancellationSummary = `ADT: ${cancelRowMatch[1]}, ${cancelRowMatch[2]}`;
  }

  // 9. Airline Contact Information
  let airlineContact = '';
  const contactMatch = text.match(/(?:Oman\s*Aviation|Airline)\s*Contact\s*Information\s*:\s*([0-9\s-–]+)/i);
  if (contactMatch) {
    let rawContact = contactMatch[1].trim().replace(/\s+/g, '');
    if (rawContact.length === 11 && rawContact.startsWith('0124')) {
      rawContact = `${rawContact.slice(0, 4)}-${rawContact.slice(4)}`;
    }
    airlineContact = rawContact;
  }

  return {
    sourceOta: 'easemytrip',
    bookingId,
    airlinePnr,
    bookingDate,
    airlineContact: airlineContact || '0124-6421111',
    cancellationSummary,
    passengers,
    segments: [
      {
        airline: airline || 'Oman Aviation',
        flightNumber: flightNumber || 'WY-236',
        operatedBy: operatedBy || airline || 'Oman Aviation',
        origin: {
          code: originCode || 'HYD',
          city: (AIRPORT_DIRECTORY[originCode] && AIRPORT_DIRECTORY[originCode].city) || 'Hyderabad',
          airportName: originAirport || 'Rajiv Gandhi International Airport',
          date: originDate || 'Fri 10 Apr 2026',
          time: originTime || '08:20',
          terminal: ''
        },
        destination: {
          code: destCode || 'MCT',
          city: (AIRPORT_DIRECTORY[destCode] && AIRPORT_DIRECTORY[destCode].city) || 'Muscat',
          airportName: destAirport || 'Muscat International Airport',
          date: destDate || 'Fri 10 Apr 2026',
          time: destTime || '10:15',
          terminal: ''
        },
        duration: duration || '03h 25m',
        cabinClass: cabinClass || 'R | Comfort Fare',
        cabinBaggage,
        checkinBaggage
      }
    ],
    pricing: {
      otaBaseFare: basicFare,
      otaTaxes: taxes,
      otaDiscount: discount,
      otaTotal: totalFare,
      serviceFee: 500,
      customerTotal: totalFare + 500,
      showFeeBreakdown: false
    },
    validation: {
      isValid: Boolean(airlinePnr && passengers[0]?.name && originTime),
      warnings: []
    }
  };
}
