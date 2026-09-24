import html
import os
from datetime import datetime

from django.conf import settings
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Image,
    KeepInFrame,
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
    project_root = os.path.dirname(settings.BASE_DIR)
    return os.path.join(project_root, "frontend", "public", "img", "logo-topher.jpg")


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
        topMargin=PAGE_MARGIN,
        bottomMargin=PAGE_MARGIN,
        title=f"{tipo_doc.title()} - {reserva.numero_solicitud}",
        author="Topher Producciones",
    )
    styles = getSampleStyleSheet()
    body = ParagraphStyle(
        "CompactBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.3,
        leading=10,
        spaceAfter=0,
    )
    small = ParagraphStyle(
        "SmallBody",
        parent=body,
        fontSize=7.3,
        leading=8.5,
    )
    section = ParagraphStyle(
        "Section",
        parent=body,
        fontName="Helvetica-Bold",
        fontSize=8.2,
        textColor=BRAND_DARK,
        spaceAfter=3,
    )
    title = ParagraphStyle(
        "DocumentTitle",
        parent=body,
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=15,
        alignment=1,
        textColor=BRAND_DARK,
        spaceAfter=7,
    )

    story = []
    logo_path = _logo_path()
    if os.path.isfile(logo_path):
        logo = Image(logo_path, width=2.2 * inch, height=0.53 * inch)
        logo.hAlign = "LEFT"
    else:
        logo = Paragraph("<b>TOPHER PRODUCCIONES</b>", title)

    company = Paragraph(
        "<b>Topher Producciones</b><br/>"
        "NIT: 123.456.789-0<br/>"
        "Calle Falsa 123, Medellín, Antioquia<br/>"
        "Tel: +57 300 000 0000 | contacto@topher.com",
        small,
    )
    header = Table([[logo, company]], colWidths=[2.8 * inch, 4.0 * inch])
    header.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, 0), colors.black),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LINEBELOW", (0, 0), (-1, -1), 2, BRAND_ORANGE),
            ]
        )
    )
    story.extend([header, Spacer(1, 9)])

    titles = {
        "cotizacion": "COTIZACIÓN / PRESUPUESTO",
        "confirmacion": "CONFIRMACIÓN DE RESERVA",
        "servicio_prestado": "COMPROBANTE DE SERVICIO",
    }
    story.append(Paragraph(titles.get(tipo_doc, "DOCUMENTO"), title))

    client = Paragraph(
        f"<b>CLIENTE</b><br/>"
        f"Nombre: {_text(reserva.usuario.nombre_completo)}<br/>"
        f"Email: {_text(reserva.usuario.correo)}<br/>"
        f"Teléfono: {_text(reserva.usuario.telefono or 'N/A')}",
        body,
    )
    event = Paragraph(
        f"<b>DETALLES DEL EVENTO</b><br/>"
        f"Solicitud: {_text(reserva.numero_solicitud)}<br/>"
        f"Evento: {_text(reserva.nombre_evento)}<br/>"
        f"Fecha: {_text(reserva.fecha_evento)} | Hora: {_text(reserva.hora_evento)}<br/>"
        f"Lugar: {_text(reserva.lugar)}, {_text(reserva.municipio)}<br/>"
        f"Asistentes: {_text(reserva.asistentes)}",
        body,
    )
    details = Table([[client, event]], colWidths=[3.35 * inch, 3.45 * inch])
    details.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#D6DCE1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D6DCE1")),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F7F8FA")),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.extend([details, Spacer(1, 9)])

    service_rows = [
        [
            Paragraph("<b>Descripción del servicio</b>", small),
            Paragraph("<b>Cant.</b>", small),
            Paragraph("<b>Unidad</b>", small),
            Paragraph("<b>Horas</b>", small),
            Paragraph("<b>Subtotal</b>", small),
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
        colWidths=[2.75 * inch, 0.52 * inch, 0.72 * inch, 0.62 * inch, 1.72 * inch],
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
        colWidths=[5.15 * inch, 1.18 * inch],
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
                Paragraph("<b>Personal asignado</b>", small),
                Paragraph("<b>Rol</b>", small),
                Paragraph("<b>Especialidad</b>", small),
            ]]
            for assignment in assignments:
                staff_rows.append(
                    [
                        Paragraph(_text(assignment.personal.nombre), small),
                        Paragraph(_text(assignment.rol_en_evento), small),
                        Paragraph(_text(assignment.personal.especialidad), small),
                    ]
                )
            staff = Table(staff_rows, colWidths=[2.3 * inch, 2.1 * inch, 2.3 * inch])
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
        colWidths=[3.4 * inch, 3.4 * inch],
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
    story.extend([Spacer(1, 8), terms, Spacer(1, 11), signatures])

    # Shrink only when unusually long service/observation data would overflow.
    compact_story = KeepInFrame(
        maxWidth=doc.width,
        maxHeight=doc.height,
        content=story,
        mode="shrink",
    )
    doc.build([compact_story])
    return f"/media/pdfs/{filename}"
