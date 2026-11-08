# MORFO — operación y puesta en producción

## Lo que ya está implementado en el repositorio
- Portada centrada en la pintura: la obra destacada llena la primera pantalla; el logotipo no compite con ella.
- Catálogo dinámico: lee obras publicadas desde Supabase cuando se conecta; mantiene la única obra auténtica del repositorio como respaldo mientras tanto.
- Búsqueda y filtros por estado, visor ampliado, navegación móvil y español/inglés.
- Consultas: se guardan en Supabase cuando el backend está configurado; sin backend, se prepara un mensaje para WhatsApp.
- Panel privado en admin.html: login por enlace de correo, carga de fotografías, inventario, publicación de obras, bandeja de consultas, programación/apertura/cierre de subastas y verificación de identidad/depósito.
- Subastas: registro por correo OTP, ofertas autenticadas con validación atómica, incremento mínimo y extensión anti-sniping. El historial público no revela la identidad del pujador.
- Se retiraron las obras ficticias de demostración y las cantidades inventadas.

## Activación obligatoria del backend
El código ya está preparado, pero no puede guardar datos ni autenticar participantes hasta que exista un proyecto Supabase propio y se añadan sus credenciales públicas.

1. Crear un proyecto Supabase en el plan Free.
2. Ejecutar una sola vez el archivo supabase/schema.sql en SQL Editor.
3. Habilitar Email OTP / magic link en Authentication.
4. Crear el usuario administrador desde Authentication; copiar su UUID.
5. En SQL Editor ejecutar: insert into public.admin_users(user_id) values('UUID_DEL_ADMIN');
6. Completar morfo-config.js con Project URL y anon/public key. No poner la service_role key en ningún archivo público.
7. Entrar a admin.html, iniciar sesión y aprobar la ficha de El testigo. La obra inicial está creada con published=false deliberadamente; publicarla cuando la artista valide su ficha.
8. Para nuevas obras, cargar la fotografía original desde admin.html; se guarda en el bucket público morfo-artworks de Supabase Storage y se enlaza automáticamente al inventario.
9. Configurar en morfo-config.js el número oficial de WhatsApp de MORFO, con código de país y solo dígitos.

## Operación de subastas
- No crear una subasta sin obra real, precio de reserva, incremento, fechas y reglas aprobadas.
- Programarla desde admin.html. Abrirla desde el panel al momento de inicio.
- Los participantes entran por correo OTP. La función place_bid exige identity_verified=true y deposit_verified=true, valida el cierre y el importe mínimo, bloquea la fila para evitar pujas simultáneas inconsistentes y aplica extensión anti-sniping.
- El panel permite cerrar la subasta después de su hora de cierre y registra al mejor postor si alcanzó la reserva.
- Antes de marcar una obra como vendida hay que confirmar el pago real.

## Pendientes externos que no se pueden inventar
- Supabase URL y anon key: falta crear el proyecto.
- WhatsApp público: no se proporcionó un número oficial.
- Cobro: MORFO todavía no eligió un procesador ni cuenta comercial. No hay checkout ni cobro automatizado conectado.
- Verificar con la artista título, año, técnica, soporte, medidas, estado, precio y disponibilidad de cada obra.
- Aprobar términos de compra/subasta, privacidad, certificados, embalaje, envío asegurado, devoluciones y obligaciones fiscales.

La web y el panel están versionados en GitHub. Para que sean accesibles al público, hay que publicarlos en el hosting elegido (Hostinger u otro) y configurar dominio/HTTPS.
