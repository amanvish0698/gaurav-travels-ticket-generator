export function createEmptyTicket() {
  return {
    sourceOta: 'generic',
    bookingId: '',
    airlinePnr: '',
    bookingDate: '',
    airlineContact: '',
    cancellationSummary: 'As per airline cancellation policy',
    passengers: [
      {
        name: '',
        type: 'ADT',
        ticketNumber: '',
        seat: '-',
        meal: '-',
        baggage: '-',
        status: 'Confirm'
      }
    ],
    segments: [
      {
        airline: '',
        flightNumber: '',
        operatedBy: '',
        origin: {
          code: '',
          city: '',
          airportName: '',
          date: '',
          time: '',
          terminal: ''
        },
        destination: {
          code: '',
          city: '',
          airportName: '',
          date: '',
          time: '',
          terminal: ''
        },
        duration: '',
        cabinClass: 'Economy',
        cabinBaggage: '7 Kg',
        checkinBaggage: '15 Kg'
      }
    ],
    pricing: {
      otaBaseFare: 0,
      otaTaxes: 0,
      otaDiscount: 0,
      otaTotal: 0,
      serviceFee: 500,
      customerTotal: 500,
      showFeeBreakdown: false // Default to false: show customer final total only
    },
    validation: {
      isValid: false,
      warnings: []
    }
  };
}
