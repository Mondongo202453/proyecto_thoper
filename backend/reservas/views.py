from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.conf import settings
import datetime

from .models import Reserva, ReservationService, StatusHistory
from .serializers import ReservaSerializer, ReservationServiceSerializer


# ─────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────
# Mapa de transiciones válidas (flujo RF17)
TRANSICIONES_VALIDAS = {
    4: [5, 7],   # Pendiente → Confirmada | Cancelada
    5: [6, 7],   # Confirmada → En Proceso | Cancelada
    6: [8],      # En Proceso → Completada
    8: [],       # Completada (terminal)
    7: [],       # Cancelada (terminal)
}
# IDs de status según topher_db.sql:
# 4=Pendiente, 5=Confirmada, 6=En Proceso, 7=Cancelada, 8=Completada
STATUS_LABELS = {4: 'Pendiente', 5: 'Confirmada', 6: 'En Proceso', 7: 'Cancelada', 8: 'Completada'}
ESTADOS_ACTIVOS = [4, 5, 6]


class ReservaViewSet(viewsets.ModelViewSet):
    serializer_class = ReservaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Reserva.objects.all().select_related('status', 'usuario').prefetch_related(
            'servicios_contratados__servicio', 'servicios_contratados__tarifa'
        ).order_by('-creado_en')

        if user.role_id != 1:  # No es admin
            qs = qs.filter(usuario=user)

        # Filtros opcionales (para el admin)
        status_id = self.request.query_params.get('status_id')
        if status_id:
            qs = qs.filter(status_id=status_id)

        fecha_desde = self.request.query_params.get('fecha_desde')
        if fecha_desde:
            qs = qs.filter(fecha_evento__gte=fecha_desde)

        fecha_hasta = self.request.query_params.get('fecha_hasta')
        if fecha_hasta:
            qs = qs.filter(fecha_evento__lte=fecha_hasta)

        usuario_id = self.request.query_params.get('usuario_id')
        if usuario_id and user.role_id == 1:
            qs = qs.filter(usuario_id=usuario_id)

        return qs

    # ── Cambiar estado (RF17, RN06) ──────────────────────────────────
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def cambiar_estado(self, request, pk=None):
        reserva = self.get_object()
        nuevo_status_id = request.data.get('status_id')
        notas_internas = request.data.get('notas_internas', '')

        if nuevo_status_id is None:
            return Response({'detail': 'status_id es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        nuevo_status_id = int(nuevo_status_id)
        status_actual = reserva.status_id
        transiciones = TRANSICIONES_VALIDAS.get(status_actual, [])

        if nuevo_status_id not in transiciones:
            return Response(
                {'detail': f"Transición inválida: {STATUS_LABELS.get(status_actual)} → {STATUS_LABELS.get(nuevo_status_id, '?')}."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # RN06: No confirmar sin personal asignado
        if nuevo_status_id == 5:
            from personal.models import StaffAssignment
            tiene_personal = StaffAssignment.objects.filter(reserva=reserva).exists()
            if not tiene_personal:
                return Response(
                    {'detail': 'No se puede confirmar la reserva sin al menos un miembro del personal asignado (RN06).'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Guardar historial
        StatusHistory.objects.create(
            entity_type='reserva',
            entity_id=reserva.id,
            status_anterior_id=status_actual,
            status_nuevo_id=nuevo_status_id,
            cambiado_por=request.user
        )

        # Actualizar estado
        reserva.status_id = nuevo_status_id
        if notas_internas:
            reserva.notas_internas = notas_internas
        reserva.save()

        # Generar PDF y notificar según el nuevo estado
        self._procesar_cambio_estado(reserva, nuevo_status_id)

        serializer = ReservaSerializer(reserva, context={'request': request})
        return Response(serializer.data)

    def _procesar_cambio_estado(self, reserva, nuevo_status_id):
        """Genera PDFs y envía notificaciones al cambiar estado (RF26, RF27, RF28)"""
        from documentos.utils import generar_pdf_reserva
        from documentos.models import Cotizacion
        from comunicacion.utils import enviar_correo_con_pdf
        from comunicacion.models import Notificacion

        tipo_doc = None
        asunto = None

        if nuevo_status_id == 5:  # Confirmada (RF26)
            tipo_doc = 'confirmacion'
            asunto = f"¡Reserva Confirmada! — {reserva.numero_solicitud}"
            cuerpo = (
                f"Hola {reserva.usuario.nombre_completo},\n\n"
                f"Tu reserva para el evento '{reserva.nombre_evento}' ha sido CONFIRMADA.\n"
                f"Fecha: {reserva.fecha_evento} a las {reserva.hora_evento}\n"
                f"Lugar: {reserva.lugar}, {reserva.municipio}\n\n"
                f"Adjuntamos el comprobante de confirmación.\n\nEquipo Topher Producciones."
            )
        elif nuevo_status_id == 8:  # Completada (RF27)
            tipo_doc = 'servicio_prestado'
            asunto = f"Servicio Completado — {reserva.numero_solicitud}"
            cuerpo = (
                f"Hola {reserva.usuario.nombre_completo},\n\n"
                f"El servicio para tu evento '{reserva.nombre_evento}' ha sido COMPLETADO exitosamente.\n\n"
                f"Adjuntamos el comprobante de servicio prestado.\n\nEquipo Topher Producciones."
            )
        elif nuevo_status_id == 7:  # Cancelada
            asunto = f"Reserva Cancelada — {reserva.numero_solicitud}"
            cuerpo = (
                f"Hola {reserva.usuario.nombre_completo},\n\n"
                f"Tu reserva '{reserva.nombre_evento}' ha sido cancelada.\n\n"
                f"Si tienes preguntas, contáctanos.\n\nEquipo Topher Producciones."
            )

        if tipo_doc:
            try:
                pdf_url = generar_pdf_reserva(reserva, tipo_doc=tipo_doc)
                Cotizacion.objects.create(
                    reserva=reserva,
                    tipo=tipo_doc,
                    monto_total=sum(float(s.precio_calculado) for s in reserva.servicios_contratados.all()),
                    url_pdf=pdf_url,
                    generado_por=f"sistema-estado-{nuevo_status_id}"
                )
                if asunto:
                    enviar_correo_con_pdf(reserva.usuario.correo, asunto, cuerpo, pdf_url)
            except Exception as e:
                print(f"[WARN] Error generando PDF estado {nuevo_status_id}: {e}")
        elif asunto:
            try:
                enviar_correo_con_pdf(reserva.usuario.correo, asunto, cuerpo, None)
            except Exception as e:
                print(f"[WARN] Error enviando correo cancelación: {e}")

        # Registrar notificación en sistema (RF28)
        if asunto:
            try:
                Notificacion.objects.create(
                    usuario=reserva.usuario,
                    reserva=reserva,
                    tipo='sistema',
                    asunto=asunto,
                    mensaje=f"Tu reserva {reserva.numero_solicitud} cambió a estado: {STATUS_LABELS.get(nuevo_status_id, '')}."
                )
            except Exception as e:
                print(f"[WARN] Error registrando notificación: {e}")

    # ── Cancelar reserva (RF18, RN01) ────────────────────────────────
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def cancelar(self, request, pk=None):
        reserva = self.get_object()
        user = request.user

        # Solo el dueño de la reserva o el admin puede cancelar
        if user.role_id != 1 and reserva.usuario != user:
            return Response({'detail': 'No tienes permiso para cancelar esta reserva.'}, status=status.HTTP_403_FORBIDDEN)

        # RN01: Solo Pendiente o Confirmada
        if reserva.status_id not in [4, 5]:
            return Response(
                {'detail': f"No puedes cancelar una reserva en estado '{STATUS_LABELS.get(reserva.status_id, reserva.status_id)}'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # RN01: Más de 72 horas de anticipación (solo aplica al usuario, no al admin)
        if user.role_id != 1:
            fecha_hora_evento = datetime.datetime.combine(
                reserva.fecha_evento,
                reserva.hora_evento,
                tzinfo=timezone.get_current_timezone()
            )
            ahora = timezone.now()
            diferencia_horas = (fecha_hora_evento - ahora).total_seconds() / 3600

            if diferencia_horas < 72:
                return Response(
                    {'detail': 'Solo puedes cancelar con más de 72 horas de anticipación. Contacta directamente a la empresa.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        motivo = request.data.get('motivo', '')
        StatusHistory.objects.create(
            entity_type='reserva',
            entity_id=reserva.id,
            status_anterior_id=reserva.status_id,
            status_nuevo_id=7,  # Cancelada
            cambiado_por=user
        )

        reserva.status_id = 7  # Cancelada
        reserva.cancelado_en = timezone.now()
        reserva.motivo_cancelacion = motivo
        reserva.save()

        self._procesar_cambio_estado(reserva, 7)

        return Response({'detail': 'Reserva cancelada correctamente.'})

    # ── Descargar documentos (RF25-RF27) ────────────────────────────
    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def documentos(self, request, pk=None):
        """Listar documentos PDF de una reserva"""
        reserva = self.get_object()
        user = request.user
        if user.role_id != 1 and reserva.usuario != user:
            return Response({'detail': 'Sin permiso.'}, status=status.HTTP_403_FORBIDDEN)

        from documentos.models import Cotizacion
        from documentos.serializers import CotizacionSerializer
        docs = Cotizacion.objects.filter(reserva=reserva).order_by('-generado_en')
        return Response([{'tipo': d.tipo, 'url_pdf': d.url_pdf, 'generado_en': d.generado_en} for d in docs])


class ReservationServiceViewSet(viewsets.ModelViewSet):
    queryset = ReservationService.objects.all()
    serializer_class = ReservationServiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role_id == 1:
            return ReservationService.objects.all()
        return ReservationService.objects.filter(reserva__usuario=user)
