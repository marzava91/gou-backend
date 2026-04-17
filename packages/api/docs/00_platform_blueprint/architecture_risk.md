# Riesgos de Arquitectura general

### 1. No mezclar dato maestro con derivado.

- Riesgo: Meter en entidades base cosas que en realidad son resultados analíticos o snapshots.
- Regla: Lo maestro vive en Catalog, Customers, Suppliers y Pricing; Lo derivado vive en Business Intelligence y Analytics.

### 2. No mezclar ejecución con recomendación.

- Riesgo: Que una recomendación analítica termine tratándose como si fuera operación real.
- Regla: BI recomienda, Operations ejecuta y Financial formaliza.

### 3. No mezclar “configuración” con “estado”.

- Riesgo: Usar una misma entidad para guardar reglas y al mismo tiempo resultados en ejecución.
- Regla: Configuración = Reglas, parámetros, intención; Estado = ejecución actual; Snapshot = resultado histórico

---

# Riesgos al modelar entidades

### 4. Evitar entidades monstruo.

- Riesgo: Que Product, User, Order o Store terminen absorbiendo demasiadas responsabilidades.
- Regla: Si una entidad responde más de una gran pregunta, probablemente está sobrecargada.

### 5. Definir bien ownership y scope.

- Riesgo: No saber si algo pertenece a plataforma, tenant, store, user, order o campaign.
- Regla: Cada modelo debe responder explícitamente: ¿De quién es este dato? ¿En qué scope existe? (platform, tenant, store, user, order, delivery, campaign, etc.) ¿Quién lo puede mutar? ¿Quién lo puede leer? ¿Cuál es su fuente canónica?

### 6. No duplicar relaciones “por comodidad”.

- Riesgo: Guardar el mismo vínculo en varios lados y luego tener inconsistencias.
- Regla: La relación oficial debe existir en un solo lugar canónico.

### 7. Cuidado con lo enums prematuros o rígidos.

- Riesgo: Definir demasiados tipos cerrados que luego cambian con el negocio.
- Regla: Usar enums donde el dominio sea estable. Si puede crecer mucho, prever tablas / configuración o al menos diseño extensible.

---

# Riesgos en reglas de negocio

### 8. No dejar reglas críticas “implícitas”.

- Riesgo: Asumir reglas importantes sin escribirlas.
- Regla: Toda restricción importante debe existir en reglas del módulo, validación de aplicación, e idealmente restricciones de datos cuando aplique.

### 9. Definir bien estados y transiciones.

- Riesgo: Estados bonitos en slides pero sin máquina de estados real.
- Regla: Por cada entidad de lifecycle, define estados posibles, transición válida, quién dispara, evento que emite, side effects.

### 10. No mezclar permisos con reglas de negocio.

- Riesgo: Querer resolver toda la lógica con roles/permisos.
- Regla: Permisos dicen quién puede intentar, reglas de negocio dicen si puede ocurrir.

# Riesgos en DTOs

### 11. No modelar DTOs espejo de la base de datos.

- Riesgo: Crear DTOs iguales a las tablas por rapidez.
- Regla: Los DTOs deben expresar intención de negocio, no estructura de tabla.

### 12. Separar DTOs de comando vs DTOs de consulta.

- Riesgo: Usar el mismo DTO para crear, actualizar, listar y responder.
- Regla: Separar: Create / Update / Actions DTOs / Query DTOs / Params DTOs / Response DTOs

### 13. Evitar DTOs demasiado genéricos.

- Riesgo: Un DTO tipo “UpdateAnythingDto”.
- Regla: Cuando una acción tiene reglas propias, merece DTO propio.

# Riesgos en endpoints

### 14. No diseñar endpoints solo por CRUD.

- Riesgo: Terminar con un backend técnicamente limpio pero semánticamente pobre.
- Regla: Además de CRUD, necesitas enpoints de acción

### 15. Mantener consistencia de scope en endpoints.

- Riesgo: Unos endpoints exigen tenant, otros no, otros infieren store, otros la reciben en body, o exponen acciones distintas sin distinguir correctamente entre superficies como partner y platform.
- Regla: Define una política clara: qué endpoints son platform-scoped, cuáles son tenant-scoped, cuáles son store-scoped, cuáles son actor-scoped (shopper, rider, partner, support, platform), cómo se pasa el contexto (token, headers, path, membership activa, store activa), y en qué capa se valida cada cosa.

### 16. No exponer acciones peligrosas sin idempotencia o auditoría.

- Riesgo: Duplicados o cambios sensibles sin trazabilidad.
- Regla: Toda acción crítica (confirm payment, create refund, issue invoice, accept invitation, close session, etc.) debe revisar: idempotency, audit, autorización, estado previo válido.

# Riesgos en eventos

### 17. No emitir eventos ambiguos.

- Riesgo: Eventos poco claros como order_updated.
- Regla: Los eventos deben ser semánticos (order_created, order_confirmed, order_cancelled, etc.)

### 18. No emitir eventos por cada cambio irrelevante.

- Riesgo: Ruido, complejidad y consumidores frágiles
- Regla: Emitir eventos cuando: cambia el estado del negocio, otro módulo necesita reaccionar, hay integración externa, necesitas trazabilidad real.

### 19. No acoplar side effects directamente al endpoint.

- Riesgo: Un endpoint hace demasiadas cosas sin capa de eventos.
- Regla: El endpoint debe iniciar la operación principal. Los side effects relevantes debe definir explícitamente: evento origen, consumidor, precondiciones, idempotencia, política de retry, compensación si falla, observabilidad, efecto esperado sobre estado del negocio.

# Riesgos específicos del mapa

### 20. No duplicar campos derivados “por conveniencia”

- Riesgo: Guardar en una entidad base valores calculados o replicados para “haberlo más fácil” y luego quedar con inconsistencias.
- Regla: Todo campo derivado o resumen debe tener una fuente canónica clara o vivir como snapshot/projection.

### 21. No usar nombres ambiguos o inconsistentes

- Riesgo: Usar nombres distintos para el mismo concepto o el mismo nombre para cosas distintas.
- Regla: Definir naming canónico para entidades, estados, acciones, scopes y eventos antes de crecer.

### 22. No dejar side effects sin dueño explícito

- Riesgo: No saber qué módulo o workflow es responsable de disparar, escuchar y completar efectos secundarios.
- Regla: Cada side effect relevante debe tener origen, consumidor y condición de ejecución claramente definidos.

### 23. No convertir motores de decisión en cajas negras inmanejables

- Riesgo: Diseñar Offer Decision Engine, Automation Orchestration, Personalization Engine, Dynamic Pricing Optimization o Store Ranking & Promising de forma tan genérica u opaca que luego no se entienda por qué el sistema decidió algo, en qué orden aplicó criterios o qué señal prevaleció en cada contexto.
- Regla: Toda decisión automatizada relevante debe ser explicable, auditable, trazable y asociable a inputs, reglas, señales, prioridades, versión de configuración y resultado esperado.

### 24. No diseñar multi-tenant sin estrategia de aislamiento explícita

- Riesgo: Filtraciones de datos entre tenants, stores o actores por filtros inconsistentes o queries mal construidas.
- Regla: Todo modelo y endpoint debe dejar claro su aislamiento; el contexto tenant/store no debe depender de convenciones implícitas ni del frontend.

### 25. No asumir que todos los clientes consumen el backend igual

- Riesgo: Diseñar DTOs, endpoints o políticas de negocio pensando solo en una superficie —por ejemplo shopper app o partner web— rompiendo marketplace web, POS, rider app o platform console.
- Regla: El core backend debe modelar capacidades de negocio reutilizables; cada superficie debe consumir contratos adaptados a su contexto, scope, permisos y nivel de visibilidad.

### 26. No dejar sin dueño las projections y vistas de lectura

- Riesgo: Querer resolver UI compleja solo con tablas transaccionales o, al revés, proliferar read models sin criterio.
- Regla: Toda vista compleja debe tener una estrategia clara: consulta directa, projection, snapshot, cache o read model, con owner definido.

### 27. No olvidar versionado de reglas, campañas y configuraciones sensibles

- Riesgo: Cambiar promociones, pricing, policies o settings sin poder reconstruir qué configuración estaba activa cuando ocurrió una transacción.
- Regla: Toda configuración que afecte decisiones o transacciones relevantes debe ser versionable o al menos snapshotteable en el momento de uso.

### 28. No dejar sin estrategia de reconciliación los procesos críticos

- Riesgo: Que pagos, inventario, deliveries, notificaciones o incentivos fallen en medio de un flujo sin mecanismo de verificación posterior.
- Regla: Todo proceso crítico debe tener mecanismos de reconciliación, reintento controlado o reparación operativa/manual.

### 29. No dejar ambigua la identidad externa vs identidad interna

- Riesgo: Mezclar identidad provista por sistemas externos (Firebase Auth, pasarela, operador de mensajería, proveedor fiscal) con la identidad canónica interna del dominio, generando acoplamiento, duplicidad o imposibilidad de migración.
- Regla: Toda identidad externa debe mapearse explícitamente a una identidad interna canónica; los IDs de terceros no deben convertirse en la clave conceptual del dominio.

### 30. No mezclar clock time, business time y effective time

- Riesgo: Usar una sola fecha para todo y perder la diferencia entre cuándo se creó algo, cuándo fue efectivo, cuándo expiró, cuándo se aplicó y para qué período era válido.
- Regla: Toda entidad sensible a vigencia o lifecycle debe distinguir explícitamente timestamps operativos relevantes: creación, activación, vigencia, expiración, ejecución, liquidación o reconciliación, según corresponda.

### 31. No dejar sin estrategia la concurrencia sobre entidades críticas

- Riesgo: Colisiones silenciosas al actualizar stock, cart, checkout, order, cash session, invitation, coupon usage o estados logísticos desde múltiples actores o procesos.
- Regla: Toda entidad crítica debe definir su estrategia de concurrencia: optimistic locking, versionado, compare-and-set, serialización por recurso o compensación posterior.

### 32. No dejar sin política de borrado, retención y archivado

- Riesgo: Mezclar datos activos, históricos, auditables, sensibles o legalmente retenidos sin reglas claras de conservación, borrado lógico, borrado físico o anonimización.
- Regla: Cada módulo debe definir qué se archiva, qué se anonimiza, qué se retiene por obligación, qué puede borrarse y qué debe preservarse para auditoría, conciliación o defensa operativa/legal.

### 33. No exponer PII o datos sensibles fuera del mínimo necesario

- Riesgo: Que DTOs, eventos, logs, auditoría, analytics o snapshots terminen propagando datos personales o sensibles innecesariamente entre módulos y superficies.
- Regla: Todo contrato, evento, log o vista debe aplicar minimización de datos; la información sensible solo debe viajar cuando sea estrictamente necesaria y con controles de acceso, masking o tokenización cuando corresponda.

### 34. No dejar sin clasificación los errores de negocio vs técnicos vs externos

- Riesgo: Tratar igual una validación de negocio, una caída técnica, un timeout externo y una inconsistencia de estado, dificultando retries, UX, monitoreo y soporte.
- Regla: El sistema debe clasificar explícitamente errores de dominio, validación, autorización, infraestructura, integración externa, concurrencia y reconciliación, con políticas diferenciadas de respuesta, retry, observabilidad y escalamiento.

### 35. No diseñar estados irreversibles sin política explícita de compensación

- Riesgo: Ejecutar acciones irreversibles o de alto costo operativo/financiero sin definir qué ocurre si un paso posterior falla.
- Regla: Toda transición irreversible o costosa debe declarar si admite compensación, reversión, reparación manual o solo reconciliación posterior.

### 36. No dejar sin estrategia de dependencia entre módulos críticos

- Riesgo: Crear dependencias circulares o sincronías frágiles entre módulos que deberían desacoplarse, generando cascadas de fallo o bloqueo de evolución.
- Regla: Toda dependencia entre módulos debe clasificarse como canónica, de consulta, de evento, de snapshot o de infraestructura; evitar dependencias circulares y escrituras cruzadas sin ownership explícito.

# Riesgos de frontera entre dominios

### 37. Frontera Commercial Management vs Business Intelligence

- Riesgo: Meter snapshots y scoring dentro de campañas, tagging o segmentación.
- Regla: Commercial Management define, segmenta, configura y ejecuta estrategias; Business Intelligence calcula, proyecta, clasifica y produce señales derivadas. Ningún snapshot, score o recomendación debe convertirse en configuración operativa sin mediación explícita.

### 38. Frontera Analytics vs BI

- Riesgo: Hacer que Dashboard o Reporting recalculen lógica pesada.
- Regla: Analytics consume y expone información para monitoreo y análisis; BI produce artefactos derivados reutilizables por otros módulos. Analytics no debe recalcular lógica pesada ni convertirse en motor de scoring.

### 39. Frontera Purchases vs Accounts Payable

- Riesgo: Confundir compra operativa con obligación financiera.
- Regla: Purchases = orden + recepción + validación // Accounts Payable = deuda pendiente y su gestión financiera.

### 40. Frontera Notifications vs Communications vs Push Campaigns

- Riesgo: Mezclar mensajes humanos, campañas comerciales e infraestructura de envío.
- Regla: Communications modela interacción humana o relacional; Notifications modela infraestructura de entrega; Triggered Notifications modela activación automática; Push Campaigns modela estrategia comercial planificada.

### 41. Frontera Assortment / Availability vs Inventory vs Stock Counts vs Replenishment vs Supply-Demand Balancing

- Riesgo: Tratar bajo “inventario” cosas que en realidad pertenecen a disponibilidad comercial, stock operativo, conciliación física, reposición o balance dinámico de capacidad.
- Regla: Assortment / Availability habilita oferta estructural; Inventory refleja stock y movimientos; Stock Counts concilia físico vs teórico; Replenishment gestiona reposición; Supply-Demand Balancing ajusta disponibilidad operativa en tiempo real según capacidad y demanda.

### 42. No mezclar infraestructura reutilizable en casos de negocio

- Riesgo: Que módulos transversales como Shared Links, Notifications, Events o Files terminen contaminados con lógica específica de referrals, campañas, listas o pedidos.
- Regla: La infraestructura transversal debe ser genérica y reusable; la lógica de negocio debe vivir en módulos consumidores específicos.

### 43. No confundir resolución técnica con significado comercial

- Riesgo: Tratar deep links, shared links o tracking como si por sí mismos definieran un programa de growth o una atribución de negocio.
- Regla: Resolver un link, abrir una ruta o registrar un click no equivale automáticamente a atribuir conversión, referral válido o impacto comercial; esa interpretación pertenece al módulo de negocio correspondiente.

### 44. No mezclar atribución con recompensa

- Riesgo: Que Link Attribution & Tracking, Referral Program y Virality & Invite System terminen fusionados en una sola lógica difícil de gobernar.
- Regla: Attribution mide; Referral valida y recompensa; Virality optimiza propagación e invitación; Shared Links provee la infraestructura.

### 45. No mezclar selección, ranking y orquestación

- Riesgo: Que Offer Decision Engine, Store Ranking & Promising, Personalization Engine y Automation Orchestration se solapen y varios módulos “decidan” simultáneamente qué mostrar, qué priorizar, qué activar o qué flujo ejecutar.
- Regla: Personalization adapta la experiencia; Store Ranking & Promising prioriza comercios y promesas; Offer Decision Engine selecciona la mejor oferta o beneficio en un contexto concreto; Automation Orchestration coordina acciones y workflows del sistema a partir de eventos, señales y reglas.

### 46. No mezclar definición de beneficio con ejecución del beneficio

- Riesgo: Que Benefit Catalog, Policy / Rule Engine y Benefit Enforcement terminen implementando la misma responsabilidad desde distintos ángulos.
- Regla: Benefit Catalog define tipos; Rule Engine decide elegibilidad y prioridad; Benefit Enforcement materializa efectos concretos sobre otros módulos.

### 47. No tratar snapshots, scores o señales como estado operativo vivo

- Riesgo: Que scores, ranking, forecast, recommendation signals o segmentation snapshots empiecen a usarse como si fueran estado maestro o verdad transaccional.
- Regla: Todo resultado analítico debe tener timestamp, origen, versión y carácter derivado; su uso operativo debe ser explícito y controlado.

### 48. No dejar ambigua la fuente de verdad del precio efectivo

- Riesgo: Tener Pricing, Promotions, Coupons, Benefit Enforcement, Offer Decision Engine y Dynamic Pricing alterando precio sin una jerarquía clara.
- Regla: Debe existir una política explícita de resolución del precio efectivo, indicando fuente base, ajustes permitidos, prioridad, combinabilidad, snapshot transaccional y trazabilidad.

### 49. No dejar ambigua la fuente de verdad de disponibilidad

- Riesgo: Confundir Assortment / Availability, Inventory, Supply-Demand Balancing y Deliveries al decidir si algo puede venderse.
- Regla: Debe existir una jerarquía clara entre disponibilidad estructural, disponibilidad por stock, disponibilidad operativa y disponibilidad logística.

### 50. No permitir carritos u órdenes con scoping inconsistente

- Riesgo: Permitir carritos que mezclen tenant/store/canal sin reglas explícitas, generando caos en pricing, stock, promociones, pagos y entrega.
- Regla: Cart y Order deben tener reglas canónicas de scope: tenant, store, canal, moneda, pricing context y reglas de mezcla claramente definidas.

### 51. No tratar Checkout Session como simple copia del cart

- Riesgo: Usar checkout solo como paso visual sin snapshot ni validación transaccional real.
- Regla: Checkout Session debe ser una capa explícita de validación y congelamiento parcial del contexto comercial y operativo previo a Order.

### 52. No dejar ambiguo el ownership del lifecycle de delivery

- Riesgo: Mezclar Orders, Deliveries, Riders, Notifications y Support sin saber cuál módulo gobierna cada transición logística.
- Regla: Order gobierna el lifecycle comercial; Delivery gobierna el lifecycle logístico; las intersecciones deben estar definidas por eventos y transiciones claras.

### 53. No mezclar operación de caja con flujo financiero formal

- Riesgo: Confundir POS, Cash & Expenses, Agent Transactions, Payments, Refunds y Settlements como si fueran una sola capa de dinero.
- Regla: Caja opera movimientos operativos; Payments formaliza cobros; Refunds revierte cobros; Agent Transactions modela servicios de caja; Settlements distribuye financieramente.

### 54. No asumir consistencia inmediata donde habrá asincronía

- Riesgo: Diseñar el sistema como si todo ocurriera en línea y en el mismo momento, cuando tendrás eventos, retries, notificaciones, workflows y automatizaciones desacopladas.
- Regla: Todo proceso multi-módulo debe diseñarse considerando consistencia eventual, idempotencia, retry, ordering y reconciliación.

### 55. No dejar automatizaciones sin guardrails

- Riesgo: Que Triggered Notifications, Decisioning & Automation, Push Campaigns o User Journeys activen acciones en bucle, repetidas o conflictivas.
- Regla: Toda automatización debe tener límites, ventanas de enfriamiento, deduplicación, prioridad, presupuesto y reglas de exclusión.

### 56. No dejar campañas, journeys e incentivos compitiendo sin gobernanza

- Riesgo: Que Campaigns, Push Campaigns, Promotions, Coupons, Loyalty, Offer Decision Engine y User Journeys envíen incentivos o mensajes contradictorios.
- Regla: Debe existir una política de prioridad, combinabilidad, saturación, budgeting y ownership por estrategia activa.

### 57. No diseñar mensajería sin separar intención de entrega

- Riesgo: Que Triggered Notifications y Notifications se mezclen y no sepas si un mensaje fue solo decidido, encolado, enviado, entregado o fallido.
- Regla: Separar intención de comunicación, entrega técnica, intento, estado final y telemetría de canal.

### 58. No dejar conversaciones y soporte sin frontera con notificaciones

- Riesgo: Que Chat, Support Threads, Notifications y Triggered Notifications se mezclen como si fueran el mismo sistema de mensajes.
- Regla: Conversations/Support modelan interacción humana o caso de atención; Notifications modela envío técnico; Triggered Notifications modela activación automática.

### 59. No confundir conversación con confirmación transaccional

- Riesgo: Tratar mensajes ambiguos o informales del usuario como confirmaciones válidas de carrito, checkout, pago o pedido.
- Regla: Toda intención conversacional debe pasar por validaciones explícitas antes de materializar cambios transaccionales relevantes.

### 60. No duplicar lógica de compra dentro del canal conversacional

- Riesgo: Implementar pricing, stock, promociones, checkout o creación de órdenes directamente dentro del flujo de WhatsApp, generando un backend paralelo inconsistente.
- Regla: El canal conversacional debe orquestar capacidades del core, no reemplazarlas ni duplicarlas.

### 61. No dejar ambigua la identidad y autorización del usuario en canales conversacionales

- Riesgo: Asumir que el número de teléfono o el canal equivale automáticamente a identidad autenticada o autorizada para operar sobre direcciones, pedidos, pagos o datos sensibles.
- Regla: Toda operación sensible iniciada por canales conversacionales debe definir claramente el nivel de confianza del canal, mecanismos de verificación y límites de autorización.

### 62. No dejar sin estrategia la resolución de ambigüedad conversacional

- Riesgo: Ejecutar acciones incorrectas por interpretar de forma demasiado agresiva mensajes ambiguos como nombres de producto, cantidades, direcciones o confirmaciones.
- Regla: El sistema debe distinguir entre intención inferida, intención confirmada y acción ejecutable, con políticas explícitas de aclaración y fallback.

### 63. No prometer capacidad operativa que el sistema no puede cumplir

- Riesgo: Mostrar stores, tiempos estimados o promesas de entrega que no reflejan realmente cobertura, capacidad de preparación, disponibilidad logística o saturación operativa, degradando experiencia, cancelaciones y confianza
- Regla: Toda promesa comercial relevante debe resolverse contra señales operativas y logísticas vigentes, con supuestos explícitos, márgenes de seguridad, fallback y trazabilidad de la fuente usada para la promesa.

### 64. No mezclar elegibilidad de stores con ranking de stores

- Riesgo: Usar una sola lógica para decidir qué comercios son candidatos y en qué orden mostrarlos, generando resultados poco explicables, filtros inconsistentes o exposición de stores que en realidad no deberían participar.
- Regla: La elegibilidad define el conjunto de stores válidos; el ranking define su orden relativo. Ambas etapas deben estar separadas, ser auditables y tener criterios explícitos.

### 65. No dejar ambigua la fuente de verdad de la promesa al usuario

- Riesgo: Que Search & Discovery, Store Ranking & Promising, Deliveries, Supply-Demand Balancing o frontends distintos calculen tiempos estimados o disponibilidad prometida con reglas diferentes.
- Regla: Debe existir una política explícita sobre qué módulo o composición de módulos determina la promesa operativa mostrada al usuario y cómo se snapshottea esa promesa en checkout u order cuando corresponda.

### 66. No dejar búsquedas, discovery y ranking sin gobernanza común

- Riesgo: Que Search & Discovery Engine, Discovery Surfaces & Merchandising, Personalization, Product Ranking Scores y Store Ranking & Promising evolucionen por separado y generen experiencias incoherentes entre home, búsqueda, listados y superficies comerciales.
- Regla: Debe existir una estrategia común de discovery que defina qué componentes filtran, cuáles rankean, cuáles personalizan, cuáles impulsan comercialmente y cómo se resuelven conflictos entre ellos.

### 67. No automatizar decisiones sensibles sin capacidad de override operativo

- Riesgo: Que automatizaciones o motores de decisión controlen promociones, journeys, ranking, pricing o promesas sin mecanismos de intervención manual ante incidentes, campañas especiales, contingencias operativas o errores de configuración.
- Regla: Toda automatización o decisión de alto impacto debe contemplar override manual, feature flag, kill switch, fallback seguro y trazabilidad de intervención.

### 68. No confundir superficies operativas con permisos aislados

- Riesgo: Diseñar Partners Web y Platform Console como una sola experiencia con simples ocultamientos por rol, generando navegación caótica, exposición accidental de conceptos internos y fronteras débiles entre operación del partner y operación de la plataforma.
- Regla: Las superficies operativas deben modelarse explícitamente como contextos distintos de uso, navegación y scope; los permisos refinan capacidades dentro de cada superficie, pero no reemplazan la separación de contexto.

### 69. No mezclar contexto platform-scoped con contexto tenant/store-scoped sin guardrails explícitos

- Riesgo: Permitir que usuarios internos o híbridos operen sobre tenants, stores y herramientas globales desde una misma navegación o sesión mental sin separación clara, aumentando errores operativos, filtraciones de datos y acciones sobre el scope equivocado.
- Regla: Toda superficie debe hacer explícito su contexto operativo activo; el cambio entre Platform Console y Partners Web debe ser deliberado, visible y respaldado por validación de scope en backend.

### 70. No diseñar degradación controlada para módulos no esenciales.

- Riesgo: Que la caída de promociones, personalización, ranking, search, BI o motores de decisión bloquee por completo flujos transaccionales que deberían poder continuar de forma degradada.
- Regla: Todo módulo no estrictamente indispensable para completar una transacción debe tener fallback explícito, permitiendo continuar operación con defaults seguros, menor sofisticación o experiencia reducida sin romper la compra, el cobro o el registro del hecho principal.

### 71. No clasificar explícitamente la criticidad operativa de los módulos.

- Riesgo: Tratar todos los módulos como si tuvieran el mismo nivel de importancia operacional, generando sobreingeniería en unos y controles insuficientes en otros.
- Regla: La arquitectura debe clasificar módulos y flujos por nivel de criticidad operativa, financiera y reputacional, para definir con claridad prioridades de disponibilidad, observabilidad, retry, resiliencia, soporte y respuesta ante incidentes.

### 72. No asumir consistencia inmediata en procesos distribuidos.

- Riesgo: Diseñar el sistema como si todos los cambios entre módulos, colas, integraciones y proyecciones ocurrieran instantáneamente y en el mismo orden.
- Regla: Todo flujo multi-módulo o asíncrono debe declarar explícitamente si opera bajo consistencia inmediata o eventual, cuáles son sus estados intermedios válidos, cómo converge y qué mecanismo existe para reconciliar diferencias temporales.

### 73. No separar lectura operativa compleja de escritura transaccional.

- Riesgo: Pretender resolver dashboards, vistas operativas pesadas, búsquedas complejas o interfaces ricas directamente sobre tablas transaccionales canónicas, degradando performance y mantenibilidad.
- Regla: Las escrituras transaccionales y las lecturas complejas deben tener estrategias diferenciadas cuando la carga o complejidad lo exijan, mediante projections, snapshots, read models, cachés o vistas especializadas con ownership claro.

### 74. No diseñar con conciencia de costo operativo y escalabilidad económica.

- Riesgo: Crear flujos técnicamente correctos pero económicamente inviables por exceso de lecturas, escrituras, fan-out, cómputo o dependencia de servicios costosos a medida que crece el volumen.
- Regla: Todo módulo relevante debe considerar desde diseño su costo por operación, frecuencia esperada, estrategia de caching, batching, precomputación o degradación, especialmente en superficies de alto tráfico y componentes con alta repetición.

### 75. No controlar el fan-out y la propagación de eventos.

- Riesgo: Que un solo evento termine disparando demasiados consumidores, side effects, reintentos o reacciones encadenadas difíciles de gobernar, observar y contener.
- Regla: Todo evento relevante debe tener consumidores esperados, límites de propagación, deduplicación, reglas de suscripción y criterios de uso claramente definidos para evitar cascadas, ruido o acoplamiento excesivo.

### 76. No definir política explícita de retry por tipo de operación.

- Riesgo: Reintentar de manera ciega operaciones que no lo toleran, o dejar sin retry flujos que sí podrían recuperarse automáticamente.
- Regla: Cada operación crítica debe clasificar explícitamente si admite retry, bajo qué condiciones, con qué política de backoff, con qué requisito de idempotencia y con qué criterio de escalamiento cuando el retry no resuelve el problema.

### 77. No diferenciar garantías de procesamiento entre operaciones y eventos.

- Riesgo: Diseñar eventos e integraciones asumiendo semánticas de entrega o ejecución que la infraestructura real no garantiza, provocando duplicados, omisiones o falsas expectativas de consistencia.
- Regla: La arquitectura debe distinguir explícitamente entre operaciones que requieren unicidad lógica fuerte e intercambios asíncronos que operan bajo entrega al menos una vez, apoyándose en idempotencia, deduplicación y reconciliación cuando corresponda.

### 78. No aislar adecuadamente fallas de proveedores o integraciones externas.

- Riesgo: Que una caída, timeout, comportamiento errático o degradación de una pasarela, proveedor fiscal, mensajería o tercero externo contagie al core transaccional del sistema.
- Regla: Toda integración externa crítica debe diseñarse con timeout, circuit breaker, retry controlado, fallback, observabilidad y aislamiento suficiente para evitar que la indisponibilidad de terceros derribe el flujo principal.

### 79. No versionar contratos externos y públicos.

- Riesgo: Romper compatibilidad con apps móviles, frontends, integraciones o consumidores externos al modificar DTOs, endpoints, eventos públicos o payloads sin estrategia evolutiva.
- Regla: Todo contrato externo o públicamente consumido debe tener política de versionado, compatibilidad hacia atrás, deprecación y migración gradual, evitando cambios destructivos sin transición explícita.

### 80. No tratar las migraciones de datos y contratos como parte de la arquitectura.

- Riesgo: Evolucionar modelos, relaciones o estructuras críticas sin prever el impacto sobre datos existentes, consumers activos y lógica histórica en producción.
- Regla: Toda evolución relevante del modelo debe contemplar plan de migración, compatibilidad temporal, estrategia de transición y validación de integridad antes de asumir el nuevo esquema como único estado válido.

### 81. No definir frontera clara entre automatización y control humano.

- Riesgo: Permitir que automatizaciones, motores de decisión o workflows actúen sobre operaciones sensibles sin mecanismos claros de revisión, override o intervención ante contingencias.
- Regla: Toda automatización de alto impacto operativo, financiero o reputacional debe definir explícitamente cuándo actúa sola, cuándo requiere aprobación, cuándo admite override y cómo se registra dicha intervención.

### 82. No diseñar trazabilidad apta para investigación operativa o forense.

- Riesgo: Contar con logs o auditoría insuficientes para reconstruir correctamente incidentes, errores, fraude, decisiones automatizadas o disputas financieras.
- Regla: Toda operación sensible debe dejar trazabilidad suficiente para responder quién actuó, sobre qué entidad, en qué contexto, con qué inputs, bajo qué reglas, qué decisión se tomó y cuál fue el resultado observado.

### 83. No distinguir dinero representado internamente de dinero realmente movido externamente.

- Riesgo: Confundir el estado económico interno del sistema con el estado real en pasarelas, bancos o medios externos, generando errores conceptuales en conciliación, saldos o liquidaciones.
- Regla: La arquitectura financiera debe distinguir explícitamente entre representación interna, obligación económica, liquidación calculada y movimiento externo efectivamente ejecutado, con puentes claros de conciliación entre capas.

### 84. No modelar explícitamente estados pendientes, intermedios o disputados en flujos financieros.

- Riesgo: Simplificar pagos, refunds, liquidaciones o payouts como si solo existieran estados finales, ocultando incertidumbre operativa real.
- Regla: Todo flujo financiero debe contemplar estados intermedios, pendientes, observados, fallidos, revertidos, retenidos o disputados cuando aplique, permitiendo una representación fiel del lifecycle económico real.

### 85. No preparar desde diseño una trazabilidad compatible con exigencias regulatorias futuras.

- Riesgo: Que el sistema funcione operativamente hoy, pero no permita mañana responder a auditorías, controles tributarios, investigación interna o requerimientos regulatorios crecientes.
- Regla: Toda operación financiera, fiscal o administrativa sensible debe diseñarse desde el inicio con historial suficiente de configuración, estados, aprobaciones, evidencias y cambios relevantes para soportar control posterior.
