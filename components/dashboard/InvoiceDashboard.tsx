'use client';

import { useState, useMemo } from 'react';
import { ArrowUpDown, X, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  INVOICES,
  formatUSD,
  getInvoiceKPIs,
  getLineItemTotal,
  getInvoiceTotal,
} from '@/lib/mock-invoice-db';
import type { Invoice, InvoiceStatus, PaymentMethod } from '@/lib/mock-invoice-db';

type SortCol = 'amount' | 'dueDate' | 'status';
const STATUS_ORDER: Record<InvoiceStatus, number> = { draft: 0, sent: 1, overdue: 2 };

function statusBadge(status: InvoiceStatus) {
  if (status === 'draft')
    return <Badge className="border-0 bg-gray-100 text-gray-500 hover:bg-gray-100">Draft</Badge>;
  if (status === 'sent')
    return <Badge className="border-0 bg-indigo-100 text-indigo-700 hover:bg-indigo-100">Sent</Badge>;
  return <Badge className="border-0 bg-red-100 text-red-700 hover:bg-red-100">Overdue</Badge>;
}

function paymentMethodBadge(method: PaymentMethod) {
  if (method === 'stripe')
    return <Badge className="border-0 bg-purple-100 text-purple-700 hover:bg-purple-100">Stripe</Badge>;
  if (method === 'paypal')
    return <Badge className="border-0 bg-blue-100 text-blue-700 hover:bg-blue-100">PayPal</Badge>;
  if (method === 'bank_transfer')
    return <Badge className="border-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Bank Transfer</Badge>;
  const label = method === 'check' ? 'Check' : 'Cash';
  return <Badge className="border-0 bg-gray-100 text-gray-600 hover:bg-gray-100">{label}</Badge>;
}

const FILTER_TABS: { id: InvoiceStatus | 'all'; label: string }[] = [
  { id: 'all',     label: 'All' },
  { id: 'draft',   label: 'Draft' },
  { id: 'sent',    label: 'Sent' },
  { id: 'overdue', label: 'Overdue' },
];

function KPISummaryRow({ kpis }: { kpis: ReturnType<typeof getInvoiceKPIs> }) {
  const cards = [
    { label: 'Total Invoiced',  value: formatUSD(kpis.totalInvoiced),  cls: 'text-gray-900' },
    { label: 'Collected',       value: formatUSD(kpis.totalCollected),  cls: 'text-emerald-600' },
    { label: 'Outstanding',     value: formatUSD(kpis.outstanding),     cls: 'text-amber-600' },
    { label: 'Overdue Count',   value: String(kpis.overdueCount),       cls: kpis.overdueCount > 0 ? 'text-red-600' : 'text-gray-900' },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 px-4 pb-4 pt-4 sm:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400">{c.label}</p>
          <p className={`mt-1 text-2xl font-bold ${c.cls}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

function FilterTabs({
  filter,
  onChange,
}: {
  filter: InvoiceStatus | 'all';
  onChange: (f: InvoiceStatus | 'all') => void;
}) {
  return (
    <div className="flex gap-1 border-b border-gray-200 px-4">
      {FILTER_TABS.map((t) => {
        const count = t.id === 'all' ? INVOICES.length : INVOICES.filter((i) => i.status === t.id).length;
        const active = filter === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`flex items-center gap-1.5 border-b-2 pb-2 pt-2 text-xs font-medium transition-colors ${
              active
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            <span className="rounded-full bg-gray-100 px-1.5 text-[10px] font-semibold text-gray-500">
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SortableHead({
  col,
  label,
  sortCol,
  sortDir,
  onSort,
}: {
  col: SortCol;
  label: string;
  sortCol: SortCol;
  sortDir: 'asc' | 'desc';
  onSort: (c: SortCol) => void;
}) {
  return (
    <TableHead
      className="cursor-pointer select-none"
      onClick={() => onSort(col)}
    >
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown
          className={`h-3 w-3 ${sortCol === col ? 'text-indigo-600' : 'text-gray-300'}`}
        />
      </span>
    </TableHead>
  );
}

function InvoiceSidePanel({
  invoice,
  onClose,
}: {
  invoice: Invoice;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 flex h-full w-[40%] min-w-[360px] max-w-[600px] flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="shrink-0 border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-gray-900">{invoice.invoiceNumber}</span>
              {statusBadge(invoice.status)}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-400">{invoice.client.name}</p>
        </div>

        {/* Overdue warning */}
        {invoice.status === 'overdue' && (
          <div className="shrink-0 border-b border-red-200 bg-red-50 px-6 py-2">
            <p className="text-xs font-medium text-red-700">
              This invoice is overdue — payment was due {format(invoice.dueDate, 'MMM d, yyyy')}.
            </p>
          </div>
        )}

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Section 1 — Client Info */}
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="mb-3 text-[10px] font-medium uppercase tracking-widest text-gray-400">
              Client Information
            </h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div className="col-span-2">
                <dt className="text-gray-400">Name</dt>
                <dd className="font-medium text-gray-900">{invoice.client.name}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Email</dt>
                <dd>
                  <a
                    href={`mailto:${invoice.client.email}`}
                    className="text-indigo-600 hover:underline"
                  >
                    {invoice.client.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-gray-400">Phone</dt>
                <dd className="text-gray-900">{invoice.client.phone}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-gray-400">Address</dt>
                <dd className="text-gray-900">{invoice.client.address}</dd>
              </div>
              {Object.entries(invoice.client.customFields).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-gray-400">{k}</dt>
                  <dd className="text-gray-900">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Section 2 — Invoice Details */}
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="mb-3 text-[10px] font-medium uppercase tracking-widest text-gray-400">
              Invoice Details
            </h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div>
                <dt className="text-gray-400">Invoice Number</dt>
                <dd className="font-mono text-gray-700">{invoice.invoiceNumber}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Amount</dt>
                <dd className="font-semibold text-gray-900">{formatUSD(invoice.amount)}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Created</dt>
                <dd className="text-gray-900">{format(invoice.createdAt, 'MMM d, yyyy')}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Due Date</dt>
                <dd className={invoice.status === 'overdue' ? 'font-medium text-red-600' : 'text-gray-900'}>
                  {format(invoice.dueDate, 'MMM d, yyyy')}
                </dd>
              </div>
              {invoice.sentDate && (
                <div>
                  <dt className="text-gray-400">Sent</dt>
                  <dd className="text-gray-900">{format(invoice.sentDate, 'MMM d, yyyy')}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-400">Status</dt>
                <dd>{statusBadge(invoice.status)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-gray-400">Public URL</dt>
                <dd>
                  <a
                    href={invoice.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-indigo-600 hover:underline"
                  >
                    View Invoice <ExternalLink className="h-3 w-3" />
                  </a>
                </dd>
              </div>
            </dl>
          </div>

          {/* Section 3 — Payment */}
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="mb-3 text-[10px] font-medium uppercase tracking-widest text-gray-400">
              Payment
            </h3>
            {invoice.payment === null ? (
              <p className="text-xs italic text-gray-400">No payment recorded</p>
            ) : (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <dt className="text-gray-400">Amount Paid</dt>
                  <dd className="font-semibold text-emerald-700">{formatUSD(invoice.payment.amountPaid)}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Payment Date</dt>
                  <dd className="text-gray-900">{format(invoice.payment.paymentDate, 'MMM d, yyyy')}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Method</dt>
                  <dd>{paymentMethodBadge(invoice.payment.method)}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Invoice ID</dt>
                  <dd className="font-mono text-[10px] text-gray-700">{invoice.payment.invoiceId}</dd>
                </div>
              </dl>
            )}
          </div>

          {/* Section 4 — Line Items */}
          <div className="px-6 py-4">
            <h3 className="mb-3 text-[10px] font-medium uppercase tracking-widest text-gray-400">
              Line Items
            </h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-left text-[10px] font-medium uppercase tracking-widest text-gray-400">
                  <th className="pb-2 pr-2">Service</th>
                  <th className="pb-2 pr-2">Description</th>
                  <th className="pb-2 pr-2 text-right">Unit Cost</th>
                  <th className="pb-2 pr-2 text-right">Hours</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((li) => (
                  <tr key={li.id} className="border-b border-gray-100">
                    <td className="py-2 pr-2 font-medium text-gray-900">{li.serviceName}</td>
                    <td className="py-2 pr-2 text-gray-500">{li.description}</td>
                    <td className="py-2 pr-2 text-right text-gray-900">{formatUSD(li.unitCost)}</td>
                    <td className="py-2 pr-2 text-right text-gray-900">{li.taskHours}</td>
                    <td className="py-2 text-right font-medium text-gray-900">
                      {formatUSD(getLineItemTotal(li))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold text-gray-900">
                  <td colSpan={4} className="py-2 pr-2">Grand Total</td>
                  <td className="py-2 text-right">{formatUSD(getInvoiceTotal(invoice))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

export function InvoiceDashboard() {
  const [filter, setFilter]                   = useState<InvoiceStatus | 'all'>('all');
  const [sortCol, setSortCol]                 = useState<SortCol>('dueDate');
  const [sortDir, setSortDir]                 = useState<'asc' | 'desc'>('asc');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [hoveredRow, setHoveredRow]           = useState<string | null>(null);

  const kpis = useMemo(() => getInvoiceKPIs(INVOICES), []);

  const filteredAndSorted = useMemo(() => {
    const base = filter === 'all' ? INVOICES : INVOICES.filter((i) => i.status === filter);
    return [...base].sort((a, b) => {
      let cmp = 0;
      if (sortCol === 'amount')  cmp = a.amount - b.amount;
      if (sortCol === 'dueDate') cmp = a.dueDate.getTime() - b.dueDate.getTime();
      if (sortCol === 'status')  cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filter, sortCol, sortDir]);

  function handleSort(col: SortCol) {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('asc'); }
  }

  return (
    <div className="py-2">
      <KPISummaryRow kpis={kpis} />
      <FilterTabs filter={filter} onChange={setFilter} />

      <div className="overflow-x-auto px-4 pt-3 pb-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Services</TableHead>
              <SortableHead col="amount"  label="Amount"   sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              <SortableHead col="dueDate" label="Due Date" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              <SortableHead col="status"  label="Status"   sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSorted.map((inv) => (
              <TableRow
                key={inv.id}
                className="cursor-pointer"
                onClick={() => setSelectedInvoice(inv)}
                onMouseEnter={() => setHoveredRow(inv.id)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                <TableCell className="font-mono text-xs text-gray-700">{inv.invoiceNumber}</TableCell>
                <TableCell className="font-medium text-gray-900">{inv.client.name}</TableCell>
                <TableCell>
                  <span className="block max-w-[160px] truncate text-xs text-gray-500">
                    {inv.lineItems.slice(0, 2).map((li) => li.serviceName).join(', ')}
                  </span>
                </TableCell>
                <TableCell className="font-medium text-gray-900">{formatUSD(inv.amount)}</TableCell>
                <TableCell className={inv.status === 'overdue' ? 'font-medium text-red-600' : 'text-gray-900'}>
                  {format(inv.dueDate, 'MMM d, yyyy')}
                </TableCell>
                <TableCell>{statusBadge(inv.status)}</TableCell>
                <TableCell>
                  {hoveredRow === inv.id && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedInvoice(inv); }}
                      className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      View
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredAndSorted.length === 0 && (
          <p className="py-8 text-center text-xs text-gray-400">No invoices match this filter.</p>
        )}
      </div>

      {selectedInvoice && (
        <InvoiceSidePanel
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
}
