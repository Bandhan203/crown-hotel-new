"""Reservation Control Chart PDF — daily occupied rooms by category."""
import io
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .models import HotelConfig
from .services import get_reservation_control_report


def _fmt_date(iso: str) -> str:
    d = datetime.strptime(iso, '%Y-%m-%d')
    return d.strftime('%d-%b-%Y')


def generate_reservation_control_pdf(start_date, end_date, include_overbooking=False) -> bytes:
    data = get_reservation_control_report(start_date, end_date, include_overbooking)
    config = HotelConfig.load()
    hotel_name = config.hotel_name or 'Hotel Crown'

    room_types = data['room_types']
    dates = data['dates']
    daily_summary = data['daily_summary']
    total_physical = sum(rt['physical_rooms'] for rt in room_types) or daily_summary.get(
        dates[0], {}
    ).get('physical_rooms', 0)

    now = datetime.now()
    print_date = now.strftime('%d-%b-%Y')
    print_time = now.strftime('%I:%M:%S %p').lower()

    buf = io.BytesIO()
    page_size = landscape(A4) if len(room_types) > 4 else A4
    doc = SimpleDocTemplate(
        buf,
        pagesize=page_size,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
        leftMargin=12 * mm,
        rightMargin=12 * mm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'RCTitle',
        parent=styles['Title'],
        fontSize=16,
        alignment=TA_CENTER,
        spaceAfter=2 * mm,
        fontName='Helvetica-Bold',
    )
    subtitle_style = ParagraphStyle(
        'RCSubtitle',
        parent=styles['Normal'],
        fontSize=10,
        alignment=TA_CENTER,
        spaceAfter=1 * mm,
    )
    meta_style = ParagraphStyle(
        'RCMeta',
        parent=styles['Normal'],
        fontSize=8,
        alignment=TA_RIGHT,
        textColor=colors.HexColor('#444444'),
    )

    elements = []

    elements.append(Paragraph(hotel_name.upper(), ParagraphStyle(
        'Hotel', parent=styles['Normal'], fontSize=9, alignment=TA_CENTER, textColor=colors.grey,
    )))
    elements.append(Paragraph('<u>Reservation Control Chart</u>', title_style))
    elements.append(Paragraph(
        f"From {_fmt_date(data['start_date'])} &nbsp;&nbsp; To {_fmt_date(data['end_date'])}",
        subtitle_style,
    ))
    elements.append(Paragraph(
        f'Page 1 of 1 &nbsp;|&nbsp; Print Date: {print_date} &nbsp;|&nbsp; Print Time: {print_time}',
        meta_style,
    ))
    elements.append(Spacer(1, 4 * mm))

    type_headers = [rt['room_type_name'].upper() for rt in room_types]
    header_row = ['DATE', *type_headers, 'TOTAL OCCUPIED', 'CUMULATIVE SUM', 'TOTAL ROOM', 'OCCUPANCY']

    table_data = [header_row]
    cumulative = 0

    for day_str in dates:
        row_types = []
        for rt in room_types:
            cell = next((c for c in rt['cells'] if c['date'] == day_str), None)
            row_types.append(str(cell['committed'] if cell else 0))

        summary = daily_summary.get(day_str, {})
        total_occupied = summary.get('rooms_sold', 0)
        cumulative += total_occupied
        phys = total_physical or summary.get('physical_rooms', 0)
        occupancy = (total_occupied / phys * 100) if phys else 0

        table_data.append([
            _fmt_date(day_str),
            *row_types,
            str(total_occupied),
            str(cumulative),
            str(phys),
            f'{occupancy:.2f}',
        ])

    n_cols = len(header_row)
    page_w = page_size[0] - 24 * mm
    date_w = 22 * mm
    fixed_w = 22 * mm * 4  # last 4 columns
    type_count = max(len(room_types), 1)
    type_w = max(18 * mm, (page_w - date_w - fixed_w) / type_count)

    col_widths = [date_w] + [type_w] * len(room_types) + [22 * mm, 24 * mm, 20 * mm, 20 * mm]

    table = Table(table_data, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a1a1a')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 7),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (0, 1), (0, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#333333')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
    ]))
    elements.append(table)

    doc.build(elements)
    return buf.getvalue()
