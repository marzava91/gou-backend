# MAPA

Este bloque no representa un dominio funcional de negocio, sino el marco de superficies desde las cuales se consumen las capacidades del sistema. Define contextos de uso, navegación, visibilidad y alcance operativo para distintos actores, sin reemplazar la separación por dominios, scopes, roles y permisos del backend.

### SUPERFICIES ADMINISTRATIVAS / OPERATIVAS INTERNAS

#### Partners Web:

Superficie operativa orientada a tenants y stores para la gestión diaria del negocio dentro de su scope, incluyendo catálogo, pricing, inventario, pedidos, POS, configuraciones permitidas y visibilidad sobre procesos financieros operativos como cobros, liquidaciones, facturación de servicios, payouts e historial económico asociado a su operación.

#### Platform Console:

Superficie operativa interna orientada a la gestión transversal de la plataforma, incluyendo soporte, auditoría, observabilidad, controles de riesgo, configuraciones globales, supervisión financiera, conciliación, gestión de liquidaciones, controles sobre payouts y otras intervenciones cross-tenant sujetas a permisos reforzados.

#### Future Owner Console:

Superficie ejecutiva futura orientada a visibilidad estratégica, indicadores agregados, exposición operativa y financiera, y supervisión de alto nivel sobre desempeño del ecosistema, sin reemplazar las responsabilidades operativas de Partners Web o Platform Console.

### SUPERFICIES TRANSACCIONALES Y LOGÍSTICAS EXTERNAS

#### Shopper Mobile App:

Superficie transaccional orientada a clientes finales para exploración, compra de productos, gestión de carrito, checkout, seguimiento de pedidos y relación comercial con la plataforma.

#### Shopper Web App:

Superficie transaccional web orientada a clientes finales para exploración, compra de productos, gestión de carrito, checkout y seguimiento de pedidos desde navegador.

#### Delivery App:

Superficie operativa orientada a repartidores para la gestión logística de pedidos, incluyendo asignación, aceptación, ejecución de entregas, navegación y cierre operativo de pedidos.

### Nota de alcance

No todas las superficies consumen el backend con la misma semántica de contexto.

- Las superficies administrativas operan sobre scopes organizacionales (tenant/store) y consumen Memberships como base de contexto.
- Las superficies shopper y delivery operan con modelos de actor y contexto distintos, por lo que no se asume que consuman Memberships de la misma forma en el MVP.

---

## TRANSVERSAL CAPABILITIES

Este bloque no representa un dominio funcional de negocio, sino un conjunto de capacidades arquitectónicas transversales que definen estándares, controles y mecanismos compartidos que se aplican en todos los módulos de la plataforma, incluyendo protecciones reforzadas sobre operaciones críticas de seguridad, riesgo y finanzas.

### Error Handling & Resilience:

Define estándares y principios transversales para la gestión de errores, incluyendo su clasificación, estructura de respuestas, diferenciación entre errores recuperables y no recuperables, políticas de retry, compensaciones, reconciliación y resiliencia operacional entre módulos, con especial cuidado en operaciones críticas como pagos, emisión documentaria, liquidaciones y payouts.

### Security & Operational Safeguards:

Define controles mínimos, políticas y estándares de seguridad y resguardo operativo aplicables a toda la plataforma, incluyendo validación, autorización, protección de acciones sensibles, rate limiting, secure defaults y lineamientos de hardening, así como controles reforzados sobre operaciones críticas de impacto financiero o administrativo, tales como aprobación de payouts, cambios de cuentas bancarias, ajustes manuales, emisión o anulación de documentos y segregación de funciones en acciones sensibles.

### Fraud Prevention & Risk Monitoring:

Define criterios, capacidades y lineamientos transversales de detección y gestión de riesgo, incluyendo señales de abuso, monitoreo de anomalías, generación de alertas y aplicación de controles preventivos o correctivos sobre módulos sensibles como pagos, cupones, referidos, cajas y operaciones asistidas, incorporando además señales específicas sobre refunds anómalos, payouts prematuros, contracargos, cambios sospechosos de cuentas de abono, comportamiento riesgoso por tenant y patrones financieros inusuales.

### Observability & Operational Traceability:

Define lineamientos y estándares de telemetría, trazabilidad y monitoreo transversal, incluyendo logging estructurado, métricas, trazas distribuidas, correlación de eventos, health checks y capacidades de detección de fallos, degradaciones e incidentes operativos, asegurando trazabilidad reforzada sobre eventos críticos como autorizaciones, pagos, refunds, liquidaciones, payouts, cambios de configuración sensible y acciones manuales con impacto financiero.

### Configuration & Feature Flags:

Gestiona parámetros dinámicos y flags de activación que permiten modificar comportamiento del sistema sin despliegues, habilitando control progresivo, rollback seguro y experimentación controlada, incluyendo activación gradual de políticas de riesgo, hold windows, validaciones reforzadas y automatizaciones sensibles.

### Operational Reliability & Resilience Model:

Define el modelo transversal de confiabilidad operativa de la plataforma, estableciendo principios, niveles de criticidad y mecanismos obligatorios para garantizar continuidad, consistencia y control en escenarios reales de producción. Incluye:

- Clasificación de criticidad de módulos y flujos (transaccional, operativo, optimización, analítico), determinando prioridades de disponibilidad, tolerancia a fallos y estrategias de resiliencia.
- Definición de estrategias de degradación controlada (graceful degradation), permitiendo que funcionalidades no críticas fallen sin bloquear operaciones esenciales como checkout, pagos u órdenes.
- Políticas de retry diferenciadas por tipo de operación, incluyendo backoff, límites, condiciones de reintento y relación con idempotencia.
- Lineamientos de idempotencia para operaciones críticas, garantizando que acciones como pagos, refunds, emisión documentaria, confirmaciones o eventos no se dupliquen ante retries o concurrencia.
- Definición explícita de consistencia eventual en flujos distribuidos, incluyendo estados intermedios válidos, convergencia esperada y manejo de asincronía entre módulos.
- Estrategias de reconciliación para procesos críticos, permitiendo detectar, corregir o compensar inconsistencias en pagos, inventario, liquidaciones, notificaciones o integraciones externas.
- Estándares mínimos de observabilidad operativa, incluyendo logging estructurado, métricas clave, trazabilidad de requests y eventos, y visibilidad sobre fallos, retries, degradaciones y decisiones automatizadas.
- Definición de comportamiento ante fallos de integraciones externas, incluyendo timeouts, circuit breakers, fallback y aislamiento de dependencias.
- Lineamientos para manejo de concurrencia en entidades críticas, incluyendo locking, versionado, compare-and-set o estrategias de compensación.
- Principios de diseño para evitar cascadas de fallo, fan-out descontrolado de eventos y acoplamiento excesivo entre módulos críticos.

---

## 1. IDENTITY & ACCESS

#### Auth:

Gestiona autenticación, sesiones y verificación de identidad del usuario mediante proveedores externos o internos, resolviendo el contexto seguro de acceso a la plataforma.

#### Users:

Representa la identidad global de una persona dentro de la plataforma, independiente de su pertenencia a tenants, tiendas o roles operativos.

#### Memberships:

Gestiona la pertenencia formal de un usuario a organizaciones, tenants o tiendas, estableciendo el contexto operativo donde puede actuar.

#### Roles:

Define los roles operativos disponibles dentro de cada scope organizacional, determinando las capacidades generales de acceso.

#### Grants:

Gestiona excepciones (overrides) o permisos específicos otorgados a usuarios o roles sobre módulos, recursos o acciones concretas.

#### Invitations:

Gestiona invitaciones de acceso a la plataforma para incorporar usuarios a organizaciones, tenants o tiendas con roles iniciales propuestos, controlando su aceptación, expiración y conversión en memberships activas.

---

## 2. CORE BUSINESS

### Tenants:

Representa cada organización o negocio que opera dentro de la plataforma, estableciendo el límite lógico principal de datos y operaciones, así como su identidad comercial y contractual base frente al ecosistema, incluyendo información legal principal, estado de habilitación y datos maestros requeridos para relacionamiento comercial y financiero con la plataforma.

### Stores:

Representa sucursales, puntos de venta o centros operativos pertenecientes a un tenant.

### Store Settings:

Configura el comportamiento específico de cada tienda, incluyendo canales de venta, horarios, modalidades de entrega o retiro.

### Fiscal Configuration:

Gestiona configuraciones fiscales, tributarias y documentarias por tenant o tienda, incluyendo numeración, series, impuestos, condición fiscal, datos de facturación, reglas tributarias aplicables y atributos requeridos para la emisión de comprobantes y cumplimiento formal frente a terceros y autoridades.

### Operational Settings:

Centraliza parámetros operativos del negocio como tiempos de preparación, ventanas de despacho, límites logísticos y reglas internas.

---

## 3. COMMERCIAL MASTER DATA

#### Catalog:

Administra el catálogo maestro de productos incluyendo categorías, marcas, atributos, relaciones y estructura base del surtido.

#### Pricing:

Gestiona listas de precios, precios por tienda, tiers y reglas comerciales base que determinan el valor de venta de los productos, incluyendo versionado, vigencia temporal y trazabilidad histórica de cambios de precio.

#### Assortment / Availability:

Gestiona qué productos del catálogo están habilitados para ser ofrecidos por tienda, canal o contexto comercial, independiente del inventario operativo, permitiendo controlar disponibilidad estructural, surtido activo, exclusiones, vigencias y reglas de visibilidad por superficie de venta.

#### Customers:

Administra la entidad comercial del cliente, incluyendo información de contacto, direcciones, preferencias y estado relacional.

#### Suppliers:

Administra proveedores, contactos y relaciones de abastecimiento asociadas al suministro de productos.

---

## 4. COMMERCIAL MANAGEMENT

### 4.1 Commercial Strategy & Configuration

#### Promotions:

Define estrategias y reglas comerciales orientadas a incentivar conversión, ticket o rotación mediante beneficios aplicables a productos, pedidos, clientes o segmentos, incluyendo condiciones de elegibilidad, vigencia, combinaciones y contexto de activación dentro del proceso de compra.

#### Coupons:

Gestiona instancias emitidas de beneficios o incentivos asignados a usuarios o contextos específicos, que materializan promociones, rewards o compensaciones definidas en el sistema, incluyendo emisión por eventos o campañas, estado, restricciones de uso, expiración y aplicación en transacciones.

#### Campaigns:

Gestiona campañas comerciales con objetivo, vigencia, audiencia, productos involucrados y reglas promocionales para coordinar acciones de marketing o ventas.

#### Push Campaigns Management:

Gestiona campañas de notificaciones push con audiencia, contenido, programación y reglas de activación orientadas a objetivos comerciales.

#### Benefit Catalog:

Gestiona el catálogo estandarizado de tipos de beneficios e incentivos que pueden ser utilizados por programas de lealtad, promociones, campañas u otras estrategias del ecosistema, definiendo su naturaleza, parámetros configurables, límites, combinabilidad y dominios de aplicación, como descuentos, cashback, visibilidad, prioridad operativa, comisiones o perks logísticos.

#### Loyalty & Incentive Programs:

Gestiona la definición, configuración y evaluación de programas de lealtad e incentivos para los distintos actores del ecosistema (clientes, riders, partners), mediante modelos declarativos basados en reglas, niveles (tiers), condiciones de elegibilidad y ciclos de evaluación continua. Se apoya en beneficios abstractos definidos en el catálogo de beneficios y asigna estados, niveles o rewards desacoplados de su ejecución operativa, permitiendo evolución, simulación y optimización de estrategias alineadas a objetivos comerciales y operativos.

#### Gamification:

Gestiona dinámicas de juego aplicadas al comportamiento del usuario, incluyendo misiones, retos, streaks, logros y recompensas, orientadas a aumentar engagement, frecuencia y retención.

#### Incentive Budgeting & Control:

Gestiona presupuestos de incentivos y promociones a nivel de campaña, segmento o período, controlando gasto, límites, pacing y retorno esperado, asegurando sostenibilidad financiera de las estrategias de crecimiento.

### 4.2 Commercial Experience & Merchandising

#### Discovery Surfaces & Merchandising:

Gestiona las superficies de descubrimiento y exposición comercial dentro de la plataforma, como home, banners, carruseles, vitrinas, hubs temáticos, landings, slots promocionales o módulos editoriales, definiendo qué contenido, productos, listas, recetas o campañas se muestran, en qué contexto, con qué prioridad y bajo qué reglas de personalización o negocio.

#### Search & Discovery Engine:

Gestiona las reglas, configuraciones y mecanismos que determinan cómo los productos, listas, recetas o tiendas son buscados, ordenados, sugeridos y descubiertos por el usuario incluyendo relevancia, autocompletado, sinónimos, tolerancia a errores, filtros, boosting comercial y personalización basada en contexto y señales analíticas.

#### Product Tagging:

Permite etiquetar productos manual o automáticamente para clasificación operativa, campañas, merchandising o gestión del surtido.

#### Customer Tagging:

Permite etiquetar clientes manual o automáticamente para marketing, CRM, segmentación comercial o automatización de campañas.

#### Favorites:

Gestiona productos marcados por el usuario como favoritos, wishlist o afinidad persistente para acceso rápido, personalización y activaciones comerciales.

#### Saved Lists:

Gestiona listas personales o reutilizables de productos creadas manualmente por el usuario o generadas desde carritos, compras anteriores, recetas o acciones de compartición, permitiendo organizarlas, nombrarlas, reutilizarlas y convertirlas posteriormente en carrito para una nueva compra.

#### Shareable Lists:

Gestiona la capacidad de compartir listas de productos entre usuarios como parte de la lógica funcional del dominio de listas, incluyendo control de acceso, permisos, colaboración, ownership y mecanismos de invitación, independientemente del medio técnico utilizado para el intercambio.

#### Recipe & Bundle Templates:

Sistema que ofrece listas predefinidas basadas en recetas, ocasiones o misiones de compra.

#### Feedback & Reputation:

Gestiona la captura, orquestación, moderación y agregación de calificaciones y reseñas sobre actores del ecosistema (stores, riders, productos y plataforma), incluyendo ratings, comentarios, recomendación (NPS-like), respuestas del evaluado y generación de señales agregadas de confianza utilizadas en discovery, decisión de compra y asignación operativa.

### 4.3 Decisioning & Optimization

#### Segmentation Rules:

Define reglas de negocio para asignar etiquetas o activar campañas basadas en condiciones comerciales o analíticas.

#### Policy / Rule Engine:

Gestiona la definición, evaluación y resolución de reglas declarativas que determinan cuándo, cómo y bajo qué prioridad se activan beneficios, incentivos o efectos comerciales sobre actores, productos, pedidos o contextos específicos, permitiendo una ejecución configurable, auditable y desacoplada del código de negocio.

#### User Lifecycle Management:

Gestiona el estado del usuario dentro de su ciclo de vida en la plataforma (nuevo, activado, recurrente, en riesgo, inactivo, recuperado), incluyendo definición de etapas, reglas de transición, scoring asociado y activación de acciones automáticas orientadas a adquisición, activación, retención y reactivación.

#### Personalization Engine:

Gestiona la personalización dinámica de la experiencia del usuario en la plataforma, incluyendo ranking de productos, recomendaciones, promociones, contenido y ofertas, basadas en contexto, comportamiento, historial y señales analíticas.

#### Store Ranking & Promising:

Gestiona la selección, priorización y orden de exposición de stores o comercios candidatos para un usuario en función de señales geográficas, cobertura, tiempo estimado de entrega, capacidad operativa, disponibilidad logística, reputación, relevancia comercial y contexto del usuario, equilibrando conversión, experiencia, factibilidad de cumplimiento y objetivos del negocio.

#### Offer Decision Engine:

Gestiona la selección de la mejor oferta, incentivo, promoción o beneficio a presentar o aplicar en un contexto comercial específico, evaluando múltiples alternativas bajo criterios como probabilidad de conversión, costo esperado, margen, elegibilidad, saturación promocional, prioridad comercial y objetivo de negocio, con el fin de maximizar el resultado incremental de cada interacción o transacción sin encargarse de la orquestación global posterior.

#### Dynamic Pricing Optimization:

Gestiona la determinación dinámica de precios efectivos a partir de precios base definidos en Pricing, aplicando ajustes en tiempo real basados en señales de demanda, elasticidad, stock, comportamiento del usuario o contexto comercial, con el objetivo de optimizar conversión, margen o rotación sin alterar la estructura base de precios.

### 4.4 Execution, Orchestration & Relationship Activation

#### Benefit Enforcement:

Gestiona la materialización dinámica de beneficios definidos por programas de lealtad, promociones, campañas u otros sistemas de incentivos, traduciendo beneficios abstractos en efectos concretos sobre el comportamiento del sistema. Orquesta su aplicación consistente en múltiples dominios como pricing, ranking, visibilidad, asignación operativa, comisiones o perks transaccionales, respetando prioridades, conflictos, combinaciones y políticas vigentes, y asegurando una ejecución desacoplada, auditable y configurable en tiempo real.

#### User Journeys / CRM:

Gestiona flujos automatizados de interacción con usuarios basados en eventos, estados del lifecycle o comportamiento, permitiendo orquestar secuencias de acciones como notificaciones, incentivos, recomendaciones o recordatorios a lo largo del tiempo.

---

## 5. OPERATIONS

#### Inventory:

Gestiona el estado actual del inventario por tienda incluyendo stock disponible, reservado, movimientos y ajustes operativos.

#### Stock Counts:

Gestiona conteos físicos de inventario completos o parciales utilizados para conciliación entre stock teórico y stock real.

#### Replenishment:

Gestiona procesos de reposición de inventario desde detección de necesidades hasta sugerencias de compra revisables.

#### Carts:

Gestiona carritos activos de compra incluyendo ítems, cantidades, totales, vigencia, canal, sincronización entre dispositivos y conversión a pedido, sirviendo como contenedor transaccional temporal validado antes del checkout.

#### Checkout Sessions:

Coordina la validación final de precio, stock, promociones, entrega y medio de pago antes de convertir el carrito en orden. Incluye la resolución del precio efectivo del pedido mediante la evaluación de precios base, promociones, cupones, beneficios, impuestos y reglas aplicables en tiempo real.

#### Abandoned Cart Recovery:

Detecta carritos inactivos o abandonados, genera eventos de recuperación y habilita recordatorios comerciales.

#### Orders:

Gestiona pedidos comerciales del cliente incluyendo items, estados, eventos y snapshots operativos del pedido.

#### Deliveries:

Gestiona la ejecución logística de los pedidos incluyendo asignación de rider, rutas, eventos de entrega y confirmación de recepción.

#### Delivery Matching & Selection:

Gestiona la asignación de pedidos a repartidores, incluyendo matching automático basado en proximidad, desempeño y disponibilidad, así como selección asistida o preferencial por parte del usuario en escenarios controlados.

#### POS:

Gestiona ventas presenciales incluyendo sesiones de caja, tickets de venta y cobros en punto de venta.

#### Cash & Expenses:

Gestiona cajas físicas o lógicas incluyendo arqueos, movimientos de efectivo y egresos operativos.

#### Agent Transactions:

Gestiona operaciones de agente y servicios de caja como depósitos, retiros, recaudos o transferencias asistidas, incluyendo efectivo entregado o recibido, comisión aplicada, referencia externa y trazabilidad operativa.

#### Supply-Demand Balancing:

Gestiona el equilibrio dinámico entre oferta y demanda en tiempo real dentro de la operación, evaluando disponibilidad de inventario, capacidad de preparación, disponibilidad de riders y volumen de pedidos, para ajustar visibilidad, tiempos estimados, priorización de pedidos, asignación logística e incentivos operativos, optimizando eficiencia y experiencia del usuario.

---

## 6. FINANCIAL

### Payments

Gestiona cobros asociados a pedidos o ventas POS incluyendo intentos, autorizaciones, capturas, confirmaciones, rechazos, reversos, interacción con pasarelas y trazabilidad completa del estado transaccional del pago.

### Refunds

Gestiona devoluciones totales o parciales de pagos incluyendo validación, ejecución, motivo, compensaciones, impacto financiero posterior y trazabilidad del ciclo de vida del refund.

### Fiscal Sales Documents

Gestiona emisión y registro de comprobantes fiscales o electrónicos asociados a ventas al cliente final, incluyendo series, correlativos, estado de emisión y vínculo con la transacción comercial originante.

### Partner Billing / Service Invoicing

Gestiona la facturación de los servicios prestados por la plataforma a tenants u otros actores del ecosistema, incluyendo comisión, cargos fijos o variables, base imponible, impuestos aplicables, emisión automática por período y notas de ajuste asociadas.

### Commission Rules

Gestiona reglas económicas y contractuales que determinan cómo se calcula la comisión de la plataforma y otros cargos sobre transacciones, considerando vigencias, scopes, excepciones y trazabilidad histórica.

### Settlements

Gestiona la determinación financiera de montos a distribuir entre participantes del ecosistema a partir de transacciones elegibles, incluyendo cálculo de bruto, comisión, impuestos sobre el servicio, descuentos, ajustes, retenciones y neto liquidable.

### Partner Ledger

Gestiona el registro auditable de movimientos financieros devengados y liquidados asociados a tenants, stores, riders y plataforma, permitiendo reconstruir saldos, obligaciones, ajustes, payouts, refunds y eventos económicos relevantes sin depender del estado agregado de otras entidades.

### Payouts

Gestiona la programación, generación, aprobación, ejecución y seguimiento de abonos hacia tenants u otros actores, incluyendo ciclos de corte, instrucciones de pago, estados operativos, fallas, reintentos y confirmación de desembolso.

### Reconciliation

Gestiona la conciliación entre pagos capturados, movimientos internos, liquidaciones, payouts, extractos bancarios, reportes de pasarela y comprobantes fiscales, detectando diferencias, faltantes, duplicados o inconsistencias operativas y financieras.

### Reserve / Hold Management

Gestiona fondos temporalmente retenidos por reglas de riesgo, contracargos, refunds tardíos o políticas de liquidación, incluyendo ventanas de liberación, porcentajes retenidos y aplicación contra saldos futuros.

### Purchases

Gestiona órdenes de compra, recepción de mercadería y validación contra lo solicitado.

### Accounts Payable

Gestiona obligaciones pendientes con proveedores derivadas de compras, recepciones o facturación.

### Tips & Gratifications

Gestiona propinas opcionales asociadas a pedidos, permitiendo asignación hacia riders y/o stores, incluyendo cálculo, registro, distribución y conciliación dentro de los flujos financieros.

---

## 7. COMMUNICATIONS

#### Conversations / Chat:

Gestiona conversaciones entre usuarios, soporte, tiendas, riders o staff incluyendo mensajes, adjuntos, estados y trazabilidad.

#### Calls:

Gestiona llamadas iniciadas desde la plataforma incluyendo eventos de llamada y mecanismos de anonimización de contacto.

#### Contact Privacy / Relay:

Protege datos sensibles del usuario mediante alias, números enmascarados y reglas de exposición controlada entre participantes.

#### Support Threads:

Gestiona hilos de atención vinculados a pedidos, reclamos, incidentes o consultas del cliente.

#### Communication Templates:

Administra plantillas y mensajes base para comunicaciones transaccionales, operativas o de soporte.

#### Triggered Notifications:

Gestiona la activación de notificaciones basadas en eventos de negocio, estados del sistema o reglas definidas, determinando cuándo, a quién, con qué contenido y bajo qué condiciones se debe enviar una comunicación, desacoplado de la infraestructura de envío.

#### Conversational Commerce:

Gestiona experiencias de compra asistida a través de canales conversacionales como WhatsApp u otros mensajeros, interpretando intenciones del usuario, resolviendo productos o listas candidatas, orquestando acciones sobre carrito y checkout, facilitando confirmaciones, pagos y seguimiento del pedido, y escalando a atención humana cuando corresponda, sin reemplazar la verdad transaccional de los módulos core.

---

## 8. ANALYTICS

### 8.1 Core Analytics

#### Reporting:

Consolida métricas históricas y permite generación de reportes analíticos desacoplados de las transacciones online.

#### Dashboard:

Presenta indicadores clave del negocio mediante vistas ejecutivas u operativas para monitoreo rápido.

#### Alerts:

Gestiona alertas automáticas generadas a partir de umbrales, anomalías o reglas operativas, técnicas o de riesgo, para detectar incidentes, comportamientos no esperados y situaciones que requieren atención o intervención.

### 8.2 Commerce Funnel Analytics

#### Cart & Checkout Funnels:

Consolida métricas de creación de carrito, abandono, recuperación, conversión y fricción en checkout.

#### List & Template Usage Funnels:

Consolida métricas de creación, compartición, apertura, importación a carrito y conversión de listas, recetas y bundles.

### 8.3 Search Analytics

#### Search History:

Consolida y preserva el historial de búsquedas realizadas por el usuario como insumo de análisis conductual, personalización, autocompletado, optimización de discovery y generación de señales comerciales reutilizables.

#### Search Analytics:

Consolida métricas de búsqueda como términos consultados, clicks, resultados obtenidos, refinamientos, búsquedas sin resultado y conversión posterior.

#### Zero-Results Search Monitoring:

Gestiona el seguimiento de búsquedas sin resultado o con baja relevancia para detectar oportunidades de surtido, catálogo o mejora del motor de búsqueda.

## 9. BUSINESS INTELLIGENCE

#### Customer Segmentation Snapshots:

Guarda resultados históricos de segmentación analítica de clientes como RFM, churn risk o valor esperado.

#### Product Behavior Snapshots:

Guarda métricas de comportamiento de productos como búsquedas, vistas, agregados al carrito y compras.

#### Product Ranking Scores:

Calcula puntajes de relevancia comercial utilizados para ordenar productos en catálogo, búsqueda o recomendaciones.

#### Product Recommendation Signals:

Genera señales analíticas para recomendaciones, cross-selling, upselling y personalización del marketplace.

#### Product Health Scores:

Calcula un puntaje integral de desempeño del producto combinando ventas, conversión, rotación, margen y disponibilidad de stock.

#### Product Classification Snapshots:

Guarda clasificaciones estratégicas de productos como BCG, ABC, rotación o estacionalidad.

#### Forecast Snapshots:

Guarda proyecciones de demanda o ventas calculadas por producto, tienda y período.

#### Reorder Recommendations:

Guarda recomendaciones calculadas de reabastecimiento basadas en demanda proyectada y reglas operativas.

#### Campaign Performance Snapshots:

Guarda resultados históricos de desempeño de campañas comerciales.

#### Push Campaigns Performance Snapshots:

Guarda resultados históricos de campañas push incluyendo envíos, aperturas, clicks y conversiones.

#### Cart Recovery Snapshots:

Guarda resultados históricos de recuperación de carritos, tiempos de abandono, recordatorios enviados y revenue recuperado.

#### Reorder Intent Signals:

Genera señales de intención de recompra basadas en frecuencia de compra, patrones históricos y proximidad esperada de reposición.

#### List Adoption Snapshots:

Guarda métricas históricas de uso de listas guardadas y compartidas.

#### Recipe & Bundle Performance Snapshots:

Guarda métricas de visualización, add-to-cart, conversión y revenue generado por recetas o bundles.

#### Household Shopping Signals:

Genera señales de compra recurrente, compra colaborativa o patrones por tipo de canasta.

#### Search Demand Snapshots:

Guarda resultados históricos de demanda expresada en búsquedas, incluyendo términos frecuentes, tendencias emergentes y queries sin cobertura comercial.

#### Assortment Gap Signals:

Genera señales de oportunidad de expansión de mix, catálogo o partners a partir de búsquedas fallidas, baja cobertura o sustitución insuficiente.

#### Loyalty Performance Snapshots:

Guarda métricas de desempeño de programas de lealtad incluyendo impacto en retención, frecuencia de compra, ticket promedio y ROI de incentivos.

#### Actor Scoring Snapshots:

Guarda puntajes agregados de desempeño para clientes, riders y partners utilizados para clasificación en niveles y activación de beneficios.

#### Referral Performance Snapshots:

Guarda métricas de desempeño del programa de referidos incluyendo adquisición, conversión, revenue generado y costo de incentivos.

#### Decision Signals:

Gestiona señales analíticas normalizadas derivadas de comportamiento, desempeño, contexto o proyecciones, utilizadas como insumo reutilizable por motores de reglas, automatización, personalización y decisiones operativas o comerciales.

## 10. PLATFORM / CROSS-CUTTING

### Audit:

Registra acciones relevantes sobre entidades críticas para trazabilidad, control y revisión posterior de operaciones sensibles de negocio, seguridad o impacto financiero, incluyendo actor, contexto, entidad afectada, cambio relevante y resultado de la acción, con cobertura explícita sobre cálculos de settlement, aprobaciones de payout, cambios de cuentas bancarias, ajustes manuales, emisión o anulación de documentos y otras intervenciones sensibles.

### Events:

Gestiona el backbone de eventos de dominio del sistema, permitiendo registrar, persistir, publicar y distribuir hechos relevantes de negocio de forma confiable y desacoplada entre módulos e integraciones externas. Soporta orquestación asíncrona, trazabilidad, reintentos, idempotencia y replay de eventos, incluyendo eventos críticos asociados a pagos, refunds, liquidaciones, payouts, emisión documentaria y cambios de configuración sensible.

### Idempotency:

Implementa mecanismos para prevenir la duplicación accidental de operaciones críticas como cobros, refunds, emisión de documentos, confirmaciones, payouts, conciliaciones y otras acciones sensibles, garantizando consistencia en escenarios de retry, concurrencia o reentrega de eventos externos.

### Notifications:

Gestiona la infraestructura de envío de comunicaciones, incluyendo enrutamiento por canal (push, email, SMS), integración con proveedores, renderizado de templates, retries, estados de entrega y tracking técnico.

### Files:

Gestiona almacenamiento, acceso y control de archivos y evidencias asociadas a entidades del sistema, incluyendo versionado, permisos y trazabilidad de uso, permitiendo además conservar soportes operativos o regulatorios como constancias, reportes de conciliación, archivos de payout, evidencias de aprobación y documentos asociados a procesos sensibles.

### Observability:

Centraliza la implementación técnica de telemetría, incluyendo logs, métricas, trazas, health checks y monitoreo del backend, habilitando la detección de fallos, cuellos de botella y comportamiento anómalo del sistema.

### Deep Linking & Routing:

Gestiona la resolución técnica de navegación hacia contenido específico en web o app a partir de rutas profundas, incluyendo mapeo de destinos, parámetros dinámicos y reglas de redirección según canal o dispositivo.

### Shared Links:

Gestiona la infraestructura de generación, resolución y control de enlaces compartibles para entidades del sistema, incluyendo tokens, slugs, expiración, permisos y redirección base, desacoplado de la lógica de negocio.

### Link Attribution & Tracking:

Gestiona la captura y análisis de eventos asociados al uso de enlaces compartidos, incluyendo origen, canal, aperturas, clicks y conversiones, proporcionando señales de atribución reutilizables por módulos de negocio.

### Referral Program:

Gestiona programas de adquisición mediante referidos, definiendo relaciones entre usuarios, reglas de elegibilidad, eventos de activación y asignación de recompensas, apoyándose en capacidades de links y tracking.

### Experimentation / A-B Testing:

Gestiona la ejecución de pruebas controladas sobre features, ranking, precios o incentivos, permitiendo validación experimental y optimización continua basada en datos.

### Automation Orchestration:

Orquesta la ejecución de decisiones y acciones automáticas o semiautomáticas a partir de eventos, señales y reglas, coordinando flujos operativos o comerciales entre múltiples módulos, incluyendo procesos sensibles como aprobación escalonada, generación de liquidaciones, emisión documentaria, ejecución de payouts, reintentos controlados y compensaciones operativas.

### Virality & Invite System:

Gestiona mecanismos de crecimiento orgánico mediante invitaciones, compartición de contenido y acciones sociales, incluyendo modelos de propagación, aceptación y optimización de loops virales.
