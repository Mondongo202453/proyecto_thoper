import os
from django.conf import settings
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from datetime import datetime

def generar_pdf_reserva(reserva, tipo_doc='cotizacion'):
    # Asegurar que el directorio media existe
    media_path = os.path.join(settings.MEDIA_ROOT, 'pdfs')
    if not os.path.exists(media_path):
        os.makedirs(media_path, exist_ok=True)

    filename = f"{tipo_doc}_{reserva.numero_solicitud}_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
    file_path = os.path.join(media_path, filename)
    
    doc = SimpleDocTemplate(file_path, pagesize=letter)
    styles = getSampleStyleSheet()
    
    # Estilos personalizados
    title_style = ParagraphStyle('TitleStyle', parent=styles['Heading1'], alignment=1, spaceAfter=20)
    info_style = styles['Normal']
    
    elements = []
    
    # Encabezado con Logo (Texto por ahora) y Datos de la Empresa
    elements.append(Paragraph("TOPHER PRODUCCIONES", title_style))
    
    empresa_info = """
    <b>NIT:</b> 123.456.789-0<br/>
    <b>Dirección:</b> Calle Falsa 123, Medellín, Antioquia<br/>
    <b>Teléfono:</b> +57 300 000 0000<br/>
    <b>Email:</b> contacto@topher.com
    """
    elements.append(Paragraph(empresa_info, styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # Línea divisoria
    elements.append(Table([[""]], colWidths=[500], style=[('LINEBELOW', (0,0), (-1,-1), 1, colors.black)]))
    elements.append(Spacer(1, 10))
    
    # Título del documento dinámico
    titulos = {
        'cotizacion': 'COTIZACIÓN / PRESUPUESTO',
        'confirmacion': 'CONFIRMACIÓN DE RESERVA',
        'servicio_prestado': 'FACTURA DE VENTA / COMPROBANTE'
    }
    elements.append(Paragraph(titulos.get(tipo_doc, 'DOCUMENTO'), ParagraphStyle('Header', parent=styles['Heading2'], alignment=1)))
    elements.append(Spacer(1, 20))
    
    # Datos del Cliente y Reserva en dos columnas
    client_data = [
        [Paragraph(f"<b>CLIENTE:</b>", info_style), Paragraph(f"<b>DETALLES DEL EVENTO:</b>", info_style)],
        [Paragraph(f"Nombre: {reserva.usuario.nombre_completo}", info_style), 
         Paragraph(f"Solicitud: {reserva.numero_solicitud}", info_style)],
        [Paragraph(f"Email: {reserva.usuario.correo}", info_style), 
         Paragraph(f"Nombre Evento: {reserva.nombre_evento}", info_style)],
        [Paragraph(f"Teléfono: {reserva.usuario.telefono or 'N/A'}", info_style), 
         Paragraph(f"Fecha: {reserva.fecha_evento}", info_style)],
        [Paragraph("", info_style), 
         Paragraph(f"Lugar: {reserva.lugar}, {reserva.municipio}", info_style)],
    ]
    
    t_client = Table(client_data, colWidths=[250, 250])
    t_client.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (1,0), 0.5, colors.white), # Solo para espaciar
    ]))
    elements.append(t_client)
    elements.append(Spacer(1, 25))
    
    # Tabla de Servicios (Diseño Premium)
    headers = ['Descripción del Servicio', 'Cant.', 'Unidad', 'Horas', 'Subtotal']
    data_servicios = [headers]
    
    total = 0
    for item in reserva.servicios_contratados.all():
        data_servicios.append([
            Paragraph(f"<b>{item.servicio.nombre}</b><br/><font size=8>{item.notas or ''}</font>", info_style),
            str(item.cantidad),
            item.tarifa.unidad,
            str(item.duracion_horas),
            f"${item.precio_calculado:,.2f}"
        ])
        total += float(item.precio_calculado)
    
    t_servicios = Table(data_servicios, colWidths=[220, 50, 60, 60, 110])
    t_servicios.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#2C3E50")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.3, colors.black),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(t_servicios)
    
    # Sección de Totales
    elements.append(Spacer(1, 15))
    
    total_data = [
        ["", "", "<b>TOTAL A PAGAR:</b>", f"<b>${total:,.2f} COP</b>"]
    ]
    t_total = Table(total_data, colWidths=[220, 50, 120, 110])
    t_total.setStyle(TableStyle([
        ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
        ('ALIGN', (3, 0), (3, 0), 'RIGHT'),
        ('FONTSIZE', (2, 0), (3, 0), 12),
        ('BACKGROUND', (2, 0), (3, 0), colors.HexColor("#ECF0F1")),
        ('BOX', (2, 0), (3, 0), 1, colors.black),
    ]))
    elements.append(t_total)
    
    # Notas Legales y Observaciones
    if reserva.observaciones:
        elements.append(Spacer(1, 30))
        elements.append(Paragraph("<b>OBSERVACIONES ADICIONALES:</b>", styles['Normal']))
        elements.append(Paragraph(reserva.observaciones, styles['Normal']))
    
    terms = """
    <br/><br/>
    <b>Términos y Condiciones:</b><br/>
    1. Esta cotización es válida por 15 días a partir de la fecha de generación.<br/>
    2. Para confirmar el evento se requiere el pago del 50% por anticipado.<br/>
    3. En caso de cancelación, se aplicarán las políticas vigentes de la empresa.
    """
    elements.append(Paragraph(terms, ParagraphStyle('Terms', parent=styles['Normal'], fontSize=8)))
    
    # Área de Firmas
    elements.append(Spacer(1, 60))
    signature_data = [
        ["__________________________", "__________________________"],
        ["Firma Autorizada Topher", "Aceptado por el Cliente"]
    ]
    t_sig = Table(signature_data, colWidths=[250, 250])
    t_sig.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTSIZE', (0,1), (-1,1), 9),
    ]))
    elements.append(t_sig)

    doc.build(elements)
    
    return f"/media/pdfs/{filename}"
