import html
import os
from datetime import datetime

from django.conf import settings
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.lib.utils import ImageReader
from reportlab.platypus import (
    Image,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


PAGE_MARGIN = 0.42 * inch
BRAND_ORANGE = colors.HexColor("#E8751A")
BRAND_DARK = colors.HexColor("#243447")


def _text(value):
    """Escape values coming from the database before using them in Paragraphs."""
    return html.escape(str(value or ""))


def _logo_path():
    return os.path.join(settings.BASE_DIR, "documentos", "assets", "logo-topher.jpg")


def _money(value):
    return f"${float(value):,.2f} COP"


def generar_pdf_reserva(reserva, tipo_doc="cotizacion"):
    media_path = os.path.join(settings.MEDIA_ROOT, "pdfs")
    os.makedirs(media_path, exist_ok=True)

    filename = (
        f"{tipo_doc}_{reserva.numero_solicitud}_"
        f"{datetime.now().strftime('%Y%m%d%H%M%S%f')}.pdf"
    )
    file_path = os.path.join(media_path, filename)

    doc = SimpleDocTemplate(
        file_path,
        pagesize=letter,
        rightMargin=PAGE_MARGIN,
        leftMargin=PAGE_MARGIN,
        topMargin=0.78 * inch,
        bottomMargin=0.62 * inch,
        title=f"{tipo_doc.title()} - {reserva.numero_solicitud}",
        author="Topher Producciones",
    )
    styles = getSampleStyleSheet()
    body = ParagraphStyle(
        "CompactBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        spaceAfter=0,
    )
    small = ParagraphStyle(
        "SmallBody",
        parent=body,
        fontSize=8,
        leading=10,
    )
    section = ParagraphStyle(
        "Section",
        parent=body,
        fontName="Helvetica-Bold",
        fontSize=8.2,
        textColor=BRAND_DARK,
        spaceAfter=5,
    )
    title = ParagraphStyle(
        "DocumentTitle",
        parent=body,
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=19,
        textColor=colors.white,
    )
    header_detail = ParagraphStyle(
        "HeaderDetail",
        parent=small,
        textColor=colors.white,
        alignment=2,
    )
    table_header = ParagraphStyle(
        "TableHeader",
        parent=small,
        fontName="Helvetica-Bold",
        textColor=colors.white,
    )

    story = []
    logo_path = _logo_path()
    if os.path.isfile(logo_path):
        logo_reader = ImageReader(logo_path)
        logo_width, logo_height = logo_reader.getSize()
        display_width = 2.45 * inch
        logo = Image(
            logo_path,
            width=display_width,
            height=display_width * logo_height / logo_width,
        )
        logo.hAlign = "LEFT"
    else:
        logo = Paragraph("<b>TOPHER PRODUCCIONES</b>", header_detail)

    company = Paragraph(
        "<b>TOPHER PRODUCCIONES</b><br/>"
        "Puerto Boyacá, Boyacá<br/>"
        "+57 320 733 0859<br/>"
        "thoperPro@gmail.com",
        header_detail,
    )
    header = Table([[logo, company]], colWidths=[3.2 * inch, doc.width - 3.2 * inch])
    header.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.black),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
                ("LINEBELOW", (0, 0), (-1, -1), 3, BRAND_ORANGE),
            ]
        )
    )
    story.extend([header, Spacer(1, 14)])

    titles = {
        "cotizacion": "COTIZACIÓN / PRESUPUESTO",
        "confirmacion": "CONFIRMACIÓN DE RESERVA",
        "servicio_prestado": "COMPROBANTE DE SERVICIO",
    }
    document_meta = Table(
        [[
            Paragraph(titles.get(tipo_doc, "DOCUMENTO"), title),
            Paragraph(
                f"<font color='#E8751A'><b>SOLICITUD</b></font><br/>"
                f"<b>{_text(reserva.numero_solicitud)}</b>",
                header_detail,
            ),
        ]],
        colWidths=[doc.width * 0.68, doc.width * 0.32],
    )
    document_meta.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), BRAND_DARK),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    story.extend([document_meta, Spacer(1, 10)])

    client = Paragraph(
        f"<font color='#E8751A'><b>CLIENTE</b></font><br/><br/>"
        f"<b>{_text(reserva.usuario.nombre_completo)}</b><br/>"
        f"Email: {_text(reserva.usuario.correo)}<br/>"
        f"Teléfono: {_text(reserva.usuario.telefono or 'N/A')}",
        body,
    )
    event = Paragraph(
        f"<font color='#E8751A'><b>DETALLES DEL EVENTO</b></font><br/><br/>"
        f"<b>{_text(reserva.nombre_evento)}</b><br/>"
        f"Fecha: {_text(reserva.fecha_evento)} | Hora: {_text(reserva.hora_evento)}<br/>"
        f"Lugar: {_text(reserva.lugar)}, {_text(reserva.municipio)}<br/>"
        f"Asistentes: {_text(reserva.asistentes)}",
        body,
    )
    details = Table([[client, event]], colWidths=[doc.width / 2, doc.width / 2])
    details.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#D6DCE1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D6DCE1")),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F7F8FA")),
                ("LEFTPADDING", (0, 0), (-1, -1), 11),
                ("RIGHTPADDING", (0, 0), (-1, -1), 11),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    story.extend([
        details,
        Spacer(1, 12),
        Paragraph("RESUMEN DE SERVICIOS", section),
    ])

    service_rows = [
        [
            Paragraph("Descripción del servicio", table_header),
            Paragraph("Cant.", table_header),
            Paragraph("Unidad", table_header),
            Paragraph("Horas", table_header),
            Paragraph("Subtotal", table_header),
        ]
    ]
    total = 0
    for item in reserva.servicios_contratados.select_related("servicio", "tarifa").all():
        service_rows.append(
            [
                Paragraph(
                    f"<b>{_text(item.servicio.nombre)}</b>"
                    + (f"<br/><font size='7'>{_text(item.notas)}</font>" if item.notas else ""),
                    small,
                ),
                Paragraph(_text(item.cantidad), small),
                Paragraph(_text(item.tarifa.unidad), small),
                Paragraph(_text(item.duracion_horas), small),
                Paragraph(_money(item.precio_calculado), small),
            ]
        )
        total += float(item.precio_calculado)

    services = Table(
        service_rows,
        colWidths=[
            doc.width * 0.40,
            doc.width * 0.07,
            doc.width * 0.10,
            doc.width * 0.08,
            doc.width * 0.35,
        ],
        repeatRows=1,
    )
    services.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BRAND_DARK),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("ALIGN", (1, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#9EA7AF")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F7F8FA")]),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(services)

    total_table = Table(
        [[Paragraph("<b>TOTAL A PAGAR</b>", body), Paragraph(f"<b>{_money(total)}</b>", body)]],
        colWidths=[doc.width * 0.68, doc.width * 0.32],
        hAlign="RIGHT",
    )
    total_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFF1E6")),
                ("BOX", (0, 0), (-1, -1), 1, BRAND_ORANGE),
                ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.extend([Spacer(1, 7), total_table])

    if tipo_doc == "confirmacion":
        assignments = reserva.asignaciones_staff.select_related("personal").all()
        if assignments:
            staff_rows = [[
                Paragraph("Personal asignado", table_header),
                Paragraph("Rol", table_header),
                Paragraph("Especialidad", table_header),
            ]]
            for assignment in assignments:
                staff_rows.append(
                    [
                        Paragraph(_text(assignment.personal.nombre), small),
                        Paragraph(_text(assignment.rol_en_evento), small),
                        Paragraph(_text(assignment.personal.especialidad), small),
                    ]
                )
            staff = Table(
                staff_rows,
                colWidths=[doc.width * 0.34, doc.width * 0.31, doc.width * 0.35],
                repeatRows=1,
            )
            staff.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), BRAND_DARK),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#9EA7AF")),
                        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                        ("TOPPADDING", (0, 0), (-1, -1), 4),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ]
                )
            )
            story.extend([Spacer(1, 7), staff])

    if tipo_doc == "servicio_prestado":
        story.extend(
            [
                Spacer(1, 6),
                Paragraph(
                    f"<b>SERVICIO PRESTADO:</b> {_text(reserva.nombre_evento)} | "
                    f"{_text(reserva.fecha_evento)} {_text(reserva.hora_evento)} | "
                    f"{_text(reserva.lugar)}, {_text(reserva.municipio)}",
                    small,
                ),
            ]
        )

    if reserva.observaciones:
        story.extend(
            [
                Spacer(1, 6),
                Paragraph(f"<b>OBSERVACIONES:</b> {_text(reserva.observaciones)}", small),
            ]
        )

    terms = Paragraph(
        "<b>TÉRMINOS Y CONDICIONES</b><br/>"
        "1. Cotización válida por 15 días desde su generación. "
        "2. Para confirmar el evento se requiere un anticipo del 50%. "
        "3. Las cancelaciones se rigen por las políticas vigentes.",
        small,
    )
    signatures = Table(
        [
            ["____________________________", "____________________________"],
            ["Firma autorizada Topher", "Aceptado por el cliente"],
        ],
        colWidths=[doc.width / 2, doc.width / 2],
    )
    signatures.setStyle(
        TableStyle(
            [
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("FONTSIZE", (0, 1), (-1, 1), 7.5),
                ("TEXTCOLOR", (0, 1), (-1, 1), BRAND_DARK),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )
    story.append(KeepTogether([Spacer(1, 12), terms, Spacer(1, 14), signatures]))

    def draw_page_chrome(canvas, document):
        canvas.saveState()
        page_width, page_height = letter
        canvas.setStrokeColor(BRAND_ORANGE)
        canvas.setLineWidth(0.7)
        canvas.line(PAGE_MARGIN, 0.48 * inch, page_width - PAGE_MARGIN, 0.48 * inch)
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(BRAND_DARK)
        canvas.drawString(PAGE_MARGIN, 0.29 * inch, "Topher Producciones - Efectos especiales para eventos")
        canvas.drawRightString(page_width - PAGE_MARGIN, 0.29 * inch, f"Página {document.page}")

        if document.page > 1:
            canvas.setFont("Helvetica-Bold", 8)
            canvas.drawString(
                PAGE_MARGIN,
                page_height - 0.39 * inch,
                f"TOPHER PRODUCCIONES  |  {reserva.numero_solicitud}",
            )
            canvas.setStrokeColor(BRAND_ORANGE)
            canvas.line(
                PAGE_MARGIN,
                page_height - 0.52 * inch,
                page_width - PAGE_MARGIN,
                page_height - 0.52 * inch,
            )
        canvas.restoreState()

    doc.build(story, onFirstPage=draw_page_chrome, onLaterPages=draw_page_chrome)
    return f"/media/pdfs/{filename}"
