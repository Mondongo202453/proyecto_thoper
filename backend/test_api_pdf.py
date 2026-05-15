import requests
import json
import os

base_url = "http://127.0.0.1:8000/api"

def test_api():
    print("--- INICIANDO PRUEBAS DE API (Fase PDF) ---")
    
    # 1. Login para obtener token
    login_data = {
        "nombre_usuario": "admin_topher", # Usamos el admin por defecto del SQL
        "password": "hash" # Nota: En una DB real el pass no seria 'hash', pero para el test usamos el usuario creado en el paso anterior si 'hash' no funciona
    }
    
    # Intentamos loguear con el usuario creado en la prueba anterior
    login_data = {
        "nombre_usuario": "tester_29945", 
        "password": "password123"
    }

    try:
        login_resp = requests.post(f"{base_url}/token/", json=login_data)
        if login_resp.status_code != 200:
            print("Login fallido, intentando registrar nuevo usuario...")
            user_data = {
                "nombre_completo": "Test PDF User",
                "nombre_usuario": "pdf_tester_" + str(os.getpid()),
                "correo": f"pdf_tester_{os.getpid()}@topher.com",
                "password": "password123",
                "telefono": "3000000000"
            }
            requests.post(f"{base_url}/register/", json=user_data)
            login_resp = requests.post(f"{base_url}/token/", json={"nombre_usuario": user_data["nombre_usuario"], "password": "password123"})

        token = login_resp.json().get('access')
        headers = {"Authorization": f"Bearer {token}"}
        print("Login exitoso.")

        # 2. Crear una Reserva con Servicios
        reserva_data = {
            "nombre_evento": "Boda Real Test",
            "fecha_evento": "2026-12-24",
            "hora_evento": "20:00:00",
            "lugar": "Hacienda El Castillo",
            "municipio": "Medellin",
            "asistentes": 200,
            "status": 4, # Pendiente
            "servicios_contratados": [
                {
                    "servicio": 1, # Fuegos Artificiales
                    "tarifa": 1,
                    "cantidad": 1,
                    "duracion_horas": 1
                },
                {
                    "servicio": 2, # Chispas Frias
                    "tarifa": 2,
                    "cantidad": 4,
                    "duracion_horas": 2
                }
            ]
        }
        
        print("\nCreando reserva...")
        res_resp = requests.post(f"{base_url}/reservas/", json=reserva_data, headers=headers)
        print(f"Resultado Reserva: {res_resp.status_code}")
        reserva_id = res_resp.json().get('id')
        
        if res_resp.status_code == 201:
            print(f"Reserva creada: {res_resp.json()['numero_solicitud']}")
            
            # 3. Verificar si se genero la Cotizacion y el PDF
            print("\nVerificando cotizacion...")
            cot_resp = requests.get(f"{base_url}/cotizaciones/", headers=headers)
            cotizaciones = cot_resp.json()
            if len(cotizaciones) > 0:
                ultima = cotizaciones[0]
                print(f"Cotizacion encontrada: ID {ultima['id']}")
                print(f"Monto Total: ${ultima['monto_total']}")
                print(f"URL PDF: {ultima['url_pdf']}")
                
                # Verificar que el archivo existe en disco
                full_path = os.path.join(os.getcwd(), ultima['url_pdf'].lstrip('/'))
                if os.path.exists(full_path):
                    print("✅ ARCHIVO PDF GENERADO CORRECTAMENTE EN DISCO.")
                else:
                    print(f"❌ ARCHIVO PDF NO ENCONTRADO EN: {full_path}")
        else:
            print("Error al crear reserva:", res_resp.json())
            
    except Exception as e:
        print(f"\nERROR durante las pruebas: {e}")

if __name__ == "__main__":
    test_api()
