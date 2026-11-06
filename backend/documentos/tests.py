import os
import tempfile
from datetime import date, time
from decimal import Decimal
from types import SimpleNamespace

from django.test import SimpleTestCase, override_settings

from .utils import _logo_path, generar_pdf_reserva


class GenerarPdfReservaTests(SimpleTestCase):
    def test_logo_esta_empaquetado_con_el_backend(self):
        self.assertTrue(os.path.isfile(_logo_path()))

    def test_generar_pdf_con_logo_y_datos_de_reserva(self):
        servicio = SimpleNamespace(
            servicio=SimpleNamespace(nombre="Efectos especiales"),
            tarifa=SimpleNamespace(unidad="show"),
            cantidad=1,
            duracion_horas=Decimal("2"),
            precio_calculado=Decimal("350000"),
            notas="",
        )
        reserva = SimpleNamespace(
            numero_solicitud="TOPHER-2026-001",
            usuario=SimpleNamespace(
                nombre_completo="Cliente de prueba",
                correo="cliente@example.com",
                telefono="3001234567",
            ),
            fecha_evento=date(2026, 12, 1),
            hora_evento=time(18, 0),
            nombre_evento="Evento de prueba",
            lugar="Teatro principal",
            municipio="Puerto Boyacá",
            asistentes=100,
            servicios_contratados=SimpleNamespace(
                select_related=lambda *args: SimpleNamespace(all=lambda: [servicio])
            ),
            observaciones="",
        )

        with tempfile.TemporaryDirectory() as media_root:
            with override_settings(MEDIA_ROOT=media_root):
                pdf_url = generar_pdf_reserva(reserva)
                pdf_path = os.path.join(
                    media_root,
                    pdf_url.removeprefix("/media/").replace("/", os.sep),
                )
                with open(pdf_path, "rb") as pdf_file:
                    self.assertTrue(pdf_file.read(5).startswith(b"%PDF-"))

# Create your tests here.
