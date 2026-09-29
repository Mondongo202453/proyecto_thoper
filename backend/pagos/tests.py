import hashlib
from decimal import Decimal

from django.test import SimpleTestCase
from pagos.views import _checksum_evento_valido, _monto_a_cobrar


class PaymentCalculationTests(SimpleTestCase):
    def test_anticipo_uses_half_of_total(self):
        self.assertEqual(
            _monto_a_cobrar('ANTICIPO', Decimal('100000'), Decimal('0')),
            Decimal('50000.00'),
        )

    def test_anticipo_never_exceeds_remaining_balance(self):
        self.assertEqual(
            _monto_a_cobrar('ANTICIPO', Decimal('100000'), Decimal('80000')),
            Decimal('20000'),
        )

    def test_total_payment_uses_remaining_balance(self):
        self.assertEqual(
            _monto_a_cobrar('TOTAL', Decimal('100000'), Decimal('25000')),
            Decimal('75000'),
        )

    def test_fully_paid_or_reserved_balance_has_no_new_payment(self):
        self.assertEqual(
            _monto_a_cobrar('ANTICIPO', Decimal('100000'), Decimal('100000')),
            Decimal('0.00'),
        )


class WompiEventSignatureTests(SimpleTestCase):
    def test_accepts_uppercase_wompi_checksum(self):
        transaction_data = {
            'id': 'transaction-1',
            'status': 'APPROVED',
            'amount_in_cents': 10000,
        }
        properties = [
            'transaction.id',
            'transaction.status',
            'transaction.amount_in_cents',
        ]
        timestamp = 1234567890
        secret = 'events-secret'
        checksum_input = f'transaction-1APPROVED10000{timestamp}{secret}'
        checksum = hashlib.sha256(checksum_input.encode()).hexdigest().upper()

        self.assertTrue(
            _checksum_evento_valido(
                transaction_data,
                properties,
                timestamp,
                checksum,
                secret,
            )
        )
