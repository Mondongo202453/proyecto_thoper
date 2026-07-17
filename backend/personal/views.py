from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.mail import send_mail
from django.conf import settings as django_settings

from .models import Personal, StaffAssignment
from .serializers import PersonalSerializer, StaffAssignmentSerializer


class PersonalViewSet(viewsets.ModelViewSet):
    queryset = Personal.objects.all().order_by('nombre')
    serializer_class = PersonalSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]

    def get_queryset(self):
        qs = Personal.objects.all().order_by('nombre')
        activo = self.request.query_params.get('activo')
        if activo is not None:
            qs = qs.filter(activo=activo.lower() == 'true')
        especialidad = self.request.query_params.get('especialidad')
        if especialidad:
            qs = qs.filter(especialidad__icontains=especialidad)
        return qs

    @action(detail=True, methods=['patch'], permission_classes=[permissions.IsAdminUser])
    def toggle_activo(self, request, pk=None):
        """Activar/desactivar personal (RF20)"""
        miembro = self.get_object()
        miembro.activo = not miembro.activo
        miembro.save(update_fields=['activo'])
        estado = 'activado' if miembro.activo else 'desactivado'
        return Response({'detail': f"Personal {estado} correctamente.", 'activo': miembro.activo})


class StaffAssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = StaffAssignmentSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role_id == 1:  # Admin
            qs = StaffAssignment.objects.select_related(
                'personal', 'reserva'
            ).all().order_by('-fecha_asignacion')
            reserva_id = self.request.query_params.get('reserva_id')
            if reserva_id:
                qs = qs.filter(reserva_id=reserva_id)
            return qs
        # RF24: Staff solo ve sus propias asignaciones
        if user.role_id == 3:
            return StaffAssignment.objects.filter(personal__usuario=user).select_related(
                'personal', 'reserva__usuario', 'reserva__status'
            ).order_by('reserva__fecha_evento')
        return StaffAssignment.objects.none()

    def create(self, request, *args, **kwargs):
        """RF22, RN04: Verificar conflicto de asignación antes de crear"""
        personal_id = request.data.get('personal')
        reserva_id = request.data.get('reserva')

        if personal_id and reserva_id:
            from reservas.models import Reserva
            from reservas.views import validar_conflicto_asignacion
            try:
                reserva_nueva = Reserva.objects.get(id=reserva_id)
            except Reserva.DoesNotExist:
                return Response({'detail': 'Reserva no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

            conflicto, mensaje = validar_conflicto_asignacion(
                personal_id,
                reserva_nueva,
                queryset=StaffAssignment.objects.filter(
                    personal_id=personal_id,
                    reserva__fecha_evento=reserva_nueva.fecha_evento,
                    reserva__hora_evento=reserva_nueva.hora_evento,
                    reserva__status_id__in=[4, 5, 6],
                ).exclude(reserva_id=reserva_id)
            )

            if conflicto:
                return Response(
                    {'detail': f"{mensaje} No se puede asignar a dos eventos con la misma fecha y hora (RN04)."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        response = super().create(request, *args, **kwargs)

        # RF23: Notificar al personal por correo al ser asignado
        if response.status_code == 201:
            self._notificar_personal_asignado(personal_id, reserva_id)

        return response

    def _notificar_personal_asignado(self, personal_id, reserva_id):
        """RF23: Enviar correo al personal cuando es asignado a un evento"""
        try:
            from reservas.models import Reserva
            personal = Personal.objects.get(id=personal_id)
            reserva = Reserva.objects.get(id=reserva_id)
            assignment = StaffAssignment.objects.get(personal=personal, reserva=reserva)

            send_mail(
                subject=f"Nueva Asignación de Evento — {reserva.nombre_evento}",
                message=(
                    f"Hola {personal.nombre},\n\n"
                    f"Has sido asignado al siguiente evento:\n\n"
                    f"📅 Evento: {reserva.nombre_evento}\n"
                    f"📆 Fecha: {reserva.fecha_evento} a las {reserva.hora_evento}\n"
                    f"📍 Lugar: {reserva.lugar}, {reserva.municipio}\n"
                    f"🎭 Tu rol en el evento: {assignment.rol_en_evento}\n\n"
                    f"Por favor confirma tu disponibilidad. Si tienes preguntas, contacta al administrador.\n\n"
                    f"Equipo Topher Producciones."
                ),
                from_email=django_settings.DEFAULT_FROM_EMAIL,
                recipient_list=[personal.correo],
                fail_silently=True,
            )
        except Exception as e:
            print(f"[WARN] No se pudo enviar correo al personal: {e}")
