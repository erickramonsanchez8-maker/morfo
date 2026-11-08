# MORFO — puesta en operación

## Sitio actualizado
- La pintura original El testigo ocupa el primer plano de la portada.
- Solo se usa la obra auténtica identificada en el repositorio. Se excluyen las dos ilustraciones SVG ficticias y las cifras de subasta de demostración.
- Funcionan búsqueda y filtro del catálogo, visor ampliado, navegación móvil, selector ES/EN y formulario de consulta preparado para WhatsApp.
- El número oficial de WhatsApp todavía no está configurado; el visitante selecciona el contacto al enviar. No se inventó un destinatario.
- Al conectar Supabase, el formulario puede guardar consultas en public.inquiries.

## Activar el backend
1. Crear proyecto Supabase (plan Free).
2. Ejecutar el archivo supabase/schema.sql en SQL Editor.
3. Habilitar Email OTP / magic link en Authentication.
4. Crear usuario administrativo y añadir su UUID a public.admin_users.
5. En index.html, completar MORFO_CONFIG.supabaseUrl y MORFO_CONFIG.supabaseAnonKey. Nunca publicar service_role.
6. Completar y aprobar la ficha de la obra en public.artworks; marcar published=true cuando la artista valide sus datos.
7. Configurar el teléfono público de MORFO en MORFO_CONFIG.whatsapp (código país y dígitos, sin +).

## Subastas
- No publicar una subasta sin obra real, precio de reserva, incremento, fechas y reglas aprobadas.
- Crear la fila en public.auctions con status scheduled y cambiar a live al abrir.
- La función place_bid bloquea la fila, valida plazo y oferta mínima, aplica extensión anti-sniping y exige identity_verified y deposit_verified.
- El historial expone importes y fechas, no nombres de participantes.
- La adjudicación, cobro, pago de ganador y envío todavía requieren integrar un proveedor de pagos y procesos de operación.

## Pendiente antes de cobrar
MORFO no ha elegido procesador de pagos ni creado cuenta comercial. También falta configurar el número público de WhatsApp, verificar ficha técnica/precio/estado de cada obra y aprobar políticas legales, certificados, embalaje, envío asegurado y devoluciones. No se simulan compras ni pujas.
