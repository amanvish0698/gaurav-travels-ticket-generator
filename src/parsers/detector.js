/**
 * OTA Fingerprint Detector
 */

export function detectOta(normalizedText) {
  const lower = normalizedText.toLowerCase();

  // EaseMyTrip signatures
  if (
    lower.includes('easemytrip') ||
    lower.includes('easy trip planners') ||
    /booking\s*id\s*[-–:]*\s*emt/i.test(normalizedText)
  ) {
    return {
      ota: 'easemytrip',
      name: 'EaseMyTrip',
      confidence: 0.99
    };
  }

  // MakeMyTrip signatures
  if (
    lower.includes('makemytrip') ||
    lower.includes('mmt booking') ||
    /makemytrip\.com/i.test(lower)
  ) {
    return {
      ota: 'makemytrip',
      name: 'MakeMyTrip',
      confidence: 0.95
    };
  }

  // Cleartrip signatures
  if (
    lower.includes('cleartrip') ||
    lower.includes('cleartrip.com') ||
    /trip\s*id\s*[:–-]?\s*\d{6,15}/i.test(normalizedText)
  ) {
    return {
      ota: 'cleartrip',
      name: 'Cleartrip',
      confidence: 0.95
    };
  }

  // Goibibo signatures
  if (
    lower.includes('goibibo') ||
    lower.includes('goibibo.com') ||
    lower.includes('ibibo group')
  ) {
    return {
      ota: 'goibibo',
      name: 'Goibibo',
      confidence: 0.95
    };
  }

  // Fallback
  return {
    ota: 'generic',
    name: 'Generic OTA / Airline Ticket',
    confidence: 0.5
  };
}
