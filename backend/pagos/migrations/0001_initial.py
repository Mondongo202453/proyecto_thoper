from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(
            name='Pago',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('referencia', models.CharField(max_length=80, unique=True)),
                ('tipo', models.CharField(choices=[('ANTICIPO', 'Anticipo'), ('TOTAL', 'Total')], max_length=10)),
                ('monto', models.DecimalField(decimal_places=2, max_digits=12)),
                ('moneda', models.CharField(default='COP', max_length=3)),
                ('estado', models.CharField(choices=[('PENDIENTE', 'Pendiente'), ('APPROVED', 'Aprobado'), ('DECLINED', 'Rechazado'), ('VOIDED', 'Anulado'), ('ERROR', 'Error')], default='PENDIENTE', max_length=20)),
                ('wompi_transaction_id', models.CharField(blank=True, max_length=120, null=True)),
                ('checkout_url', models.URLField(blank=True, max_length=1000)),
                ('creado_en', models.DateTimeField(auto_now_add=True)),
                ('actualizado_en', models.DateTimeField(auto_now=True)),
                ('reserva_id', models.PositiveBigIntegerField(db_column='reserva_id')),
                ('usuario_id', models.PositiveBigIntegerField(db_column='usuario_id')),
            ],
            options={'db_table': 'pagos', 'ordering': ['-creado_en']},
        ),
    ]
