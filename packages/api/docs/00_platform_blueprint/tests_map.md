1. Tests unitarios

Validan piezas pequeñas de lógica.

Ejemplos en tu ecosistema:

cálculo de totales del carrito
reglas de cupones
validación de horarios de entrega
cálculo de stock disponible
transición de estados de pedidos

Estos son los más rápidos y deberían ser muchísimos.

2. Tests de integración

Validan que varios componentes trabajen bien juntos.

Ejemplos:

controlador + servicio + repositorio + base de datos
creación de pedido + descuento + reserva de stock
login + generación de sesión + permisos
backend + Prisma + PostgreSQL
Firebase Functions + backend interno

Aquí ya detectas si “la lógica conversa bien”.

3. Tests E2E

Simulan flujos reales de usuario de punta a punta.

Ejemplos críticos:

registrarse
iniciar sesión
buscar producto
agregar al carrito
hacer checkout
crear pedido
verlo en panel admin
actualizar estado del pedido
notificar al cliente

Estos son los que más se parecen a “la app real”.

4. Tests de contrato

Muy importantes cuando te integras con terceros.

Sirven para verificar que:

el proveedor sigue enviando la estructura esperada
tu API sigue respondiendo con el contrato esperado
cambios en payloads no rompan frontend o integraciones

Esto te protege bastante cuando trabajas con pasarelas, proveedores logísticos, validadores, etc.

5. Smoke tests en producción

Son pruebas mínimas automáticas después de un despliegue.

Por ejemplo:

el login responde
el catálogo carga
el checkout no devuelve 500
el panel admin abre pedidos
el webhook principal sigue operativo

No reemplazan el resto, pero te alertan rápido.

6. Monitoreo y alertas

Aunque tengas tests, en producción igual necesitas vigilancia.

Debes medir:

errores frontend
errores backend
latencia
fallos por endpoint
fallos por proveedor externo
pedidos caídos
pagos fallidos
notificaciones no enviadas

Porque hay cosas que solo aparecen con tráfico real.