import { useRef } from 'react';
import type { Folio, Guest, Room } from '../../data/types';
import { useRooms } from '../../contexts/RoomsContext';
import { useHotel } from '../../contexts/HotelContext';
import { X, Printer } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface Props { folio: Folio; guest: Guest; room: Room; onClose: () => void; }

export function PrintInvoice({ folio, guest, room, onClose }: Props) {
  const { getFolioTransactions } = useRooms();
  const { config } = useHotel();
  const { colors } = useTheme();
  const printRef = useRef<HTMLDivElement>(null);

  const txs = getFolioTransactions(folio.id);
  const charges = txs.filter(t => t.amount > 0 && t.type !== 'void');
  const payments = txs.filter(t => t.amount < 0);
  const voids = txs.filter(t => t.type === 'void');
  const totalCharges = charges.reduce((s, t) => s + t.amount, 0);
  const totalPayments = Math.abs(payments.reduce((s, t) => s + t.amount, 0));
  const balance = totalCharges - totalPayments;
  const nights = Math.max(1, Math.ceil((new Date(folio.checkOut).getTime() - new Date(folio.checkIn).getTime()) / 86400000));
  const taxAmt = Math.round(totalCharges * config.taxRate / 100);

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open('', '_blank', 'width=800,height=1100');
    if (!win) return;
    win.document.write(`
      <html><head><title>Invoice — ${folio.referenceNo}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #000; margin: 0; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 16px; }
        .hotel-name { font-size: 22px; font-weight: 900; }
        .ref { font-family: monospace; font-size: 13px; font-weight: 700; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        th { background: #f3f4f6; text-align: left; padding: 6px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
        td { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; }
        .amount { text-align: right; font-family: monospace; }
        .total-row { font-weight: 700; font-size: 14px; }
        .footer { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
        .sig-line { border-top: 1px solid #000; margin-top: 40px; text-align: center; font-size: 10px; padding-top: 4px; }
        @media print { @page { size: A4; margin: 15mm; } }
      </style></head><body>${content}</body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, overflow: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 12, width: 640, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 48px rgba(0,0,0,0.4)' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: colors.bgCard, borderBottom: `1px solid ${colors.border}` }}>
          <span style={{ flex: 1, color: colors.text, fontWeight: 600 }}>Invoice Preview</span>
          <button onClick={handlePrint} style={{ background: colors.primary, color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', cursor: 'pointer', fontSize: 12, display: 'flex', gap: 5, alignItems: 'center' }}>
            <Printer size={13} /> Print / PDF
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer' }}><X size={16} /></button>
        </div>

        {/* Invoice content */}
        <div ref={printRef} style={{ padding: 32, color: '#000', background: '#fff', fontFamily: 'Arial, sans-serif', fontSize: 12 }}>
          {/* Hotel header */}
          <div className="header" style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 12, marginBottom: 16 }}>
            <div className="hotel-name" style={{ fontSize: 22, fontWeight: 900 }}>{config.hotelName}</div>
            <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>{config.hotelAddress}</div>
            <div style={{ fontSize: 11, color: '#555' }}>Tel: {config.hotelPhone} | Email: {config.hotelEmail}</div>
          </div>

          {/* Invoice meta */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', marginBottom: 4 }}>Guest Information</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{guest.name}</div>
              <div>{guest.phone}</div>
              <div>{guest.nationality}</div>
              {guest.nid && <div>NID: {guest.nid}</div>}
              {guest.passport && <div>Passport: {guest.passport}</div>}
              {guest.address && <div>{guest.address}</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', marginBottom: 4 }}>Invoice Details</div>
              <div className="ref" style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>#{folio.referenceNo}</div>
              <div style={{ marginTop: 6, fontSize: 11 }}>Printed: {config.systemDate}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 8, textAlign: 'left', background: '#f9fafb', padding: 8, borderRadius: 6, border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: 10, color: '#666' }}>Room</div><div style={{ fontWeight: 700 }}>{room.number} ({room.type})</div>
                <div style={{ fontSize: 10, color: '#666' }}>Check-In</div><div>{folio.checkIn}</div>
                <div style={{ fontSize: 10, color: '#666' }}>Check-Out</div><div>{folio.checkOut}</div>
                <div style={{ fontSize: 10, color: '#666' }}>Nights</div><div style={{ fontWeight: 700 }}>{nights}</div>
                <div style={{ fontSize: 10, color: '#666' }}>Meal Plan</div><div>{folio.mealPlan}</div>
                <div style={{ fontSize: 10, color: '#666' }}>Adults</div><div>{folio.adults}</div>
              </div>
            </div>
          </div>

          {/* Charges table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ padding: '7px 10px', textAlign: 'left', fontSize: 10, textTransform: 'uppercase' }}>Date</th>
                <th style={{ padding: '7px 10px', textAlign: 'left', fontSize: 10, textTransform: 'uppercase' }}>Description</th>
                <th style={{ padding: '7px 10px', textAlign: 'right', fontSize: 10, textTransform: 'uppercase' }}>Amount (৳)</th>
              </tr>
            </thead>
            <tbody>
              {txs.filter(t => t.type !== 'void').map(tx => (
                <tr key={tx.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 11 }}>{tx.date}</td>
                  <td style={{ padding: '6px 10px' }}>
                    <span style={{ fontWeight: 500 }}>{tx.category}</span>
                    {tx.description !== tx.category && <span style={{ color: '#666', marginLeft: 8 }}>— {tx.description}</span>}
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', color: tx.amount < 0 ? '#16a34a' : '#000' }}>
                    {tx.amount < 0 ? '(' : ''}{Math.abs(tx.amount).toLocaleString()}{tx.amount < 0 ? ')' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ borderTop: '2px solid #000', paddingTop: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: 280 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
                  <span style={{ color: '#555' }}>Subtotal Charges</span>
                  <span style={{ fontFamily: 'monospace' }}>৳{totalCharges.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
                  <span style={{ color: '#555' }}>VAT/Tax ({config.taxRate}%)</span>
                  <span style={{ fontFamily: 'monospace' }}>৳{taxAmt.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12, color: '#16a34a' }}>
                  <span>Total Payments</span>
                  <span style={{ fontFamily: 'monospace' }}>({totalPayments.toLocaleString()})</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 15, fontWeight: 800, borderTop: '1px solid #000', marginTop: 4 }}>
                  <span>Net Balance Due</span>
                  <span style={{ fontFamily: 'monospace', color: balance > 0 ? '#dc2626' : '#16a34a' }}>৳{balance.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="footer" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 48 }}>
            <div>
              <div style={{ borderTop: '1px solid #000', paddingTop: 4, textAlign: 'center', fontSize: 10, color: '#555' }}>Guest Signature</div>
            </div>
            <div>
              <div style={{ borderTop: '1px solid #000', paddingTop: 4, textAlign: 'center', fontSize: 10, color: '#555' }}>Authorized by — {config.hotelName}</div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 24, fontSize: 10, color: '#999', borderTop: '1px solid #e5e7eb', paddingTop: 10 }}>
            Thank you for staying with us. For complaints or feedback: {config.hotelEmail}
          </div>
        </div>
      </div>
    </div>
  );
}
