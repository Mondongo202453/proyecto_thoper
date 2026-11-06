from decimal import Decimal

from rest_framework import serializers
from django.db import transaction
from django.utils import timezone
from .models import Reserva, ReservationService
from .pricing import calcular_precio_servicio
from .scheduling import hay_conflicto_horario, reservas_activas_en_fecha
from servicios.models import Tarifa
from usuarios.models import Status, Usuario

class ReservationServiceSerializer(serializers.ModelSerializer):
    servicio_nombre = serializers.ReadOnlyField(source='servicio.nombre')

    class Meta:
        model = ReservationService
        fields = '__all__'
        read_only_fields = ('precio_calculado', 'reserva')

class ReservaSerializer(serializers.ModelSerializer):
    servicios_contratados = ReservationServiceSerializer(many=True, required=False)
    duracion_evento = serializers.ChoiceField(
        choices=(1, 2, 3),
        required=False,
        write_only=True,
    )
    # Make status optional on input; default will be applied in create() if not provided
    status = serializers.PrimaryKeyRelatedField(queryset=Status.objects.all(), required=False, allow_null=True)
    status_id = serializers.IntegerField(read_only=True)
    status_nombre = serializers.ReadOnlyField(source='status.nombre')
    usuario_nombre = serializers.ReadOnlyField(source='usuario.nombre_completo')

    class Meta:
        model = Reserva
        fields = '__all__'
        read_only_fields = ('numero_solicitud', 'creado_en', 'actualizado_en', 'cancelado_en', 'usuario')

    def create(self, validated_data):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            raise serializers.ValidationError("Usuario no autenticado.")
        
        servicios_data = request.data.get('servicios_contratados', [])
        if not servicios_data:
            raise serializers.ValidationError("Debe añadir al menos un servicio.")

        duracion_evento = validated_data.pop('duracion_evento', None)
        if duracion_evento is not None:
            duracion_evento = Decimal(str(duracion_evento))
        
        import datetime
        
        # Customer-created requests always start pending.
        if getattr(request.user, 'role_id', None) != 1 or 'status' not in validated_data:
            validated_data['status'] = Status.objects.get(id=4)
        validated_data['usuario'] = request.user
        
        # Eliminar servicios_contratados si viene en validated_data para evitar error de asignacion directa
        validated_data.pop('servicios_contratados', None)

        fecha_evento = validated_data['fecha_evento']
        hora_evento = validated_data['hora_evento']
        fecha_hora_evento = datetime.datetime.combine(fecha_evento, hora_evento)
        if fecha_hora_evento <= timezone.localtime().replace(tzinfo=None):
            raise serializers.ValidationError({
                'fecha_evento': 'La fecha y hora del evento deben ser futuras.'
            })
        if duracion_evento is not None:
            duracion_para_validar = duracion_evento
        else:
            duracion_para_validar = max(
                (Decimal(str(item.get('duracion_horas', 1))) for item in servicios_data),
                default=Decimal('1'),
            )

        with transaction.atomic():
            Status.objects.select_for_update().get(id=4)
            year = timezone.localdate().year
            count = Reserva.objects.filter(creado_en__year=year).count() + 1
            validated_data['numero_solicitud'] = f"TOPHER-{year}-{count:03d}"
            reservas_del_dia = reservas_activas_en_fecha(fecha_evento, for_update=True)
            if hay_conflicto_horario(
                fecha_evento,
                hora_evento,
                duracion_para_validar,
                reservas_del_dia,
            ):
                raise serializers.ValidationError({
                    'hora_evento': 'Ese horario se cruza con otra reserva activa. Elige otra hora.'
                })

            reserva = Reserva.objects.create(**validated_data)
            total_acumulado = Decimal('0')
            for item in servicios_data:
                if not item.get('servicio') or not item.get('tarifa'):
                    raise serializers.ValidationError("Cada servicio debe tener servicio y tarifa seleccionados.")

                tarifa = Tarifa.objects.get(id=item['tarifa'])
                cantidad = int(item.get('cantidad', 1))
                duracion = duracion_evento or Decimal(str(item.get('duracion_horas', 1.0)))
                precio = calcular_precio_servicio(tarifa, cantidad, duracion)
                total_acumulado += precio

                ReservationService.objects.create(
                    reserva=reserva,
                    servicio_id=item['servicio'],
                    tarifa_id=item['tarifa'],
                    cantidad=cantidad,
                    duracion_horas=duracion,
                    precio_calculado=precio,
                    notas=item.get('notas', '')
                )

        # Avisar a todos los administradores que hay una nueva solicitud.
        # Se registra fuera del bloque de correo/PDF para que un fallo de
        # comunicación no impida que el aviso aparezca en el dashboard.
        try:
            from comunicacion.models import Notificacion

            administradores = Usuario.objects.filter(role_id=1)
            Notificacion.objects.bulk_create([
                Notificacion(
                    usuario=administrador,
                    reserva=reserva,
                    tipo='sistema',
                    asunto=f'Nueva solicitud de reserva — {reserva.numero_solicitud}',
                    mensaje=(
                        f'{reserva.usuario.nombre_completo} envió una solicitud '
                        f'para el evento "{reserva.nombre_evento}". '
                        'Revisa la reserva para continuar con la gestión.'
                    ),
                )
                for administrador in administradores
            ])
        except Exception as exc:
            print(f"[WARN] No se pudo crear la notificación para administradores: {exc}")
        
        # RF25: Generar automáticamente cotización en PDF
        try:
            from documentos.utils import generar_pdf_reserva
            from documentos.models import Cotizacion
            
            pdf_url = generar_pdf_reserva(reserva, tipo_doc='cotizacion')
            
            Cotizacion.objects.create(
                reserva=reserva,
                tipo='cotizacion',
                monto_total=total_acumulado,
                url_pdf=pdf_url,
                generado_por='sistema'
            )
            
            # RF30: Enviar correo con la cotización
            from comunicacion.utils import enviar_correo_con_pdf
            from comunicacion.models import Notificacion
            
            asunto = f"Cotización de Servicio - {reserva.numero_solicitud}"
            cuerpo = f"Hola {reserva.usuario.nombre_completo},\n\nAdjuntamos la cotización para tu evento '{reserva.nombre_evento}'.\n\nSaludos,\nEquipo Topher Producciones."
            
            enviar_correo_con_pdf(reserva.usuario.correo, asunto, cuerpo, pdf_url)
            
            # Registrar notificación en el sistema
            Notificacion.objects.create(
                usuario=reserva.usuario,
                reserva=reserva,
                tipo='sistema',
                asunto=asunto,
                mensaje=f"Se ha generado y enviado la cotización para tu reserva {reserva.numero_solicitud}."
            )
        except Exception as e:
            print(f"[WARN] Error al generar PDF/correo para reserva {reserva.id}: {e}")
        
        return reserva
