"""Invoice PDF generation using ReportLab."""
import io
from decimal import Decimal

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from dashboard.models import HotelConfig

from .models import Booking, FolioCharge, Payment


def _invoice_watermark(canv, doc, text='DUPLICATE'):
    canv.saveState()
    canv.setFont('Helvetica-Bold', 60)
    canv.setFillColor(colors.Color(0.85, 0.85, 0.85, alpha=0.35))
    canv.translate(A4[0] / 2, A4[1] / 2)
    canv.rotate(45)
    canv.drawCentredString(0, 0, text)
    canv.restoreState()


def generate_invoice_pdf(booking: Booking, *, preview: bool = False, duplicate: bool = False) -> bytes:
    """Generate a professional PDF invoice for a booking. Returns PDF bytes."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=20 * mm, bottomMargin=24 * mm,
                            leftMargin=20 * mm, rightMargin=20 * mm)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('InvoiceTitle', parent=styles['Title'], fontSize=22,
                                 textColor=colors.HexColor('#aa8453'), spaceAfter=2 * mm)
    heading_style = ParagraphStyle('SectionHead', parent=styles['Heading2'], fontSize=12,
                                   textColor=colors.HexColor('#333333'), spaceBefore=6 * mm, spaceAfter=2 * mm)
    normal = styles['Normal']
    small = ParagraphStyle('Small', parent=normal, fontSize=8, textColor=colors.grey)

    config = HotelConfig.load()
    invoice_date = config.business_date.strftime('%B %d, %Y')

    elements = []

    header_label = 'Tax Invoice Preview' if preview else ('DUPLICATE TAX INVOICE' if duplicate else 'Tax Invoice')
    elements.append(Paragraph("CROWN HOTEL", title_style))
    elements.append(Paragraph(header_label, ParagraphStyle('Sub', parent=normal, fontSize=14,
                                                             textColor=colors.HexColor('#666666'))))
    if preview:
        elements.append(Paragraph("PREVIEW — NOT FOR SETTLEMENT", ParagraphStyle(
            'PreviewWarn', parent=normal, fontSize=9, textColor=colors.HexColor('#c0392b'), spaceAfter=2 * mm,
        )))
    elements.append(Spacer(1, 4 * mm))

    # Invoice info table
    invoice_data = [
        ['Invoice #:', booking.booking_ref, 'Business Date:', invoice_date],
        ['Guest:', booking.guest.full_name, 'Email:', booking.guest.email],
        ['Room Type:', booking.room_type.name, 'Room:', booking.room.room_number if booking.room else '—'],
        ['Check-in:', str(booking.check_in_date), 'Check-out:', str(booking.check_out_date)],
        ['Nights:', str(booking.nights), 'Adults:', f"{booking.adults} (+{booking.children} children)"],
    ]
    if booking.company_name:
        invoice_data.append(['Company:', booking.company_name, '', ''])

    info_table = Table(invoice_data, colWidths=[70, 160, 70, 160])
    info_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.grey),
        ('TEXTCOLOR', (2, 0), (2, -1), colors.grey),
        ('FONTNAME', (1, 0), (1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 6 * mm))

    # Folio charges
    elements.append(Paragraph("Charges", heading_style))

    charges = FolioCharge.objects.filter(booking=booking, is_void=False).order_by('charge_date')

    charge_data = [['Date', 'Description', 'Type', 'Qty', 'Amount', 'Total']]
    for c in charges:
        charge_data.append([
            str(c.charge_date),
            c.description[:40],
            c.get_charge_type_display(),
            str(c.quantity),
            f"BDT {c.amount:,.2f}",
            f"BDT {c.total:,.2f}",
        ])

    if len(charge_data) == 1:
        # No folio charges — show room charge summary
        charge_data.append([
            str(booking.check_in_date),
            f"Room — {booking.room_type.name} ({booking.nights} nights)",
            'Room',
            str(booking.nights),
            f"BDT {(booking.total_price / max(booking.nights, 1)):,.2f}",
            f"BDT {booking.total_price:,.2f}",
        ])

    charge_table = Table(charge_data, colWidths=[65, 150, 65, 30, 70, 70])
    charge_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#aa8453')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dddddd')),
        ('ALIGN', (3, 0), (-1, -1), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9f9f9')]),
    ]))
    elements.append(charge_table)
    elements.append(Spacer(1, 4 * mm))

    # Totals
    from .checkout_services import compute_folio_balance
    balance_info = compute_folio_balance(booking)
    folio_total = Decimal(str(balance_info['folio_total']))
    payments_total = Decimal(str(balance_info['payments_total']))
    balance = folio_total - payments_total

    summary_data = [
        ['', '', '', '', 'Subtotal:', f"BDT {booking.total_price:,.2f}"],
    ]
    if booking.discount_amount > 0:
        summary_data.append(['', '', '', '', 'Discount:', f"-BDT {booking.discount_amount:,.2f}"])
    if booking.tax_amount > 0:
        summary_data.append(['', '', '', '', 'Tax:', f"BDT {booking.tax_amount:,.2f}"])
    summary_data.append(['', '', '', '', 'Grand Total:', f"BDT {booking.grand_total or booking.total_price:,.2f}"])
    summary_data.append(['', '', '', '', 'Paid:', f"BDT {payments_total:,.2f}"])
    if balance > 0:
        summary_data.append(['', '', '', '', 'Balance Due:', f"BDT {balance:,.2f}"])

    summary_table = Table(summary_data, colWidths=[65, 150, 65, 30, 70, 70])
    summary_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (4, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (4, -2), (-1, -1), 'Helvetica-Bold'),
        ('LINEABOVE', (4, 0), (-1, 0), 1, colors.HexColor('#aa8453')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 8 * mm))

    # Payments section
    payments = Payment.objects.filter(booking=booking, status='COMPLETED').order_by('paid_at')
    if payments.exists():
        elements.append(Paragraph("Payments Received", heading_style))
        pay_data = [['Date', 'Method', 'Transaction ID', 'Amount']]
        for p in payments:
            label = 'Refund' if getattr(p, 'is_refund', False) else p.get_payment_method_display()
            pay_data.append([
                p.paid_at.strftime('%Y-%m-%d %H:%M') if p.paid_at else str(p.created_at.date()),
                label,
                p.transaction_id or '—',
                f"{'-' if getattr(p, 'is_refund', False) else ''}BDT {p.amount:,.2f}",
            ])
        pay_table = Table(pay_data, colWidths=[90, 80, 140, 80])
        pay_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#555555')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dddddd')),
            ('ALIGN', (3, 0), (3, -1), 'RIGHT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(pay_table)

    # Footer
    elements.append(Spacer(1, 10 * mm))
    if duplicate:
        sig_data = [
            ['_________________________', '_________________________'],
            ['Guest Signature', 'Front Office Manager'],
        ]
        sig_table = Table(sig_data, colWidths=[230, 230])
        sig_table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('TOPPADDING', (0, 0), (-1, 0), 12),
        ]))
        elements.append(sig_table)
        elements.append(Spacer(1, 6 * mm))
        elements.append(Paragraph(
            "This is a computer-generated duplicate invoice. VAT Registration No: XXXXXXXX. "
            "All disputes subject to Dhaka jurisdiction.",
            small,
        ))
    elements.append(Paragraph("Thank you for choosing Crown Hotel. We hope to see you again!",
                              ParagraphStyle('Footer', parent=normal, fontSize=10,
                                             textColor=colors.HexColor('#aa8453'), alignment=1)))
    elements.append(Spacer(1, 2 * mm))
    if not duplicate:
        elements.append(Paragraph("This is a computer-generated invoice and does not require a signature.", small))

    def on_page(canv, doc):
        if duplicate:
            _invoice_watermark(canv, doc, 'DUPLICATE')
        elif preview:
            _invoice_watermark(canv, doc, 'PREVIEW')

    doc.build(elements, onFirstPage=on_page, onLaterPages=on_page)
    return buf.getvalue()
