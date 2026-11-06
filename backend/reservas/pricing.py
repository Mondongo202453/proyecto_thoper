from decimal import Decimal


def calcular_precio_servicio(tarifa, cantidad, duracion_horas):
    precio = Decimal(str(tarifa.precio_unitario)) * Decimal(cantidad)
    if tarifa.unidad == 'hora':
        precio *= Decimal(str(duracion_horas))
    return precio
