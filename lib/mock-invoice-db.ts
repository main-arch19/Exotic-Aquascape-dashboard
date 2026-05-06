export type InvoiceStatus = 'draft' | 'sent' | 'overdue'
export type PaymentMethod = 'stripe' | 'paypal' | 'check' | 'cash' | 'bank_transfer'

export interface InvoiceClient {
  id: string
  name: string
  email: string
  phone: string
  address: string
  customFields: Record<string, string>
}

export interface InvoiceLineItem {
  id: string
  serviceName: string
  description: string
  unitCost: number
  taskHours: number
}

export interface InvoicePayment {
  id: string
  invoiceId: string
  amountPaid: number
  paymentDate: Date
  method: PaymentMethod
}

export interface Invoice {
  id: string
  invoiceNumber: string
  client: InvoiceClient
  amount: number
  dueDate: Date
  createdAt: Date
  sentDate: Date | null
  status: InvoiceStatus
  publicUrl: string
  lineItems: InvoiceLineItem[]
  payment: InvoicePayment | null
  jobId?: string
}

const NOW = new Date('2026-05-06T09:00:00')
const daysAgo  = (n: number) => new Date(NOW.getTime() - n * 86_400_000)
const daysFrom = (n: number) => new Date(NOW.getTime() + n * 86_400_000)

export const INVOICES: Invoice[] = [
  {
    id: 'inv-001',
    invoiceNumber: 'INV-2026-001',
    status: 'sent',
    createdAt: daysAgo(18),
    sentDate: daysAgo(15),
    dueDate: daysFrom(12),
    amount: 3850,
    publicUrl: 'https://invoices.exoticaquascape.com/inv/INV-2026-001',
    client: {
      id: 'cl-001',
      name: 'Robert Castillo',
      email: 'r.castillo@gmail.com',
      phone: '(305) 554-1892',
      address: '412 Coral Reef Dr, Miami FL 33101',
      customFields: { 'Tank Size': '200 gallon', 'Contract Type': 'Installation', 'Referral': 'Marcus Rivera' },
    },
    lineItems: [
      { id: 'li-001a', serviceName: 'Tank Installation', description: 'Full custom aquarium setup with stand and canopy', unitCost: 850, taskHours: 3 },
      { id: 'li-001b', serviceName: 'Filtration Install', description: 'Canister filter plumbing and media loading', unitCost: 450, taskHours: 2 },
      { id: 'li-001c', serviceName: 'Substrate Layering', description: 'Aragonite and live sand substrate placement', unitCost: 160, taskHours: 2.5 },
    ],
    payment: {
      id: 'pay-001',
      invoiceId: 'inv-001',
      amountPaid: 3850,
      paymentDate: daysAgo(2),
      method: 'stripe',
    },
    jobId: 'coral_reef_install_miami',
  },
  {
    id: 'inv-002',
    invoiceNumber: 'INV-2026-002',
    status: 'overdue',
    createdAt: daysAgo(45),
    sentDate: daysAgo(40),
    dueDate: daysAgo(14),
    amount: 7200,
    publicUrl: 'https://invoices.exoticaquascape.com/inv/INV-2026-002',
    client: {
      id: 'cl-002',
      name: 'Marina del Vance',
      email: 'marina.delvance@seabreezeproperties.com',
      phone: '(954) 771-3305',
      address: '340 Palmetto Park Rd, Coral Springs FL 33071',
      customFields: { 'Tank Size': '500 gallon', 'Contract Type': 'Custom Build', 'Account Manager': 'Sofia Morales' },
    },
    lineItems: [
      { id: 'li-002a', serviceName: 'Custom Aquascape Design', description: 'Bespoke reef scape layout and consultation', unitCost: 1200, taskHours: 3 },
      { id: 'li-002b', serviceName: 'Coral Placement', description: 'Live coral selection, acclimation and placement', unitCost: 800, taskHours: 2 },
      { id: 'li-002c', serviceName: 'Lighting Install', description: 'LED reef spectrum fixture mounting and programming', unitCost: 600, taskHours: 3 },
      { id: 'li-002d', serviceName: 'Plumbing Setup', description: 'Overflow and return line configuration', unitCost: 400, taskHours: 0.5 },
    ],
    payment: null,
  },
  {
    id: 'inv-003',
    invoiceNumber: 'INV-2026-003',
    status: 'sent',
    createdAt: daysAgo(10),
    sentDate: daysAgo(7),
    dueDate: daysAgo(3),
    amount: 1450,
    publicUrl: 'https://invoices.exoticaquascape.com/inv/INV-2026-003',
    client: {
      id: 'cl-003',
      name: 'Diane Thornbury',
      email: 'diane.thornbury@outlook.com',
      phone: '(786) 234-0091',
      address: '1801 Ocean Dr, Miami Beach FL 33139',
      customFields: { 'Tank Size': '75 gallon', 'Contract Type': 'Monthly Maintenance' },
    },
    lineItems: [
      { id: 'li-003a', serviceName: 'Weekly Maintenance', description: 'Bi-weekly water change and cleaning', unitCost: 180, taskHours: 2 },
      { id: 'li-003b', serviceName: 'Chemical Treatment', description: 'Dechlorination and trace element dosing', unitCost: 45, taskHours: 2 },
      { id: 'li-003c', serviceName: 'Water Testing', description: 'Full parameter panel: pH, nitrate, phosphate, salinity', unitCost: 250, taskHours: 4 },
    ],
    payment: {
      id: 'pay-003',
      invoiceId: 'inv-003',
      amountPaid: 1450,
      paymentDate: daysAgo(1),
      method: 'paypal',
    },
  },
  {
    id: 'inv-004',
    invoiceNumber: 'INV-2026-004',
    status: 'draft',
    createdAt: daysAgo(3),
    sentDate: null,
    dueDate: daysFrom(30),
    amount: 2100,
    publicUrl: 'https://invoices.exoticaquascape.com/inv/INV-2026-004',
    client: {
      id: 'cl-004',
      name: 'Felix Hartmann',
      email: 'f.hartmann@hartmanngroup.net',
      phone: '(561) 908-4417',
      address: '230 Blue Lagoon Blvd, Boca Raton FL 33431',
      customFields: { 'Tank Size': '125 gallon', 'Contract Type': 'Quarterly Deep Clean', 'Notes': 'Prefers weekend service' },
    },
    lineItems: [
      { id: 'li-004a', serviceName: 'Deep Clean', description: 'Full glass scrub, substrate vacuum, equipment rinse', unitCost: 350, taskHours: 4 },
      { id: 'li-004b', serviceName: 'Equipment Inspection', description: 'Pump, heater, and skimmer performance check', unitCost: 175, taskHours: 2 },
      { id: 'li-004c', serviceName: 'Algae Treatment', description: 'Spot treatment and nutrient export adjustment', unitCost: 350, taskHours: 1 },
    ],
    payment: null,
  },
  {
    id: 'inv-005',
    invoiceNumber: 'INV-2026-005',
    status: 'overdue',
    createdAt: daysAgo(50),
    sentDate: daysAgo(45),
    dueDate: daysAgo(21),
    amount: 5600,
    publicUrl: 'https://invoices.exoticaquascape.com/inv/INV-2026-005',
    client: {
      id: 'cl-005',
      name: 'Leona Park',
      email: 'lpark@tidepoolliving.com',
      phone: '(954) 662-0033',
      address: '89 Tide Pool Ln, Fort Lauderdale FL 33301',
      customFields: { 'Tank Size': '300 gallon', 'Contract Type': 'Emergency + Repair', 'Account Manager': 'Aisha Thompson' },
    },
    lineItems: [
      { id: 'li-005a', serviceName: 'Emergency Response', description: 'After-hours emergency dispatch and assessment', unitCost: 800, taskHours: 2 },
      { id: 'li-005b', serviceName: 'Pump Replacement', description: 'Return pump swap-out including parts and labor', unitCost: 600, taskHours: 4 },
      { id: 'li-005c', serviceName: 'System Flush', description: 'Full sump and return line flush after pump failure', unitCost: 400, taskHours: 2 },
      { id: 'li-005d', serviceName: 'Filter Media', description: 'Fresh filter sock, carbon and GFO replacement', unitCost: 200, taskHours: 4 },
    ],
    payment: null,
  },
  {
    id: 'inv-006',
    invoiceNumber: 'INV-2026-006',
    status: 'overdue',
    createdAt: daysAgo(30),
    sentDate: daysAgo(25),
    dueDate: daysAgo(8),
    amount: 4320,
    publicUrl: 'https://invoices.exoticaquascape.com/inv/INV-2026-006',
    client: {
      id: 'cl-006',
      name: 'Terrence Wolfe',
      email: 'terrence.wolfe@sailfishcharter.com',
      phone: '(305) 451-8820',
      address: '95 Sailfish Ave, Key Largo FL 33037',
      customFields: { 'Tank Size': '180 gallon', 'Contract Type': 'Coral Rescue', 'Referral': 'Devon Chang' },
    },
    lineItems: [
      { id: 'li-006a', serviceName: 'Coral Rescue Treatment', description: 'RTN/STN intervention, dip treatment and isolation', unitCost: 720, taskHours: 4 },
      { id: 'li-006b', serviceName: 'pH Balancing', description: 'Kalkwasser dosing and alkalinity adjustment', unitCost: 360, taskHours: 2 },
      { id: 'li-006c', serviceName: 'UV Sterilizer Install', description: 'In-line UV sterilizer installation and commissioning', unitCost: 360, taskHours: 2 },
    ],
    payment: null,
  },
  {
    id: 'inv-007',
    invoiceNumber: 'INV-2026-007',
    status: 'sent',
    createdAt: daysAgo(14),
    sentDate: daysAgo(10),
    dueDate: daysFrom(5),
    amount: 980,
    publicUrl: 'https://invoices.exoticaquascape.com/inv/INV-2026-007',
    client: {
      id: 'cl-007',
      name: 'Carmen Ibáñez',
      email: 'carmen.ibanez@mangrovegroup.net',
      phone: '(954) 553-7741',
      address: '57 Mangrove Ave, Hollywood FL 33020',
      customFields: { 'Tank Size': '55 gallon', 'Contract Type': 'Monthly Maintenance' },
    },
    lineItems: [
      { id: 'li-007a', serviceName: 'Monthly Maintenance Visit', description: 'Water change, glass cleaning, and top-off', unitCost: 280, taskHours: 2 },
      { id: 'li-007b', serviceName: 'Water Parameter Testing', description: 'Full reef chemistry panel', unitCost: 210, taskHours: 2 },
    ],
    payment: {
      id: 'pay-007',
      invoiceId: 'inv-007',
      amountPaid: 980,
      paymentDate: daysAgo(4),
      method: 'check',
    },
  },
  {
    id: 'inv-008',
    invoiceNumber: 'INV-2026-008',
    status: 'draft',
    createdAt: daysAgo(1),
    sentDate: null,
    dueDate: daysFrom(45),
    amount: 6750,
    publicUrl: 'https://invoices.exoticaquascape.com/inv/INV-2026-008',
    client: {
      id: 'cl-008',
      name: 'Brent Nakamura',
      email: 'brent.nakamura@nakamuraholdings.com',
      phone: '(305) 871-4432',
      address: '412 Coral Reef Dr, Miami FL 33101',
      customFields: { 'Tank Size': '400 gallon', 'Contract Type': 'Saltwater Build', 'Notes': 'FOWLR setup, no coral initially' },
    },
    lineItems: [
      { id: 'li-008a', serviceName: 'Saltwater Tank Setup', description: 'Full FOWLR system build including sump', unitCost: 1500, taskHours: 3 },
      { id: 'li-008b', serviceName: 'Live Rock Placement', description: 'Cured live rock aquascaping and placement', unitCost: 500, taskHours: 3 },
      { id: 'li-008c', serviceName: 'Sump Installation', description: 'Custom sump build with refugium chamber', unitCost: 750, taskHours: 1 },
    ],
    payment: null,
  },
  {
    id: 'inv-009',
    invoiceNumber: 'INV-2026-009',
    status: 'sent',
    createdAt: daysAgo(20),
    sentDate: daysAgo(16),
    dueDate: daysFrom(21),
    amount: 11200,
    publicUrl: 'https://invoices.exoticaquascape.com/inv/INV-2026-009',
    client: {
      id: 'cl-009',
      name: 'Simone Duplessis',
      email: 'sduplessis@duplessisrealty.com',
      phone: '(786) 443-9915',
      address: '340 Palmetto Park Rd, Coral Springs FL 33071',
      customFields: { 'Tank Size': '800 gallon', 'Contract Type': 'Commercial Installation', 'Account Manager': 'Sofia Morales', 'Site Type': 'Lobby Display' },
    },
    lineItems: [
      { id: 'li-009a', serviceName: 'Commercial Tank Design', description: 'Architectural aquascape design for lobby centrepiece', unitCost: 2800, taskHours: 2 },
      { id: 'li-009b', serviceName: 'Marine Life Sourcing', description: 'Species selection, quarantine and delivery', unitCost: 1400, taskHours: 2 },
      { id: 'li-009c', serviceName: 'Automated System Setup', description: 'Auto top-off, dosing pumps, and controller programming', unitCost: 700, taskHours: 4 },
    ],
    payment: null,
  },
  {
    id: 'inv-010',
    invoiceNumber: 'INV-2026-010',
    status: 'overdue',
    createdAt: daysAgo(22),
    sentDate: daysAgo(18),
    dueDate: daysAgo(5),
    amount: 890,
    publicUrl: 'https://invoices.exoticaquascape.com/inv/INV-2026-010',
    client: {
      id: 'cl-010',
      name: 'Yusuf Al-Rashid',
      email: 'yusuf.alrashid@rashidproperties.ae',
      phone: '(305) 672-3388',
      address: '1801 Ocean Dr, Miami Beach FL 33139',
      customFields: { 'Tank Size': '90 gallon', 'Contract Type': 'Emergency Repair' },
    },
    lineItems: [
      { id: 'li-010a', serviceName: 'Emergency Call Out', description: 'Urgent same-day dispatch fee', unitCost: 250, taskHours: 1 },
      { id: 'li-010b', serviceName: 'Heater Repair', description: 'Thermal probe replacement and calibration', unitCost: 320, taskHours: 2 },
    ],
    payment: null,
  },
  {
    id: 'inv-011',
    invoiceNumber: 'INV-2026-011',
    status: 'draft',
    createdAt: daysAgo(2),
    sentDate: null,
    dueDate: daysFrom(60),
    amount: 3250,
    publicUrl: 'https://invoices.exoticaquascape.com/inv/INV-2026-011',
    client: {
      id: 'cl-011',
      name: 'Grace Okonkwo',
      email: 'grace.okonkwo@okonkwohomes.com',
      phone: '(561) 773-0044',
      address: '230 Blue Lagoon Blvd, Boca Raton FL 33431',
      customFields: { 'Tank Size': '150 gallon', 'Contract Type': 'Redesign', 'Notes': 'Moving to planted freshwater theme' },
    },
    lineItems: [
      { id: 'li-011a', serviceName: 'Aquascape Redesign', description: 'Full teardown, replanning and rebuild of aquascape', unitCost: 650, taskHours: 4 },
      { id: 'li-011b', serviceName: 'Plant Selection', description: 'Stem and carpeting plant curation and planting', unitCost: 325, taskHours: 2 },
    ],
    payment: null,
  },
  {
    id: 'inv-012',
    invoiceNumber: 'INV-2026-012',
    status: 'overdue',
    createdAt: daysAgo(60),
    sentDate: daysAgo(55),
    dueDate: daysAgo(30),
    amount: 2640,
    publicUrl: 'https://invoices.exoticaquascape.com/inv/INV-2026-012',
    client: {
      id: 'cl-012',
      name: 'Thomas Everley',
      email: 'thomas.everley@everleyholdings.com',
      phone: '(305) 451-2277',
      address: '95 Sailfish Ave, Key Largo FL 33037',
      customFields: { 'Tank Size': '100 gallon', 'Contract Type': 'Quarterly Service', 'Account Manager': 'Aisha Thompson' },
    },
    lineItems: [
      { id: 'li-012a', serviceName: 'Quarterly Deep Service', description: 'Full quarterly strip-down, clean and reassemble', unitCost: 660, taskHours: 3 },
      { id: 'li-012b', serviceName: 'Chemical Dosing Setup', description: '2-part dosing system installation and calibration', unitCost: 330, taskHours: 2 },
    ],
    payment: null,
  },
]

export function getInvoiceKPIs(invoices: Invoice[]): {
  totalInvoiced: number
  totalCollected: number
  outstanding: number
  overdueCount: number
} {
  const totalInvoiced  = invoices.reduce((s, i) => s + i.amount, 0)
  const totalCollected = invoices.reduce((s, i) => s + (i.payment?.amountPaid ?? 0), 0)
  return {
    totalInvoiced,
    totalCollected,
    outstanding:  totalInvoiced - totalCollected,
    overdueCount: invoices.filter((i) => i.status === 'overdue').length,
  }
}

export function formatUSD(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export function getLineItemTotal(item: InvoiceLineItem): number {
  return item.unitCost * item.taskHours
}

export function getInvoiceTotal(invoice: Invoice): number {
  return invoice.lineItems.reduce((s, li) => s + getLineItemTotal(li), 0)
}
