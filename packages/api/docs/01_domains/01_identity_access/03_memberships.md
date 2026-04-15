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
- memberships en estado `ACTIVE` disponibles para operación
- active membership context o contexto operativo activo seleccionado para una superficie concreta

### 4.5 ¿Qué significa “active” exactamente?

#### Decisión
En el MVP actual, `active` significa que la membership se encuentra en estado `ACTIVE` y, por tanto, puede ser considerada elegible para uso operativo general, salvo validaciones backend adicionales del flujo que la consume.

`effectiveFrom` y `expiresAt` existen en el modelo como soporte preparatorio para futuras memberships temporales o ventanas de vigencia avanzadas, pero en el MVP no forman parte todavía de la regla principal de elegibilidad para `ActiveMembershipContext`.

#### Justificación
Esto evita introducir una semántica temporal parcial o implícita antes de implementar completamente:
- reglas de vigencia temporal,
- invalidación automática,
- reconciliación,
- y tests específicos de ventanas de validez.

#### Impacto
- la elegibilidad principal del contexto activo sigue determinada por el estado de la membership
- `ACTIVE` habilita contexto operativo en el MVP
- `effectiveFrom` y `expiresAt` se conservan como capacidad futura del modelo
- la evaluación temporal avanzada queda diferida a una fase posterior

#### Convención semántica del término "active"

- `Membership ACTIVE` = estado del lifecycle de la entidad Membership.
- `ActiveMembershipContext` = selección operativa persistida de una membership para una superficie.
- Una membership puede estar en estado `ACTIVE` sin estar seleccionada como active context.
- Un active context nunca debe tratarse como fuente autónoma de verdad; siempre debe revalidarse contra la membership vinculada.

### 4.6 ¿Cómo se resuelve el contexto operativo activo?

#### Decisión
Memberships define el conjunto de memberships válidas; el “active context” se resuelve como una selección explícita sobre una membership válida.

No se inferirá automáticamente desde frontend sin validación backend, en línea con tu regla de no dejar el scope a convenciones implícitas o al frontend .

#### Justificación
Separar “membership válida” de “active membership context” o “contexto operativo activo” evita errores de scope.

#### Impacto
Debe existir una acción explícita tipo:
- set active membership context

### 4.7 ¿Cómo se relaciona Membership con Invitation?

#### Decisión
Invitation no es Membership.

Una invitación aceptada puede convertirse en Membership mediante un flujo explícito de materialización.

Memberships es responsable de materializar la pertenencia efectiva a partir de una invitación aceptada.

Invitations es responsable del lifecycle de la invitación (emisión, expiración, aceptación), pero no de la creación de la membership.

La conversión ocurre a través de un flujo orquestado desde Memberships, utilizando invitationId como referencia.

La invitación se considera consumida cuando la membership es creada exitosamente.

#### Justificación
Se separa claramente:
- propuesta de acceso → Invitations
- pertenencia efectiva → Memberships

Evita acoplamiento fuerte entre submódulos y mantiene ownership claro.

#### Impacto
- createMembership puede recibir invitationId como input válido
- Membership debe validar:
  - que la invitación exista
  - que esté aceptada
  - que sea compatible con userId, tenantId y storeId
- Membership debe persistir invitationId para trazabilidad
- invitationId no se modela como relación Prisma fuerte en el MVP; se mantiene como referencia escalar desacoplada
- invitationId debe ser único cuando exista, para evitar múltiples materializaciones desde una misma invitación
- membership_created debe incluir invitationId cuando aplique

### 4.8 ¿Cómo se relaciona Membership con Roles y Grants?

#### Decisión
Roles y Grants no viven dentro de Memberships como definición del submódulo, pero sus asignaciones administrativas sobre superficies tenant/store-scoped se anclan canónicamente a `membershipId`.

Memberships no calcula permisos ni overrides; solo provee la relación formal usuario-scope sobre la cual Roles y Grants pueden operar.

#### Reglas
- una role assignment o grant administrativo no debe existir sin una membership base válida
- el anchor canónico para autorización administrativa es `membershipId`, no `(userId, tenantId, storeId)`
- el scope efectivo de Roles/Grants deriva del scope de la membership referenciada
- Roles/Grants no sustituyen la ausencia de Membership
- la efectividad runtime de Roles/Grants no depende solo de su existencia persistida, sino también del estado actual de la membership y del contexto operativo resuelto

#### Justificación
Evita duplicar relaciones formales fuera de Memberships, mantiene una única fuente canónica de pertenencia, y simplifica la integración futura con Access Resolution.

#### Impacto
Memberships debe exponer como base mínima consumible:
- membershipId
- userId
- scopeType
- tenantId
- storeId
- status

### 4.9 ¿Qué pasa si una membership se suspende, revoca o expira?

#### Decisión
- suspended: preserva la relación histórica pero impide uso operativo
- revoked: cierra formalmente la pertenencia y no puede seguir usándose operativamente
- expired: la pertenencia perdió vigencia temporal
- cualquier active context basado en una membership no ACTIVE deja de ser confiable

El MVP adopta una política híbrida:
- eager local: Memberships puede limpiar active contexts asociados cuando el propio submódulo ejecuta una transición que invalida uso operativo
- lazy defensiva: toda resolución de active context debe revalidar que la membership siga en estado ACTIVE antes de devolverla

#### Justificación
No basta con persistir un contexto activo; su validez depende del estado runtime de la membership.

#### Impacto
- Auth no debe tratar un active context persistido como fuente autónoma de verdad
- Auth debe resolver pertenencia y contexto contra Memberships válidas o contra Access Resolution cuando exista
- Access Resolution deberá revalidar membership + status + active context + roles + grants en runtime
- un active context stale debe limpiarse y auditarse cuando sea detectado

Nota MVP:
En la implementación actual, la invalidez operativa se resuelve principalmente a partir del `status` persistido de la membership.
Aunque el modelo incluye `effectiveFrom` y `expiresAt`, estos campos no disparan todavía por sí solos invalidación automática de contexto ni reevaluación temporal avanzada.

### 4.10 ¿Cuál es la política de unicidad?

#### Decisión
No puede existir más de una membership abierta equivalente para la misma combinación:
- userId + scopeType + tenantId + storeId(null si no aplica)

Para el MVP, se consideran abiertas las memberships en estado:
- pending
- active
- suspended

Puede existir historial, pero no duplicados abiertos equivalentes.
Estados terminales como revoked y expired no participan en esta unicidad operativa.
No pueden coexistir dos memberships abiertas equivalentes para el mismo userId y mismo scope exacto.

#### Justificación
Evita memberships duplicadas, uno de los riesgos que ya identificaste en tu esquema preliminar.

#### Impacto
La base y la capa de aplicación deben proteger unicidad operativa.

### 4.11 ¿Qué superficies consumen Memberships?

#### Decisión
Memberships está diseñado para soportar múltiples superficies del backend, pero no todas consumen pertenencia formal del mismo modo.

En el modelo actual, las superficies administrativas y operativas internas son las principales consumidoras de Memberships como contexto organizacional activo:
- Partners Web
- Platform Console
- Future Owner Console

Además, el backend también será consumido por otras superficies del ecosistema:
- Shopper Mobile App
- Shopper Web App
- Delivery App

#### Justificación
No todas las superficies necesitan resolver contexto mediante Memberships con la misma semántica.

Las superficies administrativas internas operan sobre scopes organizacionales y requieren contexto activo por tenant/store o mecanismos administrativos equivalentes.

Las superficies transaccionales de clientes finales y las superficies logísticas pueden requerir modelos de actor, permisos y contexto distintos, por lo que no deben asumirse automáticamente como consumidoras directas del active membership context.

#### Impacto
- ActiveMembershipContext queda preparado para múltiples superficies, pero en el MVP solo se modela explícitamente PARTNERS_WEB.
- Platform Console y Future Owner Console quedan contempladas como superficies administrativas futuras.
- Shopper Mobile App y Shopper Web App consumen el backend, pero no se asume que resuelvan contexto mediante Memberships.
- Delivery App consumirá el backend con una estrategia de actor/contexto a definir, sin forzar por ahora equivalencia con Memberships administrativas.

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
- Una membership en estado `ACTIVE` no implica por sí sola que haya sido seleccionada como active membership context.
- ActiveMembershipContext es una resolución operativa derivada y no reemplaza a Membership como fuente canónica de pertenencia.

## 7. Lifecycle

### Estados
- pending
- active
- suspended
- revoked
- expired

### Transiciones válidas
- pending -> active
- pending -> revoked
- pending -> expired
- active -> suspended
- active -> revoked
- active -> expired
- suspended -> active
- suspended -> revoked

### Transiciones inválidas
- pending -> suspended
- active -> pending
- suspended -> expired
- revoked -> pending
- revoked -> active
- revoked -> suspended
- revoked -> expired
- expired -> pending
- expired -> active
- expired -> suspended
- expired -> revoked

### Reglas
- pending no habilita contexto operativo
- active sí habilita contexto operativo
- suspended preserva trazabilidad pero bloquea uso operativo
- revoked cierra la pertenencia de forma definitiva
- expired refleja fin de vigencia temporal
- revoked y expired son estados terminales en el MVP
- el cambio de estado debe reevaluar contexto activo y acceso efectivo
- el “active context” no forma parte del lifecycle principal; es una resolución operativa complementaria
- estar en estado `ACTIVE` no implica estar seleccionado como active membership context

### Decisiones diferidas
- El estado `proposed` no forma parte del MVP actual.
- Si en una fase futura se requiere modelar una pre-membership antes de su creación formal como registro operativo, se reevaluará la incorporación de `proposed` o de una entidad separada de pre-onboarding.
- Mientras no exista soporte explícito en Prisma, reglas, DTOs, servicios y tests, el lifecycle canónico de Memberships se limita a:
  - pending
  - active
  - suspended
  - revoked
  - expired

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
- Roles y Grants administrativos deben anclarse a una Membership existente; no deben duplicar la relación formal usuario-scope.
- La ausencia de Membership no puede ser compensada con Roles o Grants.
- Una Membership suspendida, revocada o expirada no debe producir acceso efectivo aunque existan roles o grants persistidos sobre ella.

## 9. Impacto en otros módulos

- Users provee el userId canónico sobre el que se crea la membership.
- Auth autentica al usuario, pero no decide pertenencia; debe resolver contexto contra memberships válidas.
- Invitations puede originar la membership, pero no reemplazarla.
- Roles se asigna sobre un scope válido habilitado por membership.
- Grants no deben usarse para “simular” membresías inexistentes.
- Audit debe registrar creación, activación, suspensión, revocación, expiración y cambios de contexto relevante.
- Partners Web debe operar dentro del scope activo resuelto desde membership, no desde simples parámetros de UI.
- Platform Console puede tener capacidades cross-tenant reforzadas, pero debe seguir validando memberships o mecanismos administrativos equivalentes según superficie y scope.
- Future Owner Console podrá consumir capacidades agregadas o estratégicas, con reglas específicas de acceso y sin asumir necesariamente el mismo patrón operativo de Partners Web.
- Shopper Mobile App y Shopper Web App consumirán el backend como superficies transaccionales de clientes finales, sin asumir por defecto resolución de contexto mediante Memberships.
- Delivery App consumirá el backend como superficie logística especializada, con estrategia de actor/contexto a definir según el modelo de repartidores.
- Operational surfaces no deben fusionar contextos platform-scoped, tenant/store-scoped, shopper-scoped o delivery-scoped sin guardrails explícitos.
- Roles debe asignarse sobre `membershipId` como anchor canónico de pertenencia formal.
- Grants administrativos tenant/store-scoped deben referenciar `membershipId` o una derivación autorizada de este, no combinaciones ad hoc de userId + tenantId + storeId.
- Access Resolution debe combinar membership, status, contexto activo, roles y grants para resolver acceso efectivo en runtime.

## 10. Contratos del submódulo

### 10.1 Contratos de entrada (commands / params / queries)
#### Commands DTOs
- CreateMembershipDto
- ActivateMembershipDto
- SuspendMembershipDto
- RevokeMembershipDto
- ExpireMembershipDto
- SetActiveMembershipContextDto

#### Params DTOs
- GetMembershipByIdParamsDto

#### Query DTOs
- ListMembershipsQueryDto
- ListCurrentUserMembershipsQueryDto

### 10.2 Contratos de salida (responses)
- MembershipResponseDto
- MembershipSummaryDto
- ActiveMembershipContextResponseDto

### 10.3 Acciones de negocio expuestas
- create membership
- get membership by id
- list memberships
- list current user memberships
- activate membership
- suspend membership
- revoke membership
- expire membership
- set active membership context
- get active membership context

### 10.4 Errores semánticos
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

### 10.5 Eventos semánticos
- membership_created
- membership_activated
- membership_suspended
- membership_revoked
- membership_expired
- active_membership_context_cleared
- active_membership_context_changed

### 10.6 Política de scope HTTP
#### Platform-scoped endpoints
- POST /v1/memberships
- GET /v1/memberships
- GET /v1/memberships/:id
- POST /v1/memberships/:id/activate
- POST /v1/memberships/:id/suspend
- POST /v1/memberships/:id/revoke
- POST /v1/memberships/:id/expire

Reglas:
- requieren capacidad platform admin
- admiten administración cross-tenant/cross-user según query DTO
- no dependen del frontend para declarar validez de pertenencia

#### Self-scoped endpoints
- GET /v1/memberships/me
- PUT /v1/memberships/me/active-context
- GET /v1/memberships/me/active-context

Reglas:
- el actor se resuelve exclusivamente desde el request autenticado
- no aceptan `userId` externo como fuente de target efectivo
- resuelven contexto solo sobre memberships propias y válidas

#### Scope diferido
- tenant/store admin queda diferido en el MVP
- no se expondrán endpoints scope-admin hasta definir guardrails explícitos basados en membership/scope

### 10.7 Contratos mínimos de integración
Memberships expone como base mínima consumible:
- membershipId
- userId
- scopeType
- tenantId
- storeId
- status

Reglas:
- Roles y Grants administrativos se anclan a `membershipId`
- Access Resolution resuelve acceso efectivo usando membership + contexto + autorización
- ActiveMembershipContext no sustituye a Membership como fuente de verdad

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
- Concurrencia: la capa de aplicación debe prevenir duplicados operativos, y la base de datos debe reforzar esta garantía mediante constraints apropiadas.
- Minimización de datos: DTOs y eventos de Memberships no deben propagar PII innecesaria.
- Retención: definir cuánto tiempo se conserva historial de memberships suspendidas, revocadas o expiradas.
- Reconciliación: debe existir estrategia para detectar invitaciones aceptadas sin membership materializada o memberships inconsistentes, alineado con tu modelo transversal de resiliencia y reconciliación.
- En el MVP actual, el enum OperationalSurface solo modela PARTNERS_WEB como superficie explícitamente soportada por ActiveMembershipContext. La incorporación de otras superficies administrativas o transaccionales requerirá confirmar primero si consumen Memberships con la misma semántica o si necesitan un modelo de contexto distinto.

### Refuerzo de unicidad operativa en base de datos (diferido)

Al conectar PostgreSQL real y habilitar el flujo formal de migraciones, se implementará un refuerzo a nivel de base de datos para garantizar la unicidad operativa de memberships abiertas equivalentes.

Para el MVP, se consideran abiertas las memberships en estado:
- pending
- active
- suspended

La estrategia consiste en aplicar un partial unique index sobre:

- userId
- scopeType
- tenantId
- storeId (tratando null como valor comparable)

SQL de referencia:

CREATE UNIQUE INDEX memberships_open_equivalent_unique_idx
ON memberships (
  "userId",
  "scopeType",
  "tenantId",
  COALESCE("storeId", '__NULL__')
)
WHERE "status" IN ('PENDING', 'ACTIVE', 'SUSPENDED');

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
- usar naming de guards que sugiera soporte scope-admin cuando la implementación real solo cubre self o platform admin

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
- refuerzo de unicidad operativa en PostgreSQL mediante partial unique index para memberships abiertas equivalentes (userId + scopeType + tenantId + storeId), a implementar al habilitar migraciones reales
- validación explícita de tenant/store admin para gestión de memberships dentro de su scope, incluyendo guards y políticas de autorización basadas en membership/scope
- evaluación avanzada de vigencia temporal basada en `effectiveFrom` y `expiresAt`, incluyendo:
  - bloqueo automático de contexto para memberships `ACTIVE` aún no vigentes
  - invalidación de contexto para memberships cuya vigencia temporal haya vencido
  - expiración automática o reconciliación lazy/eager basada en tiempo
  - pruebas específicas de ventanas temporales y comportamiento concurrente asociado

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
- superficies consumidoras del backend identificadas y diferenciadas entre contextos administrativos, shopper y delivery

## 16. Diagramas de Flujos

### 16.1 Flujo general del submódulo Memberships
Este flujo sale de tu MembershipsService, que actúa como fachada y deriva cada operación al servicio correcto: command, query o context.

flowchart TD
    A[Platform Admin] --> B[POST /v1/users/:id/anonymize]
    B --> C[UserPlatformAdminGuard]
    C --> D[UsersService.anonymizeUser]

    D --> E[Buscar user]
    E --> F{DEACTIVATED -> ANONYMIZED válido?}
    F -->|No| X1[InvalidUserStatusTransitionError]
    F -->|Sí| G[updateByIdAndVersion<br/>status=ANONYMIZED<br/>anonymizedAt=now<br/>clear PII]

    G --> H[Set displayName anonymized]
    H --> I[Null firstName/lastName/email/phone/avatar]
    I --> J[emailVerified=false / phoneVerified=false]
    J --> K[Audit: USER_ANONYMIZED]
    K --> L[Publish: USER_ANONYMIZED]
    L --> M[Return user anonymized]

### 16.2 Flujo de creación de Membership
Este es uno de los flujos más importantes porque concentra varias invariantes: validación de scope, verificación tenant/store, chequeo de duplicidad operativa, compatibilidad con invitation y luego persistencia con auditoría e historial.

flowchart TD
    A[POST /v1/memberships] --> B[MembershipsController]
    B --> C[MembershipsService.createMembership]
    C --> D[MembershipCommandService.createMembership]

    D --> E[Validar shape del scope]
    E --> F{¿scope válido?}
    F -- No --> X1[invalid_membership_scope]
    F -- Sí --> G[Validar existencia de tenant/store y consistencia store->tenant]

    G --> H{¿tenant/store válidos?}
    H -- No --> X1

    H -- Sí --> I[Buscar membership abierta equivalente]
    I --> J{¿Ya existe?}
    J -- Sí --> X2[duplicate_membership]
    J -- No --> K{¿Viene con invitationId?}

    K -- Sí --> L[Leer invitación aceptada]
    L --> M{¿Existe y es compatible con userId tenantId storeId?}
    M -- No --> X3[invitation_membership_conflict]
    M -- Sí --> N[Crear membership PENDING]

    K -- No --> N[Crear membership PENDING]

    N --> O[Crear status history from null to PENDING]
    O --> P[Emitir audit]
    P --> Q[Emitir membership_created]
    Q --> R[Retornar MembershipResponseDto]

### 16.3 Flujo de materialización desde Invitation
En tu diseño, Invitation no equivale a Membership. La invitación solo propone acceso; la pertenencia efectiva nace recién cuando createMembership la materializa exitosamente.

flowchart TD
    A[Invitation aceptada previamente] --> B[createMembership con invitationId]
    B --> C[Buscar invitación aceptada]

    C --> D{¿Existe?}
    D -- No --> X[invitation_membership_conflict]

    D -- Sí --> E{¿userId coincide?}
    E -- No --> X

    E -- Sí --> F{¿tenantId coincide?}
    F -- No --> X

    F -- Sí --> G{¿storeId coincide cuando aplica?}
    G -- No --> X

    G -- Sí --> H[Crear Membership PENDING]
    H --> I[Persistir invitationId para trazabilidad]
    I --> J[Emitir membership_created]
    J --> K[Invitation queda consumida materialmente]

### 16.4 Flujo de cambio de lifecycle de Membership
Tu lifecycle canónico es: pending, active, suspended, revoked, expired. No todas las transiciones están permitidas, así que este flujo pasa siempre por validación de transición. Además, cuando la membership deja de ser utilizable operativamente, el módulo puede limpiar ActiveMembershipContext asociados.

flowchart TD
    A[POST lifecycle endpoint] --> B[MembershipsController]
    B --> C[MembershipsService]
    C --> D[MembershipCommandService]

    D --> E[Buscar membership por id]
    E --> F{¿Existe?}
    F -- No --> X1[membership_not_found]

    F -- Sí --> G[Validar transición de estado]
    G --> H{¿Transición válida?}
    H -- No --> X2[invalid_membership_transition]

    H -- Sí --> I[Resolver timestamp field]
    I --> J[Compare-and-set update por fromStatus -> toStatus]
    J --> K{¿Se actualizó 1 fila?}
    K -- No --> X2

    K -- Sí --> L[Crear status history]
    L --> M{¿Nuevo estado invalida uso operativo?}

    M -- Sí --> N[clearActiveContextsForMembership]
    M -- No --> O[Continuar]

    N --> O[Record lifecycle change]
    O --> P[Emitir audit + domain event]
    P --> Q[Releer membership]
    Q --> R[Retornar respuesta]

Transiciones principales que hoy puedes diagramar aparte

stateDiagram-v2
    [*] --> PENDING
    PENDING --> ACTIVE
    PENDING --> REVOKED
    PENDING --> EXPIRED

    ACTIVE --> SUSPENDED
    ACTIVE --> REVOKED
    ACTIVE --> EXPIRED

    SUSPENDED --> ACTIVE
    SUSPENDED --> REVOKED

    REVOKED --> [*]
    EXPIRED --> [*]

### 16.5 Flujo de selección de Active Membership Context
Aquí el punto clave es que el backend no confía en el frontend para inferir contexto. El usuario pide seleccionar una membership para una surface, pero el backend valida que esa membership sea propia y que esté en ACTIVE.

flowchart TD
    A[PUT /v1/memberships/me/active-context] --> B[MembershipsController]
    B --> C[Resolver actor desde request.user]
    C --> D[MembershipsService.setActiveMembershipContext]
    D --> E[MembershipContextService.setActiveMembershipContext]

    E --> F[Buscar membership owned by user]
    F --> G{¿Pertenece al user?}
    G -- No --> X1[membership_context_denied]

    G -- Sí --> H{¿status = ACTIVE?}
    H -- No --> X2[membership_not_active]

    H -- Sí --> I[upsert ActiveMembershipContext por userId + surface]
    I --> J[Emitir audit ACTIVE_CONTEXT_SET]
    J --> K[Emitir active_membership_context_changed]
    K --> L[Retornar ActiveMembershipContextResponseDto]

### 16.6 Flujo de resolución de Active Membership Context
Este flujo está muy bien diseñado porque revalida el contexto persistido antes de devolverlo. Si el contexto quedó stale, se limpia y se audita. Eso protege a Auth y a futuras capas como Access Resolution de confiar en contexto viejo.

flowchart TD
    A[GET /v1/memberships/me/active-context?surface=PARTNERS_WEB] --> B[MembershipsController]
    B --> C[Resolver actor desde request.user]
    C --> D[MembershipsService.getActiveMembershipContext]
    D --> E[MembershipContextService.getActiveMembershipContext]

    E --> F[Buscar ActiveMembershipContext por userId + surface]
    F --> G{¿Existe?}
    G -- No --> R[Retornar null]

    G -- Sí --> H{¿La membership relacionada existe?}
    H -- No --> I[Limpiar contexto stale]
    I --> J[Emitir audit ACTIVE_CONTEXT_CLEARED]
    J --> K[Emitir active_membership_context_cleared]
    K --> R

    H -- Sí --> L{¿membership.status = ACTIVE?}
    L -- No --> I
    L -- Sí --> M[Construir response con membership + context]
    M --> N[Retornar ActiveMembershipContextResponseDto]

### 16.7 Flujo de consultas del módulo
Las consultas están separadas del command side. Además, tus endpoints distinguen bien entre rutas platform-scoped y self-scoped. En /me, el actor siempre sale del request autenticado y no de userId externo. Eso también está cubierto por tests e2e.

flowchart TD
    A[GET endpoint] --> B{¿Endpoint platform o self?}

    B -->|Platform| C[MembershipPlatformAdminGuard]
    B -->|Self| D[MembershipSelfOrPlatformAdminGuard]

    C --> E[MembershipQueryService]
    D --> E

    E --> F{¿Operación?}
    F -->|Get by id| G[getMembershipById]
    F -->|List all| H[listMemberships]
    F -->|List mine| I[listCurrentUserMemberships]

    G --> J[MembershipsRepository]
    H --> J
    I --> J

    J --> K[MembershipResponseMapper]
    K --> L[HTTP Response]