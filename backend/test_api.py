import requests
import json

base_url = "http://127.0.0.1:8000/api"

def test_api():
    print("--- INICIANDO PRUEBAS DE API (Simulacion Postman) ---")
    
    # 1. Registrar usuario
    user_data = {
        "nombre_completo": "Usuario de Prueba",
        "nombre_usuario": "tester_" + str(hash("tester"))[1:6],
        "correo": f"tester_{str(hash('tester'))[1:6]}@topher.com",
        "password": "password123",
        "telefono": "3000000000"
    }
    
    try:
        reg_resp = requests.post(f"{base_url}/register/", json=user_data)
        print(f"1. Registro de Usuario: {reg_resp.status_code}")
        print(json.dumps(reg_resp.json(), indent=2))
        
        # 2. Login para obtener token
        login_data = {
            "nombre_usuario": user_data["nombre_usuario"],
            "password": user_data["password"]
        }
        login_resp = requests.post(f"{base_url}/token/", json=login_data)
        print(f"\n2. Login (JWT): {login_resp.status_code}")
        token_data = login_resp.json()
        token = token_data.get('access')
        if token:
            print(f"Token obtenido: {token[:20]}...")
        else:
            print("Error al obtener token:", token_data)
        
        # 3. Listar Servicios (Publico)
        serv_resp = requests.get(f"{base_url}/servicios/")
        print(f"\n3. Listar Servicios: {serv_resp.status_code}")
        if serv_resp.status_code == 200:
            servicios = serv_resp.json()
            print(f"Servicios encontrados: {len(servicios)}")
            if len(servicios) > 0:
                print(f"Ejemplo: {servicios[0]['nombre']}")
        
    except Exception as e:
        print(f"\nERROR durante las pruebas: {e}")

if __name__ == "__main__":
    test_api()
