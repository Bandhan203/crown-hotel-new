"""Printable guest registration card PDF."""
import io
from datetime import date

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from accounts.models import GuestProfile
from .models import Booking


def generate_registration_card_pdf(booking: Booking) -> bytes:
    """Generate a signable guest registration card. Returns PDF bytes."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'RegTitle',
        parent=styles['Title'],
        fontSize=18,
        textColor=colors.HexColor('#004349'),
        spaceAfter=2 * mm,
    )
    section = ParagraphStyle(
        'Section',
        parent=styles['Heading2'],
        fontSize=10,
        textColor=colors.HexColor('#004349'),
        spaceBefore=4 * mm,
        spaceAfter=2 * mm,
    )
    normal = styles['Normal']
    small = ParagraphStyle('Small', parent=normal, fontSize=8, textColor=colors.grey)

    profile = GuestProfile.objects.filter(user=booking.guest).first()
    guest_name = booking.guest.full_name
    if profile and profile.first_name:
        guest_name = f"{profile.first_name} {profile.last_name}".strip()

    billing_label = 'Company Payment' if booking.billing_type == 'COMPANY' else 'Guest Payment'
    if booking.company_name and booking.billing_type == 'COMPANY':
        billing_label = f'Company Payment — {booking.company_name}'

    elements = [
        Paragraph('CROWN HOTEL', title_style),
        Paragraph('Guest Registration Card', ParagraphStyle('Sub', parent=normal, fontSize=12)),
        Spacer(1, 3 * mm),
    ]

    rows = [
        ['Confirmation No:', booking.booking_ref, 'Date:', date.today().strftime('%d %b %Y')],
        ['Guest Name:', guest_name, 'Email:', booking.guest.email],
        ['Phone:', booking.guest.phone or '—', 'Billing:', billing_label],
        ['Room Type:', booking.room_type.name, 'Room No:', booking.room.room_number if booking.room else 'TBA'],
        ['Arrival:', str(booking.check_in_date), 'Departure:', str(booking.check_out_date)],
        ['Nights:', str(booking.nights), 'PAX:', f"{booking.adults}A / {booking.children}C / {booking.infants}I"],
        ['ID Type:', booking.get_id_type_display() or '—', 'ID No:', booking.id_number or '—'],
        ['Nationality:', profile.nationality if profile else '—', 'Country:', profile.country if profile else '—'],
        ['Purpose:', booking.purpose_of_visit or '—', 'From:', booking.coming_from or '—'],
    ]
    if profile and profile.address_line1:
        rows.append(['Address:', profile.address_line1, '', ''])

    table = Table(rows, colWidths=[85, 155, 70, 155])
    table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.grey),
        ('TEXTCOLOR', (2, 0), (2, -1), colors.grey),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(table)

    elements.append(Paragraph('Rate Summary', section))
    sym = booking.currency or 'BDT'
    rate_rows = [
        ['Description', 'Amount'],
        ['Room rate (stay)', f'{sym} {booking.total_price:,.2f}'],
        ['Grand total', f'{sym} {booking.grand_total:,.2f}'],
        ['Deposit held', f'{sym} {booking.deposit_amount:,.2f}'],
    ]
    rate_table = Table(rate_rows, colWidths=[320, 140])
    rate_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#004349')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(rate_table)

    if booking.special_requests:
        elements.append(Paragraph('Special Requests', section))
        elements.append(Paragraph(booking.special_requests, normal))

    elements.append(Spacer(1, 10 * mm))
    sig_rows = [
        ['Guest Signature', '', 'Front Desk Signature', ''],
        ['', '', '', ''],
        ['Date: _______________', '', 'Checked in by: _______________', ''],
    ]
    sig_table = Table(sig_rows, colWidths=[120, 100, 120, 100], rowHeights=[8 * mm, 14 * mm, 8 * mm])
    sig_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('LINEABOVE', (0, 1), (1, 1), 0.5, colors.black),
        ('LINEABOVE', (2, 1), (3, 1), 0.5, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
    ]))
    elements.append(sig_table)
    elements.append(Spacer(1, 4 * mm))
    elements.append(Paragraph(
        'I confirm that the above information is correct and agree to the hotel terms and conditions.',
        small,
    ))

    doc.build(elements)
    return buf.getvalue()
