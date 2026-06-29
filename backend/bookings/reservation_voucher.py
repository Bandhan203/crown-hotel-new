"""Reservation confirmation voucher PDF generation."""
import io
from datetime import date

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .models import Booking


def _sym(currency: str) -> str:
    return 'USD' if currency == 'USD' else 'BDT'


def generate_reservation_confirmation_pdf(booking: Booking) -> bytes:
    """Generate a printable reservation confirmation voucher. Returns PDF bytes."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'ConfTitle',
        parent=styles['Title'],
        fontSize=20,
        textColor=colors.HexColor('#004349'),
        spaceAfter=2 * mm,
    )
    heading_style = ParagraphStyle(
        'SectionHead',
        parent=styles['Heading2'],
        fontSize=11,
        textColor=colors.HexColor('#333333'),
        spaceBefore=4 * mm,
        spaceAfter=2 * mm,
    )
    normal = styles['Normal']
    small = ParagraphStyle('Small', parent=normal, fontSize=8, textColor=colors.grey)

    currency = getattr(booking, 'currency', 'BDT') or 'BDT'
    sym = _sym(currency)

    elements = []
    elements.append(Paragraph('CROWN HOTEL', title_style))
    elements.append(Paragraph(
        'Reservation Confirmation',
        ParagraphStyle('Sub', parent=normal, fontSize=14, textColor=colors.HexColor('#666666')),
    ))
    elements.append(Spacer(1, 4 * mm))

    billing_note = 'Company Payment' if booking.company_name else 'Guest Account'
    if booking.is_travel_agency:
        billing_note = 'Travel Agency / Agent Billing'

    info_data = [
        ['Confirmation No:', booking.booking_ref, 'Date:', date.today().strftime('%B %d, %Y')],
        ['Guest:', booking.guest.full_name, 'Email:', booking.guest.email],
        ['Phone:', booking.guest.phone or '—', 'Status:', booking.get_status_display()],
        ['Arrival:', str(booking.check_in_date), 'Departure:', str(booking.check_out_date)],
        ['Nights:', str(booking.nights), 'Rooms:', str(booking.num_rooms)],
        ['Room Type:', booking.room_type.name, 'Room No:', booking.room.room_number if booking.room else 'TBA'],
        ['Adults:', str(booking.adults), 'Children:', str(booking.children)],
        ['Currency:', currency, 'Billing:', billing_note],
    ]
    if booking.company_name:
        info_data.append(['Company:', booking.company_name, 'Contact:', booking.contact_person or '—'])
    if booking.arrival_time:
        info_data.append(['ETA:', booking.arrival_time.strftime('%H:%M'), '', ''])

    info_table = Table(info_data, colWidths=[85, 155, 70, 155])
    info_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.grey),
        ('TEXTCOLOR', (2, 0), (2, -1), colors.grey),
        ('FONTNAME', (1, 0), (1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 6 * mm))

    elements.append(Paragraph('Rate Summary', heading_style))
    rate_data = [
        ['Description', 'Amount'],
        [f'Room rate ({booking.nights} night(s) × {booking.num_rooms} room(s))', f'{sym} {booking.total_price:,.2f}'],
    ]
    if booking.discount_amount and float(booking.discount_amount) > 0:
        rate_data.append(['Discount', f'- {sym} {booking.discount_amount:,.2f}'])
    if booking.tax_amount and float(booking.tax_amount) > 0:
        rate_data.append(['Tax & service', f'{sym} {booking.tax_amount:,.2f}'])
    rate_data.append(['Grand Total', f'{sym} {booking.grand_total:,.2f}'])

    rate_table = Table(rate_data, colWidths=[320, 140])
    rate_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#004349')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('LINEABOVE', (0, -1), (-1, -1), 1, colors.grey),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(rate_table)

    if booking.special_requests:
        elements.append(Spacer(1, 4 * mm))
        elements.append(Paragraph('Special Requests', heading_style))
        elements.append(Paragraph(booking.special_requests, normal))

    elements.append(Spacer(1, 8 * mm))
    elements.append(Paragraph(
        'Please present this confirmation at check-in. '
        'Room assignment is subject to availability unless a specific room number is confirmed above.',
        small,
    ))
    elements.append(Spacer(1, 2 * mm))
    elements.append(Paragraph('Thank you for choosing Crown Hotel.', small))

    doc.build(elements)
    return buf.getvalue()
