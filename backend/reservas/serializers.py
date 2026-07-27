from rest_framework import serializers
from .models import Reserva, ReservationService
from servicios.models import Tarifa
from usuarios.models import Status

class ReservationServiceSerializer(serializers.ModelSerializer):
    servicio_nombre = serializers.ReadOnlyField(source='servicio.nombre')

    class Meta:
        model = ReservationService
        fields = '__all__'
        read_only_fields = ('precio_calculado', 'reserva')

class ReservaSerializer(serializers.ModelSerializer):
    servicios_contratados = ReservationServiceSerializer(many=True, required=False)
    # Make status optional on input; default will be applied in create() if not provided
    status = serializers.PrimaryKeyRelatedField(queryset=Status.objects.all(), required=False, allow_null=True)
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
        
        # Generar número de solicitud único (ej: TOPHER-2026-001)
        import datetime
        count = Reserva.objects.filter(creado_en__year=datetime.date.today().year).count() + 1
        validated_data['numero_solicitud'] = f"TOPHER-{datetime.date.today().year}-{count:03d}"
        
        # Default status: Pendiente (ID 4)
        if 'status' not in validated_data:
            validated_data['status'] = Status.objects.get(id=4)
        validated_data['usuario'] = request.user
        
        # Eliminar servicios_contratados si viene en validated_data para evitar error de asignacion directa
        validated_data.pop('servicios_contratados', None)
        
        reserva = Reserva.objects.create(**validated_data)
        
        total_acumulado = 0
        for item in servicios_data:
            if not item.get('servicio') or not item.get('tarifa'):
                raise serializers.ValidationError("Cada servicio debe tener servicio y tarifa seleccionados.")
            
            tarifa = Tarifa.objects.get(id=item['tarifa'])
            # RF09: Cálculo automático del precio
            cantidad = int(item.get('cantidad', 1))
            duracion = float(item.get('duracion_horas', 1.0))
            precio = float(tarifa.precio_unitario) * cantidad * duracion
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
