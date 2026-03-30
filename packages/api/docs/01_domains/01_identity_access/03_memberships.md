# MEMBERSHIPS

## 1. Propósito del submódulo

Memberships gestiona la pertenencia formal de un User a un scope organizacional de la plataforma, definiendo dónde puede actuar dentro del ecosistema y cuál es su contexto operativo disponible.

Resuelve:
- vínculo formal entre userId y scope organizacional
- pertenencia a nivel tenant y/o store
- activación, suspensión, revocación y expiración de la pertenencia
- selección de contexto operativo activo cuando existan múltiples memberships
- conversión de invitaciones aceptadas en memberships efectivas
- trazabilidad de cambios de pertenencia

No resuelve:
- identidad canónica de la persona → Users
- autenticación o sesiones → Auth
- definición de roles operativos → Roles
- permisos específicos u overrides → Grants
- existencia del tenant o store → Core Business
- navegación o UX de superficie operativa → Partners Web / Platform Console como contextos de consumo, no como owner del dato

No define por sí mismo:
- permisos efectivos finales
- autorización fina sobre recursos concretos
- identidad externa del usuario
- configuración operativa del tenant o store

## 2. Definición canónica

Una Membership representa la relación formal y persistente entre un User y un scope organizacional válido del sistema, habilitando su actuación dentro de ese scope bajo reglas de estado, vigencia y activación.

Su rol dentro del sistema es separar claramente:
- quién es la persona → Users
- cómo accede → Auth
- dónde puede actuar → Memberships
- qué puede hacer → Roles / Grants

Otros módulos dependen conceptualmente de Memberships para:
- resolver el contexto operativo activo
- validar si el usuario pertenece al tenant/store invocado
- saber si una invitación ya fue materializada
- proyectar roles y permisos dentro de un scope válido

Esto está alineado con tu mapa y con la regla de definir ownership y scope explícitos para cada modelo .

## 3. Fronteras

### Pertenece a Memberships
- relación userId -> scope organizacional
- tipo de scope de la pertenencia
- estado de la membership
- vigencia y timestamps operativos relevantes
- activación o selección del contexto operativo activo
- trazabilidad de cambios de estado
- vínculo con invitación origen cuando aplique
- reglas de compatibilidad entre memberships
- políticas de unicidad por scope

### No pertenece a Memberships
- perfil del usuario → Users
- credenciales, login, refresh, sesión → Auth
- rol canónico asignado a la membership → Roles
- overrides o permisos excepcionales → Grants
- invitación como objeto previo a aceptación → Invitations
- ownership de tenant/store → Core Business
- cálculo de permisos efectivos en UI → capa de autorización / access resolution
- snapshot de contexto operativo para lectura compleja → projections/read models si luego los necesitas

## 4. Decisiones estructurales

### 4.1 ¿Qué representa exactamente una Membership?

#### Decisión
Una Membership representa la pertenencia formal de un User a un scope organizacional habilitado del sistema.

#### Justificación
Sin Membership no existe contexto organizacional válido, aunque el usuario exista y esté autenticado.

#### Impacto
Auth no puede inferir contexto operativo final por sí solo; siempre debe resolverse contra memberships válidas.

### 4.2 ¿Cuál será el modelo de scope en el MVP?

#### Decisión
El MVP soportará memberships de dos tipos:
- tenant-scoped
- store-scoped

No habrá una membership “ambigua” que a veces signifique tenant y a veces store.

#### Justificación
Debes evitar ambigüedad de scope. Tu arquitectura exige que cada modelo responda explícitamente en qué scope existe y quién lo puede mutar .

#### Impacto
La entidad debe declarar explícitamente:
- scopeType
- tenantId
- storeId cuando aplique

### 4.3 ¿Una membership store-scoped implica tenant-scoped?

#### Decisión
Sí a nivel relacional de negocio, pero no como duplicación automática obligatoria de registros.

Regla:
- toda store-scoped membership debe pertenecer a un storeId que a su vez pertenece a un tenantId
- la membership store-scoped referencia explícitamente ambos: tenantId y storeId
- no se crea automáticamente una segunda membership tenant-scoped salvo que el negocio la requiera explícitamente

#### Justificación
Evitas duplicar relaciones “por comodidad”, uno de tus riesgos base .

#### Impacto
Store membership queda contextualizada dentro de tenant, pero sin inflar el modelo con relaciones redundantes.

### 4.4 ¿Puede un usuario tener múltiples memberships activas?

#### Decisión
Sí. Un User puede tener múltiples memberships activas, incluso en distintos tenants y stores, siempre que no violen reglas de incompatibilidad de negocio.

#### Justificación
Necesitas soportar:
- usuarios internos multi-tenant
- operadores con acceso a varias stores
- context switching deliberado entre scopes

#### Impacto
Debes separar:
- memberships activas disponibles
- membership/contexto activo actual de sesión o superficie

### 4.5 ¿Qué significa “active” exactamente?

#### Decisión
active significa que la membership:
- fue creada válidamente
- no está suspendida
- no fue revocada
- no está expirada
- puede ser usada para resolver contexto operativo

#### Justificación
“Active” no puede ser ambiguo ni equivaler solo a “registro existe”.

#### Impacto
Roles y Grants solo deben proyectarse sobre memberships activas.

### 4.6 ¿Cómo se resuelve el contexto operativo activo?

#### Decisión
Memberships define el conjunto de memberships válidas; el “active context” se resuelve como una selección explícita sobre una membership válida.

No se inferirá automáticamente desde frontend sin validación backend, en línea con tu regla de no dejar el scope a convenciones implícitas o al frontend .

#### Justificación
Separar “membership válida” de “membership activa en esta interacción” evita errores de scope.

#### Impacto
Debe existir una acción explícita tipo:
- set active membership context

### 4.7 ¿Cómo se relaciona Membership con Invitation?

#### Decisión
Invitation no es Membership.
Una invitación aceptada puede convertirse en Membership mediante un flujo explícito de materialización.

#### Justificación
Invitations controla propuesta de acceso, expiración y aceptación; Memberships controla pertenencia efectiva. Eso ya está definido en tu mapa .

#### Impacto
Debe existir trazabilidad:
- invitationId origen, cuando aplique
- evento de conversión claramente definido

### 4.8 ¿Cómo se relaciona Membership con Roles?

#### Decisión
Roles no viven dentro de Membership como definición del submódulo, pero sí se asignan sobre una membership o sobre su scope válido, según el diseño final de Roles.

Membership no calcula permisos; solo provee el contexto sobre el cual Roles y Grants operan.

#### Justificación
Evitas mezclar pertenencia con autorización, consistente con tu regla de no usar permisos para resolver toda la lógica de negocio .

#### Impacto
El submódulo debe exponer identificadores y estado suficiente para que Roles/Grants resuelvan capacidades.

### 4.9 ¿Qué pasa si una membership se suspende o revoca?

#### Decisión
- suspended: preserva la relación histórica pero impide uso operativo
- revoked: cierra formalmente la pertenencia y no puede seguir usándose operativamente
- expired: la pertenencia perdió vigencia temporal
- cualquier contexto activo basado en una membership ya no válida debe invalidarse o forzar re-resolución

#### Justificación
No puedes dejar ambigua la relación entre lifecycle de membership y contexto operativo.

#### Impacto
Auth/session context y access resolution deben reevaluarse cuando cambia el estado de membership.

### 4.10 ¿Cuál es la política de unicidad?

#### Decisión
No puede existir más de una membership vigente equivalente para la misma combinación:
- userId + scopeType + tenantId + storeId(null si no aplica)

Puede existir historial, pero no duplicados activos equivalentes.

#### Justificación
Evita memberships duplicadas, uno de los riesgos que ya identificaste en tu esquema preliminar.

#### Impacto
La base y la capa de aplicación deben proteger unicidad operativa.

## 5. Modelo conceptual

### Entidad principal
- Membership

### Entidades auxiliares
- MembershipScopeReference
- MembershipStatusHistory
- MembershipActivationRecord
- MembershipAuditEvent
- ActiveMembershipContext o projection equivalente si decides separarlo

### Ownership
- Memberships es owner de la relación formal usuario-scope
- Users es owner de la identidad del usuario
- Core Business es owner de tenant/store
- Roles/Grants son owners de autorización

### Source of truth
- verdad canónica de pertenencia formal → Memberships
- verdad canónica de identidad → Users
- verdad canónica del scope organizacional → Tenants / Stores

### Relaciones
- Membership referencia a userId
- Membership referencia a tenantId
- Membership puede referenciar storeId
- Membership puede originarse desde invitationId
- Roles/Grants consumen membership o su scope como base
- Auth/session context consume memberships válidas para resolver contexto

## 6. Invariantes del submódulo

- Una Membership siempre pertenece a un único userId.
- Una Membership siempre pertenece a un scope organizacional explícito.
- Una Membership store-scoped siempre debe referenciar un tenantId consistente con el storeId.
- Una Membership tenant-scoped no requiere storeId.
- No pueden coexistir dos memberships activas equivalentes para el mismo userId y mismo scope exacto.
- Una membership revocada no puede volver a estado active.
- Una membership expirada no puede volver a estado active.
- Una membership suspendida no puede usarse como contexto operativo válido.
- Una invitación no equivale a una membership hasta su materialización explícita.
- Membership no define roles ni grants directamente.
- Auth no debe inferir pertenencia formal sin pasar por Memberships.
- El contexto operativo activo siempre debe derivar de una membership válida.

## 7. Lifecycle

### Estados
- proposed
- pending
- active
- suspended
- revoked
- expired

### Transiciones válidas
- proposed -> pending
- pending -> active
- active -> suspended
- suspended -> active
- active -> revoked
- suspended -> revoked
- pending -> revoked
- active -> expired
- pending -> expired

### Transiciones inválidas
- revoked -> active
- expired -> active
- revoked -> suspended
- expired -> suspended
- active -> pending
- active -> proposed

### Reglas
- proposed solo aplica si decides modelar una pre-membership antes de activación efectiva; si no lo implementas en MVP, se mantiene diferido
- pending no habilita contexto operativo
- active sí habilita contexto operativo
- suspended preserva trazabilidad pero bloquea uso
- revoked cierra la pertenencia de forma definitiva
- expired refleja fin de vigencia temporal
- el cambio de estado debe reevaluar contexto activo y acceso efectivo
- el “active context” no forma parte del lifecycle principal; es una resolución operativa complementaria

## 8. Reglas críticas

- La unicidad operativa debe impedir memberships activas equivalentes duplicadas.
- Toda membership debe tener scope explícito y válido.
- Una membership store-scoped no puede existir sin store válido ni tenant consistente.
- Una membership pendiente no debe otorgar acceso operativo.
- Una membership suspendida o revocada no debe ser seleccionable como contexto activo.
- La aceptación de invitación no debe crear memberships incompatibles sin validación previa.
- Cambios de membership que afecten acceso deben ser auditables.
- La resolución de contexto operativo debe validarse en backend, no en frontend .
- Roles y Grants no deben sustituir la ausencia de Membership.
- El sistema debe distinguir pertenencia formal de contexto activo efectivo.

## 9. Impacto en otros módulos

- Users provee el userId canónico sobre el que se crea la membership.
- Auth autentica al usuario, pero no decide pertenencia; debe resolver contexto contra memberships válidas.
- Invitations puede originar la membership, pero no reemplazarla.
- Roles se asigna sobre un scope válido habilitado por membership.
- Grants no deben usarse para “simular” membresías inexistentes.
- Audit debe registrar creación, activación, suspensión, revocación, expiración y cambios de contexto relevante.
- Partners Web debe operar dentro del scope activo resuelto desde membership, no desde simples parámetros de UI.
- Platform Console puede tener capacidades cross-tenant reforzadas, pero debe seguir validando memberships o mecanismos administrativos equivalentes según superficie y scope .
- Operational surfaces no deben fusionar contextos platform-scoped y tenant/store-scoped sin guardrails explícitos .

## 10. Contratos

### DTOs
- CreateMembershipDto
- ActivateMembershipDto
- SuspendMembershipDto
- RevokeMembershipDto
- ExpireMembershipDto
- SetActiveMembershipContextDto
- GetMembershipByIdParamsDto
- ListMembershipsQueryDto
- ListCurrentUserMembershipsQueryDto
- MembershipResponseDto
- MembershipSummaryDto
- ActiveMembershipContextResponseDto

### Acciones
- create membership
- get membership by id
- list memberships
- list current user memberships
- activate membership
- suspend membership
- revoke membership
- expire membership
- set active membership context

### Acciones administrativas diferidas o restringidas
- transfer membership scope
- bulk revoke memberships
- force activate membership
- repair inconsistent memberships
- reconcile invitation-to-membership conversion

### Errores
- membership_not_found
- duplicate_membership
- invalid_membership_scope
- invalid_membership_transition
- membership_not_active
- membership_already_revoked
- membership_already_expired
- membership_context_denied
- membership_scope_conflict
- invitation_membership_conflict

### Scopes
- self para listar memberships propias y seleccionar contexto válido
- tenant/store admin según política para gestionar memberships dentro de su scope
- platform admin para acciones cross-tenant o reparaciones
- sin confiar en el frontend como fuente de scope efectivo

### Eventos
- membership_created
- membership_activated
- membership_suspended
- membership_revoked
- membership_expired
- active_membership_context_changed

Tus propios lineamientos piden eventos semánticos y no ambiguos, no genéricos tipo membership_updated .

## 11. Diseño de validación

### Familias de prueba
- reglas de negocio
- servicio
- integración
- contrato/endpoint
- E2E mínima

### Escenarios principales
- crear membership válida tenant-scoped
- crear membership válida store-scoped
- activar membership pendiente
- suspender membership activa
- revocar membership activa
- listar memberships del usuario actual
- cambiar contexto activo a una membership válida

### Escenarios inválidos
- crear membership duplicada
- storeId que no pertenece al tenantId indicado
- activar membership revocada
- seleccionar como contexto una membership suspendida
- convertir invitación en membership incompatible
- revocar membership inexistente

### Casos borde
- usuario con múltiples memberships activas en distintos tenants
- usuario con múltiples stores dentro del mismo tenant
- cambio concurrente de contexto y suspensión de membership
- expiración automática mientras la membership estaba activa
- sesión autenticada cuyo contexto activo deja de ser válido

### Seguridad
- no permitir escalamiento de scope por parámetros manipulados
- no permitir selección de contexto no perteneciente al usuario
- no exponer memberships de otros scopes sin autorización
- validar backend de tenant/store activos

### Concurrencia
- creación concurrente de memberships equivalentes
- doble activación simultánea
- suspensión/revocación concurrente
- cambio de active context mientras cambia el estado de la membership

### Criterios de aceptación
- pertenencia formal claramente separada de identidad, auth y permisos
- scope explícito y consistente
- lifecycle documentado y coherente
- unicidad operativa protegida
- contexto activo resuelto de manera segura
- eventos y errores semánticos definidos
- pruebas mínimas automatizadas definidas

## 12. Confiabilidad y hardening

- Idempotencia: creación, activación, revocación y conversión de invitación deben tolerar reintentos seguros cuando corresponda.
- Auditoría: cambios de estado, activación, suspensión, revocación y cambio de contexto deben quedar auditados.
- Observabilidad: métricas de memberships creadas, activadas, suspendidas, revocadas, expiradas y errores de resolución de contexto.
- Rate limiting: no suele ser el principal control aquí, pero sí debe existir sobre endpoints sensibles de administración o cambios repetitivos de contexto si detectas abuso.
- Retry: solo donde la operación sea idempotente o reconciliable.
- Concurrencia: unique constraints, versionado u optimistic locking para evitar duplicados y colisiones.
- Minimización de datos: DTOs y eventos de Memberships no deben propagar PII innecesaria.
- Retención: definir cuánto tiempo se conserva historial de memberships suspendidas, revocadas o expiradas.
- Reconciliación: debe existir estrategia para detectar invitaciones aceptadas sin membership materializada o memberships inconsistentes, alineado con tu modelo transversal de resiliencia y reconciliación .

## 13. Riesgos

### Riesgos de diseño
- mezclar membership con rol o grant
- no definir con claridad tenant-scoped vs store-scoped
- duplicar memberships para representar jerarquía tenant/store
- confundir membership activa con contexto activo
- dejar ambigua la conversión desde invitaciones

### Riesgos de implementación
- crear memberships duplicadas por concurrencia
- validar scope en frontend y no en backend
- permitir storeId inconsistentes con tenantId
- no invalidar contexto activo cuando la membership deja de ser válida
- side effects acoplados directamente al endpoint sin eventos claros

### Riesgos operativos
- usuarios híbridos operando en el scope equivocado
- context switching confuso entre Partners Web y Platform Console
- memberships suspendidas que siguen otorgando acceso efectivo
- inconsistencia eventual entre invitación aceptada, membership creada y roles asociados
- falta de trazabilidad para investigar cambios de acceso

### 14. Decisiones diferidas conscientemente

- memberships temporales con ventanas de vigencia avanzadas
- inheritance explícita tenant -> stores
- transfer de membership entre stores/tenants
- memberships grupales o delegadas
- provisioning masivo y sincronización con directorios externos
- políticas avanzadas de prioridad entre múltiples memberships activas
- modelado completo de proposed si decides no usarlo en el MVP inicial

## 15. Definition of Done

- Memberships definido como submódulo de pertenencia formal, separado de Users/Auth/Roles/Grants
- scope tenant/store claramente modelado
- decisiones de unicidad y compatibilidad cerradas
- lifecycle de membership cerrado
- invariantes documentados
- impacto en otros módulos documentado
- DTOs, acciones, errores, scopes y eventos definidos
- estrategia de contexto activo resuelta
- diseño de validación mínimo definido
- hardening mínimo definido
- riesgos principales identificados
- decisiones diferidas conscientemente registradas