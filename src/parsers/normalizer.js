/**
 * Normalization utilities for text extracted from PDF tickets
 */

// Common airport codes to city and airport names
export const AIRPORT_DIRECTORY = {
  HYD: { code: 'HYD', city: 'Hyderabad', name: 'Rajiv Gandhi International Airport' },
  MCT: { code: 'MCT', city: 'Muscat', name: 'Muscat International Airport' },
  DEL: { code: 'DEL', city: 'New Delhi', name: 'Indira Gandhi International Airport' },
  BOM: { code: 'BOM', city: 'Mumbai', name: 'Chhatrapati Shivaji Maharaj International Airport' },
  BLR: { code: 'BLR', city: 'Bengaluru', name: 'Kempegowda International Airport' },
  MAA: { code: 'MAA', city: 'Chennai', name: 'Chennai International Airport' },
  CCU: { code: 'CCU', city: 'Kolkata', name: 'Netaji Subhash Chandra Bose International Airport' },
  VNS: { code: 'VNS', city: 'Varanasi', name: 'Lal Bahadur Shastri International Airport' },
  LKO: { code: 'LKO', city: 'Lucknow', name: 'Chaudhary Charan Singh International Airport' },
  PAT: { code: 'PAT', city: 'Patna', name: 'Jayprakash Narayan International Airport' },
  JAI: { code: 'JAI', city: 'Jaipur', name: 'Jaipur International Airport' },
  PNQ: { code: 'PNQ', city: 'Pune', name: 'Pune International Airport' },
  IXC: { code: 'IXC', city: 'Chandigarh', name: 'Shaheed Bhagat Singh International Airport' },
  GOI: { code: 'GOI', city: 'Goa (Dabolim)', name: 'Dabolim Airport' },
  GOX: { code: 'GOX', city: 'Goa (Mopa)', name: 'Manohar International Airport' },
  AMD: { code: 'AMD', city: 'Ahmedabad', name: 'Sardar Vallabhbhai Patel International Airport' },
  COK: { code: 'COK', city: 'Kochi', name: 'Cochin International Airport' },
  DXB: { code: 'DXB', city: 'Dubai', name: 'Dubai International Airport' },
  SHJ: { code: 'SHJ', city: 'Sharjah', name: 'Sharjah International Airport' },
  DOH: { code: 'DOH', city: 'Doha', name: 'Hamad International Airport' },
  BKK: { code: 'BKK', city: 'Bangkok', name: 'Suvarnabhumi Airport' },
  SIN: { code: 'SIN', city: 'Singapore', name: 'Singapore Changi Airport' },
  KUL: { code: 'KUL', city: 'Kuala Lumpur', name: 'Kuala Lumpur International Airport' },
  LHR: { code: 'LHR', city: 'London', name: 'London Heathrow Airport' }
};

/**
 * Clean and normalize raw extracted PDF text
 */
export function normalizeText(text) {
  if (!text) return '';

  return text
    // Strip soft hyphen U+00AD and zero-width spaces
    .replace(/[\u00AD\u200B\u200C\u200D\uFEFF]/g, '')
    // Replace non-breaking spaces and exotic whitespace with standard space
    .replace(/[\u00A0\u1680\u180E\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    // Normalize hyphen variants (en-dash, em-dash, minus, non-breaking hyphen)
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, '-')
    // Clean spaced letters like "S e a t" -> "Seat", "S t a t u s" -> "Status"
    .replace(/\bS\s+e\s+a\s+t\b/gi, 'Seat')
    .replace(/\bS\s+t\s+a\s+t\s+u\s+s\b/gi, 'Status')
    .replace(/\bC\s+a\s+n\s+c\s+e\s+l\s+l\s+a\s+t\s+i\s+o\s+n\b/gi, 'Cancellation')
    .replace(/\bC\s+h\s+a\s+r\s+g\s+e\s+s\b/gi, 'Charges')
    // Normalize glued dates like Fri-10Apr2026 or Fri10Apr2026 -> Fri 10 Apr 2026
    .replace(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[- ]?([0-3]?[0-9])[- ]?([A-Za-z]{3})[- ]?(\d{4})\b/g, '$1 $2 $3 $4')
    // Collapse horizontal whitespace
    .replace(/[ \t]+/g, ' ')
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    // Collapse excess empty lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Normalize flight numbers, e.g. "WY - 236" -> "WY-236", "6E  204" -> "6E-204"
 */
export function normalizeFlightNumber(flightNum) {
  if (!flightNum) return '';
  return flightNum
    .replace(/\s+/g, ' ')
    .replace(/^([A-Z0-9]{2})\s*[-]?\s*([0-9]{1,4})$/i, '$1-$2')
    .trim()
    .toUpperCase();
}

/**
 * Clean airline PNR - alphanumeric 6 or 7 characters, uppercase
 */
export function normalizePnr(pnr) {
  if (!pnr) return '';
  const cleaned = pnr.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return cleaned.slice(0, 8);
}

/**
 * Format currency number
 */
export function parseCurrency(val) {
  if (typeof val === 'number') return Math.round(val);
  if (!val) return 0;
  const numStr = val.toString().replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(numStr);
  return isNaN(parsed) ? 0 : Math.round(parsed);
}
