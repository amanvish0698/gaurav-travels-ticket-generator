import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { generateBarcodePngBytes } from '../utils/barcode.js';

/**
 * Helper to wrap text into multiple lines given font, size, and max width
 */
function wrapText(text, font, fontSize, maxWidth) {
  if (!text) return [];
  // Normalize whitespace
  const clean = text.replace(/[\r\n]+/g, ' ').trim();
  const words = clean.split(/\s+/);
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Generate branded A4 PDF ticket using pdf-lib with PDF417 Barcode and complete Terms & Conditions
 */
export async function generateTicketPdf(ticketData, settings, logoBytes = null) {
  const doc = await PDFDocument.create();
  
  // Set PDF Metadata
  doc.setTitle(`Flight Ticket - PNR ${ticketData.airlinePnr || 'CONFIRMED'}`);
  doc.setAuthor(settings.companyName || 'Gaurav Tour and Travels');
  doc.setSubject('Flight E-Ticket Booking Confirmation');
  doc.setCreationDate(new Date());

  // Load standard fonts
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  // Brand Palette
  const colorRed = rgb(0.89, 0.12, 0.14);       // #E31E24
  const colorOrange = rgb(0.97, 0.58, 0.11);    // #F7941D
  const colorAmber = rgb(0.99, 0.73, 0.07);     // #FDB913
  const colorText = rgb(0.24, 0.24, 0.24);      // #3C3C3C
  const colorMuted = rgb(0.42, 0.45, 0.50);     // #6B7280
  const colorLightBg = rgb(0.97, 0.98, 0.99);   // #F8FAFC
  const colorBorder = rgb(0.89, 0.91, 0.93);    // #E2E8F0
  const colorWhite = rgb(1, 1, 1);
  const colorSuccess = rgb(0.06, 0.72, 0.50);

  // Embed Agency Logo if available
  let logoEmbedded = null;
  if (logoBytes) {
    try {
      logoEmbedded = await doc.embedPng(logoBytes);
    } catch (err) {
      try {
        logoEmbedded = await doc.embedJpg(logoBytes);
      } catch (e2) {
        console.warn('Could not embed logo image:', e2);
      }
    }
  }

  // Pre-generate Barcode PNGs for all passengers
  const passengerBarcodes = [];
  const passengers = ticketData.passengers || [];
  for (const p of passengers) {
    try {
      const barcodeData = `${ticketData.airlinePnr || 'PNR'}/${p.name || 'PAX'} ${p.ticketNumber || 'TKT'}`;
      const barcodeBytes = await generateBarcodePngBytes(barcodeData);
      const embeddedBarcode = await doc.embedPng(barcodeBytes);
      passengerBarcodes.push(embeddedBarcode);
    } catch (err) {
      console.warn('Failed to generate passenger barcode:', err);
      passengerBarcodes.push(null);
    }
  }

  // =========================================================================
  // PAGE 1: FLIGHT ITINERARY, PASSENGER DETAILS WITH BARCODES & PRICING
  // =========================================================================
  const page1 = doc.addPage([595.28, 841.89]);
  const { width, height } = page1.getSize();
  const marginX = 36;
  const contentWidth = width - marginX * 2;
  const rightX = width - marginX;
  let cursorY = height - 34;

  // 1. Header & Agency Contacts
  const headerHeight = 52;
  if (logoEmbedded) {
    const logoDims = logoEmbedded.scaleToFit(140, headerHeight);
    page1.drawImage(logoEmbedded, {
      x: marginX,
      y: cursorY - logoDims.height,
      width: logoDims.width,
      height: logoDims.height
    });
  } else {
    page1.drawText(settings.companyName || 'Gaurav Tour & Travels', {
      x: marginX,
      y: cursorY - 18,
      size: 16,
      font: fontBold,
      color: colorRed
    });
    page1.drawText(settings.tagline || 'Your Trusted Journey Partner', {
      x: marginX,
      y: cursorY - 32,
      size: 8,
      font: fontRegular,
      color: colorOrange
    });
  }

  const cPhone = `Tel: ${settings.phone1 || ''} | WhatsApp: ${settings.whatsapp || ''}`;
  const cEmail = `Email: ${settings.email || ''}`;
  const cWeb = `Web: ${settings.website || ''} | GSTIN: ${settings.gstin || ''}`;

  page1.drawText(settings.companyName.toUpperCase(), {
    x: rightX - fontBold.widthOfTextAtSize(settings.companyName.toUpperCase(), 10),
    y: cursorY - 10,
    size: 10,
    font: fontBold,
    color: colorText
  });
  page1.drawText(cPhone, {
    x: rightX - fontRegular.widthOfTextAtSize(cPhone, 7.5),
    y: cursorY - 22,
    size: 7.5,
    font: fontRegular,
    color: colorMuted
  });
  page1.drawText(cEmail, {
    x: rightX - fontRegular.widthOfTextAtSize(cEmail, 7.5),
    y: cursorY - 32,
    size: 7.5,
    font: fontRegular,
    color: colorMuted
  });
  page1.drawText(cWeb, {
    x: rightX - fontRegular.widthOfTextAtSize(cWeb, 7.5),
    y: cursorY - 42,
    size: 7.5,
    font: fontRegular,
    color: colorMuted
  });

  cursorY -= (headerHeight + 8);

  // Decorative brand bar
  page1.drawRectangle({
    x: marginX,
    y: cursorY,
    width: contentWidth,
    height: 3,
    color: colorOrange
  });
  cursorY -= 12;

  // 2. PNR & Booking Banner
  const pnrBoxHeight = 40;
  page1.drawRectangle({
    x: marginX,
    y: cursorY - pnrBoxHeight,
    width: contentWidth,
    height: pnrBoxHeight,
    color: colorLightBg,
    borderColor: colorBorder,
    borderWidth: 1
  });

  page1.drawText('AIRLINE PNR', {
    x: marginX + 16,
    y: cursorY - 14,
    size: 7.5,
    font: fontBold,
    color: colorMuted
  });

  const pnrText = ticketData.airlinePnr || 'PENDING';
  page1.drawText(pnrText, {
    x: marginX + 16,
    y: cursorY - 32,
    size: 16,
    font: fontBold,
    color: colorRed
  });

  const bRefText = ticketData.bookingId ? `Booking Ref: ${ticketData.bookingId}` : '';
  const bDateText = ticketData.bookingDate ? `Date: ${ticketData.bookingDate}` : '';
  page1.drawText(bRefText, {
    x: marginX + 160,
    y: cursorY - 16,
    size: 8.5,
    font: fontRegular,
    color: colorText
  });
  page1.drawText(bDateText, {
    x: marginX + 160,
    y: cursorY - 30,
    size: 8,
    font: fontRegular,
    color: colorMuted
  });

  const statusX = rightX - 105;
  page1.drawRectangle({
    x: statusX,
    y: cursorY - 30,
    width: 90,
    height: 20,
    color: rgb(0.92, 0.98, 0.95),
    borderColor: colorSuccess,
    borderWidth: 1
  });
  page1.drawText('CONFIRMED', {
    x: statusX + 14,
    y: cursorY - 24,
    size: 8.5,
    font: fontBold,
    color: colorSuccess
  });

  cursorY -= (pnrBoxHeight + 12);

  // 3. Flight Segments
  const segments = ticketData.segments || [];
  for (let sIdx = 0; sIdx < segments.length; sIdx++) {
    const seg = segments[sIdx];
    const segBoxHeight = 94;

    page1.drawRectangle({
      x: marginX,
      y: cursorY - segBoxHeight,
      width: contentWidth,
      height: segBoxHeight,
      color: colorWhite,
      borderColor: colorOrange,
      borderWidth: 1.2
    });

    page1.drawRectangle({
      x: marginX,
      y: cursorY - 20,
      width: contentWidth,
      height: 20,
      color: rgb(0.99, 0.95, 0.92)
    });

    const flightHeader = `${seg.airline || 'Airline'} | Flight ${seg.flightNumber || 'TBD'} ${seg.operatedBy ? `(Operated by: ${seg.operatedBy})` : ''}`;
    page1.drawText(flightHeader.slice(0, 68), {
      x: marginX + 10,
      y: cursorY - 14,
      size: 8.5,
      font: fontBold,
      color: colorText
    });

    const flightType = sIdx === 0 ? 'ONWARD FLIGHT' : `FLIGHT LEG ${sIdx + 1}`;
    page1.drawText(flightType, {
      x: rightX - fontBold.widthOfTextAtSize(flightType, 8) - 10,
      y: cursorY - 14,
      size: 8,
      font: fontBold,
      color: colorRed
    });

    // Departure
    const originY = cursorY - 42;
    page1.drawText(seg.origin.code || 'ORG', {
      x: marginX + 12,
      y: originY,
      size: 19,
      font: fontBold,
      color: colorRed
    });
    page1.drawText(seg.origin.time || '00:00', {
      x: marginX + 62,
      y: originY + 2,
      size: 12,
      font: fontBold,
      color: colorText
    });
    page1.drawText(seg.origin.date || '', {
      x: marginX + 12,
      y: originY - 13,
      size: 7.5,
      font: fontBold,
      color: colorText
    });
    const originAirportName = `${seg.origin.city ? seg.origin.city + ' - ' : ''}${seg.origin.airportName || ''}`;
    page1.drawText(originAirportName.slice(0, 36), {
      x: marginX + 12,
      y: originY - 23,
      size: 7,
      font: fontRegular,
      color: colorMuted
    });

    // Middle Duration Line
    const midX = marginX + contentWidth / 2;
    page1.drawText(seg.duration || '', {
      x: midX - fontRegular.widthOfTextAtSize(seg.duration || '', 8) / 2,
      y: originY + 8,
      size: 8,
      font: fontBold,
      color: colorOrange
    });
    page1.drawLine({
      start: { x: midX - 45, y: originY - 2 },
      end: { x: midX + 45, y: originY - 2 },
      thickness: 1.2,
      color: colorOrange
    });
    page1.drawLine({
      start: { x: midX + 40, y: originY + 2 },
      end: { x: midX + 45, y: originY - 2 },
      thickness: 1.2,
      color: colorOrange
    });
    page1.drawLine({
      start: { x: midX + 40, y: originY - 6 },
      end: { x: midX + 45, y: originY - 2 },
      thickness: 1.2,
      color: colorOrange
    });

    // Destination
    const destRightAlign = rightX - 12;
    const destCodeWidth = fontBold.widthOfTextAtSize(seg.destination.code || 'DST', 19);
    const destTimeWidth = fontBold.widthOfTextAtSize(seg.destination.time || '00:00', 12);

    page1.drawText(seg.destination.time || '00:00', {
      x: destRightAlign - destCodeWidth - destTimeWidth - 8,
      y: originY + 2,
      size: 12,
      font: fontBold,
      color: colorText
    });
    page1.drawText(seg.destination.code || 'DST', {
      x: destRightAlign - destCodeWidth,
      y: originY,
      size: 19,
      font: fontBold,
      color: colorRed
    });
    const destDateText = seg.destination.date || '';
    page1.drawText(destDateText, {
      x: destRightAlign - fontBold.widthOfTextAtSize(destDateText, 7.5),
      y: originY - 13,
      size: 7.5,
      font: fontBold,
      color: colorText
    });
    const destAirportName = `${seg.destination.city ? seg.destination.city + ' - ' : ''}${seg.destination.airportName || ''}`;
    page1.drawText(destAirportName.slice(0, 36), {
      x: destRightAlign - fontRegular.widthOfTextAtSize(destAirportName.slice(0, 36), 7),
      y: originY - 23,
      size: 7,
      font: fontRegular,
      color: colorMuted
    });

    // Bottom Baggage & Class strip
    const baggageStrip = `Class: ${seg.cabinClass || 'Economy'}   |   Cabin Baggage: ${seg.cabinBaggage || '7 Kg'}   |   Check-in Baggage: ${seg.checkinBaggage || '15 Kg'}`;
    page1.drawRectangle({
      x: marginX,
      y: cursorY - segBoxHeight,
      width: contentWidth,
      height: 17,
      color: colorLightBg
    });
    page1.drawText(baggageStrip, {
      x: marginX + 12,
      y: cursorY - segBoxHeight + 5,
      size: 7.5,
      font: fontRegular,
      color: colorText
    });

    cursorY -= (segBoxHeight + 12);
  }

  // 4. Traveller Details Table WITH PDF417 BARCODE
  const pCount = passengers.length;
  const rowHeight = 36;
  const tableHeaderHeight = 20;

  page1.drawRectangle({
    x: marginX,
    y: cursorY - tableHeaderHeight,
    width: contentWidth,
    height: tableHeaderHeight,
    color: colorLightBg,
    borderColor: colorBorder,
    borderWidth: 1
  });

  page1.drawText('#', { x: marginX + 6, y: cursorY - 14, size: 7.5, font: fontBold, color: colorText });
  page1.drawText('PASSENGER NAME', { x: marginX + 22, y: cursorY - 14, size: 7.5, font: fontBold, color: colorText });
  page1.drawText('AIRLINE PNR', { x: marginX + 185, y: cursorY - 14, size: 7.5, font: fontBold, color: colorText });
  page1.drawText('TICKET NUMBER', { x: marginX + 250, y: cursorY - 14, size: 7.5, font: fontBold, color: colorText });
  page1.drawText('STATUS', { x: marginX + 375, y: cursorY - 14, size: 7.5, font: fontBold, color: colorText });
  page1.drawText('BOARDING BARCODE', { x: marginX + 430, y: cursorY - 14, size: 7.5, font: fontBold, color: colorText });

  cursorY -= tableHeaderHeight;

  passengers.forEach((p, idx) => {
    page1.drawRectangle({
      x: marginX,
      y: cursorY - rowHeight,
      width: contentWidth,
      height: rowHeight,
      color: idx % 2 === 0 ? colorWhite : rgb(0.98, 0.99, 1),
      borderColor: colorBorder,
      borderWidth: 0.8
    });

    page1.drawText(`${idx + 1}`, { x: marginX + 6, y: cursorY - 21, size: 7.5, font: fontRegular, color: colorMuted });
    page1.drawText((p.name || 'Passenger').slice(0, 32), { x: marginX + 22, y: cursorY - 16, size: 8, font: fontBold, color: colorText });
    page1.drawText(`Type: ${p.type || 'ADT'} | Seat: ${p.seat || '-'}`, { x: marginX + 22, y: cursorY - 27, size: 6.8, font: fontRegular, color: colorMuted });

    page1.drawText(ticketData.airlinePnr || '-', { x: marginX + 185, y: cursorY - 21, size: 7.5, font: fontBold, color: colorRed });
    page1.drawText(p.ticketNumber || 'Confirmed', { x: marginX + 250, y: cursorY - 21, size: 7.5, font: fontRegular, color: colorText });
    page1.drawText(p.status || 'Confirm', { x: marginX + 375, y: cursorY - 21, size: 7.5, font: fontBold, color: colorSuccess });

    const barcodeImg = passengerBarcodes[idx];
    if (barcodeImg) {
      page1.drawImage(barcodeImg, {
        x: marginX + 430,
        y: cursorY - rowHeight + 4,
        width: 86,
        height: 28
      });
    }

    cursorY -= rowHeight;
  });

  cursorY -= 10;

  // 5. Pricing & Airline Support Card
  const infoCardHeight = 44;
  page1.drawRectangle({
    x: marginX,
    y: cursorY - infoCardHeight,
    width: contentWidth,
    height: infoCardHeight,
    color: rgb(0.99, 0.98, 0.95),
    borderColor: rgb(0.97, 0.88, 0.75),
    borderWidth: 1
  });

  page1.drawText('AIRLINE SUPPORT & POLICY', {
    x: marginX + 10,
    y: cursorY - 13,
    size: 7.5,
    font: fontBold,
    color: colorOrange
  });
  const airContactLine = `Airline Helpline: ${ticketData.airlineContact || 'Contact Airline Directly'}`;
  page1.drawText(airContactLine, {
    x: marginX + 10,
    y: cursorY - 24,
    size: 7.5,
    font: fontBold,
    color: colorText
  });
  const cancelLine = `Cancellation: ${ticketData.cancellationSummary || 'Subject to airline fare rules'}`;
  page1.drawText(cancelLine.slice(0, 55), {
    x: marginX + 10,
    y: cursorY - 34,
    size: 7,
    font: fontRegular,
    color: colorMuted
  });

  const pr = ticketData.pricing || {};
  if (pr.showFeeBreakdown) {
    page1.drawText(`Base Airfare: Rs. ${pr.otaTotal || 0}`, {
      x: rightX - 160,
      y: cursorY - 13,
      size: 7.5,
      font: fontRegular,
      color: colorMuted
    });
    page1.drawText(`Facilitation Fee: Rs. ${pr.serviceFee || 0}`, {
      x: rightX - 160,
      y: cursorY - 24,
      size: 7.5,
      font: fontRegular,
      color: colorMuted
    });
    page1.drawText(`Total Amount: Rs. ${pr.customerTotal || 0}`, {
      x: rightX - 160,
      y: cursorY - 36,
      size: 9.5,
      font: fontBold,
      color: colorRed
    });
  } else {
    page1.drawText('TOTAL AMOUNT PAID', {
      x: rightX - 150,
      y: cursorY - 15,
      size: 7.5,
      font: fontBold,
      color: colorMuted
    });
    page1.drawText(`Rs. ${pr.customerTotal || pr.otaTotal || 0}`, {
      x: rightX - 150,
      y: cursorY - 32,
      size: 13,
      font: fontBold,
      color: colorRed
    });
  }

  cursorY -= (infoCardHeight + 10);

  // 6. Important Instructions (dynamically using settings.importantInstructions with line wrapping)
  const rawInstructions = (settings.importantInstructions && settings.importantInstructions.length > 0)
    ? settings.importantInstructions
    : [
        'Check-in counters close 60 minutes prior for domestic flights and 120 minutes prior for international flights.',
        'Valid Government Photo ID (Passport/Aadhaar/Voter ID) is mandatory for check-in and airport security.',
        'Mandatory web check-in is required by airlines. Boarding gates close 25 minutes prior to departure.',
        'Refer to Page 2 for comprehensive Agency Terms & Conditions, Baggage Policies, and Refund Guidelines.'
      ];

  // Calculate box height dynamically based on wrapped lines
  let instructionLines = [];
  rawInstructions.slice(0, 4).forEach((inst) => {
    const wrapped = wrapText(inst, fontRegular, 6.8, contentWidth - 24);
    if (wrapped.length > 0) {
      instructionLines.push(wrapped);
    }
  });

  const totalInstTextLines = instructionLines.reduce((acc, lines) => acc + lines.length, 0);
  const guideBoxHeight = Math.max(50, 18 + totalInstTextLines * 9.5);

  page1.drawRectangle({
    x: marginX,
    y: cursorY - guideBoxHeight,
    width: contentWidth,
    height: guideBoxHeight,
    color: colorWhite,
    borderColor: colorBorder,
    borderWidth: 1
  });

  page1.drawText('IMPORTANT TRAVEL GUIDELINES (QUICK REFERENCE)', {
    x: marginX + 10,
    y: cursorY - 12,
    size: 7.5,
    font: fontBold,
    color: colorText
  });

  let gY = cursorY - 23;
  instructionLines.forEach((lines) => {
    lines.forEach((line, lIdx) => {
      const prefix = lIdx === 0 ? '- ' : '  ';
      page1.drawText(`${prefix}${line}`, {
        x: marginX + 12,
        y: gY,
        size: 6.8,
        font: fontRegular,
        color: colorMuted
      });
      gY -= 9;
    });
  });

  // Page 1 Footer
  const footerY1 = 26;
  page1.drawLine({
    start: { x: marginX, y: footerY1 + 14 },
    end: { x: rightX, y: footerY1 + 14 },
    thickness: 0.8,
    color: colorBorder
  });

  const airlineName1 = (ticketData.segments && ticketData.segments[0]?.airline) || 'Airline';
  page1.drawText(`Ticket issued by ${airlineName1}. Booking facilitated by ${settings.companyName || 'Gaurav Tour and Travels'}.`, {
    x: marginX,
    y: footerY1 + 4,
    size: 7,
    font: fontBold,
    color: colorMuted
  });
  page1.drawText('Page 1 of 2  [Terms & Conditions on Page 2]', {
    x: rightX - 165,
    y: footerY1 + 4,
    size: 7,
    font: fontBold,
    color: colorOrange
  });

  // =========================================================================
  // PAGE 2: USER CONFIGURED TERMS & CONDITIONS & TRAVEL INSTRUCTIONS
  // =========================================================================
  const page2 = doc.addPage([595.28, 841.89]);
  let cursorY2 = height - 34;

  // Page 2 Header Banner
  page2.drawRectangle({
    x: marginX,
    y: cursorY2 - 36,
    width: contentWidth,
    height: 36,
    color: colorLightBg,
    borderColor: colorOrange,
    borderWidth: 1.2
  });

  page2.drawText(settings.companyName.toUpperCase(), {
    x: marginX + 12,
    y: cursorY2 - 16,
    size: 11,
    font: fontBold,
    color: colorRed
  });
  page2.drawText(`IMPORTANT TRAVEL INSTRUCTIONS & TERMS OF CARRIAGE  |  PNR: ${ticketData.airlinePnr || 'CONFIRMED'}`, {
    x: marginX + 12,
    y: cursorY2 - 28,
    size: 7.5,
    font: fontBold,
    color: colorText
  });

  const contactHeader2 = `Helpline: ${settings.phone1 || ''} | WhatsApp: ${settings.whatsapp || ''}`;
  page2.drawText(contactHeader2, {
    x: rightX - fontBold.widthOfTextAtSize(contactHeader2, 7.5) - 12,
    y: cursorY2 - 22,
    size: 7.5,
    font: fontBold,
    color: colorMuted
  });

  cursorY2 -= 46;

  // Load user terms from settings.termsAndConditions
  // If user entered custom paragraphs in settings, we format and wrap every paragraph dynamically!
  const userTerms = (settings.termsAndConditions && settings.termsAndConditions.length > 0)
    ? settings.termsAndConditions
    : [
        "1) Check-In Times & Boarding: Passengers must adhere to airline check-in times. Counters close 60 mins before domestic departures and 120 mins before international flights. Boarding gates close 25 mins prior to departure.",
        "2) Valid ID Proofs, Passports & Visas: Domestic travelers must carry valid government-issued photo ID (Aadhaar, Passport, Voter ID). International travelers require a valid Passport (min 6 months validity) and required Visas.",
        "3) Baggage Policy: Baggage allowance strictly follows operating airline regulations. Excess baggage will incur charges directly payable at the airline airport counter.",
        "4) Cancellations & Rescheduling: Governed strictly by airline fare rules plus our nominal facilitation fee. Non-refundable fares cannot be refunded upon cancellation.",
        "5) Flight Delays & Operations: Airlines communicate operational changes directly. Gaurav Tour and Travels acts solely as a booking facilitator.",
        "6) Special Assistance: Notify the agency or airline at least 48 hours prior for wheelchair or special dietary requests.",
        "7) Support & Queries: For inquiries or reconfirmation, reach out directly to Gaurav Tour and Travels helpline."
      ];

  const maxTextWidth = contentWidth - 20;

  userTerms.forEach((termItem, idx) => {
    // If running out of room on page 2, stop or fit gracefully
    if (cursorY2 < 55) return;

    // Check if paragraph has a leading header like "1) Check-In Times:" or "Baggage Policy:"
    const headerMatch = termItem.match(/^([0-9]+\s*[\).:-]\s*[^:\n]+:?|^[A-Za-z\s]+:)/);
    
    if (headerMatch) {
      const headerPart = headerMatch[1].trim();
      const bodyPart = termItem.slice(headerMatch[0].length).trim();

      // Draw bold header
      page2.drawText(headerPart, {
        x: marginX + 8,
        y: cursorY2,
        size: 7.5,
        font: fontBold,
        color: colorText
      });
      cursorY2 -= 10;

      // Draw wrapped body
      if (bodyPart) {
        const bodyLines = wrapText(bodyPart, fontRegular, 7, maxTextWidth);
        bodyLines.forEach((line) => {
          if (cursorY2 < 50) return;
          page2.drawText(line, {
            x: marginX + 14,
            y: cursorY2,
            size: 7,
            font: fontRegular,
            color: colorMuted
          });
          cursorY2 -= 9;
        });
      }
      cursorY2 -= 4;
    } else {
      // Standard paragraph
      const wrappedLines = wrapText(termItem, fontRegular, 7, maxTextWidth);
      wrappedLines.forEach((line, lIdx) => {
        if (cursorY2 < 50) return;
        const prefix = lIdx === 0 ? '- ' : '  ';
        page2.drawText(`${prefix}${line}`, {
          x: marginX + 8,
          y: cursorY2,
          size: 7,
          font: fontRegular,
          color: colorMuted
        });
        cursorY2 -= 9;
      });
      cursorY2 -= 4;
    }
  });

  // Page 2 Footer
  const footerY2 = 26;
  page2.drawLine({
    start: { x: marginX, y: footerY2 + 14 },
    end: { x: rightX, y: footerY2 + 14 },
    thickness: 0.8,
    color: colorBorder
  });

  const disclaimer2 = `Ticket issued by ${airlineName1}. Booking facilitated by ${settings.companyName || 'Gaurav Tour and Travels'}.`;
  page2.drawText(disclaimer2, {
    x: marginX,
    y: footerY2 + 4,
    size: 7,
    font: fontBold,
    color: colorMuted
  });

  const emergency2 = `24x7 Customer Helpline: ${settings.emergencyNumber || settings.phone1 || ''}`;
  page2.drawText(emergency2, {
    x: rightX - fontBold.widthOfTextAtSize(emergency2, 7),
    y: footerY2 + 4,
    size: 7,
    font: fontBold,
    color: colorOrange
  });

  return await doc.save();
}

/**
 * Helper to download PDF in the browser
 */
export function downloadPdfBlob(pdfBytes, filename) {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
