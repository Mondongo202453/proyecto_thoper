import os
from django.core.mail import EmailMessage
from django.conf import settings

def enviar_correo_con_pdf(destinatario, asunto, cuerpo, pdf_path):
    try:
        email = EmailMessage(
            asunto,
            cuerpo,
            settings.EMAIL_HOST_USER or 'no-reply@topher.com',
            [destinatario],
        )
        
        # El pdf_path es relativo a MEDIA_ROOT si empieza con /media/
        if pdf_path.startswith('/media/'):
            # Convertir /media/pdfs/archivo.pdf -> BASE_DIR/media/pdfs/archivo.pdf
            relative_path = pdf_path.replace('/media/', '')
            absolute_path = os.path.join(settings.MEDIA_ROOT, relative_path)
        else:
            absolute_path = pdf_path
            
        if os.path.exists(absolute_path):
            email.attach_file(absolute_path)
            email.send()
            print(f"Correo enviado exitosamente a {destinatario}")
            return True
        else:
            print(f"Error: El archivo PDF no existe en {absolute_path}")
            return False
            
    except Exception as e:
        print(f"Error al enviar correo: {e}")
        return False
