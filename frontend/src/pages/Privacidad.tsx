import { Link } from 'react-router-dom';

const Privacidad = () => (
  <div className="min-h-screen px-6 pt-32 pb-20">
    <article className="mx-auto max-w-4xl space-y-8 text-white/70">
      <header className="space-y-3">
        <span className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
          Topher Producciones
        </span>
        <h1 className="text-4xl font-display font-black uppercase tracking-tight text-white md:text-5xl">
          Aviso de privacidad
        </h1>
        <p className="text-sm">Información sobre el uso de datos personales en esta plataforma.</p>
      </header>

      <section className="glass-card space-y-4 p-6 md:p-8">
        <h2 className="text-xl font-bold text-white">Responsable y contacto</h2>
        <p>
          Topher Producciones, en Puerto Boyacá, Boyacá, atiende solicitudes
          relacionadas con datos personales en{' '}
          <a className="text-primary hover:underline" href="mailto:thoperPro@gmail.com">
            thoperPro@gmail.com
          </a>{' '}
          o por WhatsApp al{' '}
          <a className="text-primary hover:underline" href="https://wa.me/573207330859">
            +57 320 733 0859
          </a>.
        </p>
      </section>

      <section className="glass-card space-y-4 p-6 md:p-8">
        <h2 className="text-xl font-bold text-white">Datos y finalidades</h2>
        <p>
          La plataforma puede tratar nombre, nombre de usuario, correo,
          teléfono, información de solicitudes de contacto y datos necesarios
          para gestionar servicios y reservas, como fecha y lugar del evento.
          Estos datos se usan para crear y administrar cuentas, responder
          consultas, tramitar reservas, enviar avisos relacionados y proteger
          el funcionamiento del servicio.
        </p>
        <p>
          No envíes contraseñas ni números o códigos de tarjetas por el
          formulario de contacto o por WhatsApp. Cuando se habiliten pagos, la
          información de pago debe suministrarse únicamente en el canal seguro
          del proveedor de pagos.
        </p>
      </section>

      <section className="glass-card space-y-4 p-6 md:p-8">
        <h2 className="text-xl font-bold text-white">Uso, conservación y derechos</h2>
        <p>
          El acceso a los datos se limita a quienes los necesitan para gestionar
          las consultas y servicios. La plataforma los conserva mientras sean
          necesarios para esas finalidades y, cuando corresponda, durante los
          plazos exigidos por la normativa aplicable.
        </p>
        <p>
          Puedes solicitar información sobre tus datos, su actualización o
          corrección, y presentar solicitudes relacionadas con su tratamiento
          mediante los canales de contacto indicados arriba. Las solicitudes se
          atenderán de acuerdo con la normativa aplicable.
        </p>
      </section>

      <section className="glass-card space-y-4 p-6 md:p-8">
        <h2 className="text-xl font-bold text-white">Almacenamiento y seguridad</h2>
        <p>
          La plataforma usa proveedores tecnológicos para alojar y operar sus
          componentes. El navegador también guarda tokens de sesión para
          mantener iniciada la cuenta. No compartas tu sesión y cierra sesión
          en dispositivos que otras personas puedan usar.
        </p>
      </section>

      <p className="text-sm text-white/50">
        Para enviar una consulta, visita la página de{' '}
        <Link to="/contacto" className="text-primary hover:underline">contacto</Link>.
      </p>
    </article>
  </div>
);

export default Privacidad;
