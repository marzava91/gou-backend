# ACCESS RESOLUITON

## 1. Propósito del submódulo

Access Resolution gestiona la resolución explícita del acceso efectivo de un actor dentro de la plataforma, determinando qué capacidades puede ejercer realmente en un contexto operativo dado, a partir de la composición de:

- identidad autenticada válida
- membership válida (según existencia, ownership, status y compatibilidad de scope) y contexto activo
- roles asignados
- grants aplicables
- scope solicitado
- superficie operativa y nivel de visibilidad aplicable cuando corresponda

Resuelve:

- evaluación del acceso efectivo sobre una acción, recurso o capacidad
- composición de baseline + excepciones
- resolución de conflictos entre roles y grants
- determinación del scope efectivo operativo
- entrega de contexto de autorización usable por endpoints, servicios y superficies
- explicabilidad básica de la decisión de acceso

No resuelve:

- identidad canónica → Users
- autenticación y sesión → Auth
- pertenencia formal → Memberships
- catálogo base de capacidades → Roles
- excepciones explícitas → Grants
- reglas de negocio sustantivas del dominio
- navegación de Partners Web o Platform Console como UX

No define por sí mismo:

- el ownership de recursos de negocio
- el catálogo funcional de acciones del sistema
- la política de negocio de cada módulo
- la UI de separación entre superficies

## 1.1 Alcance MVP (versión actual)

El submódulo Access Resolution en su versión MVP implementa las siguientes capacidades:

- evaluate access → resolución puntual de acceso sobre una capacidad, recurso o acción
- resolve active access context → resolución del contexto operativo activo del usuario en una superficie dada
- list effective permissions → listado de capacidades efectivas derivadas de roles y grants sobre una membership

Incluye:

- validación de sesión autenticada
- resolución de membership efectiva (explícita o por contexto activo)
- aplicación de precedencia roles + grants
- generación de decisiones explicables (AccessDecision)
- generación de contexto operativo usable (AccessContext)
- generación de permisos efectivos derivados (EffectivePermissions)

No incluye en esta fase:

- materialización persistente de snapshots de permisos efectivos
- invalidación persistente de snapshots
- recomputación administrativa de permisos
- explainability avanzada o auditoría extendida
- soporte multi-surface completo (limitado actualmente a PARTNERS_WEB)

Estas capacidades serán incorporadas en fases posteriores.

## 2. Definición canónica

Access Resolution es el submódulo que transforma señales de identidad, pertenencia y autorización en una decisión efectiva de acceso, consistente y explicable.

Su rol dentro del sistema es cerrar la cadena:

- Users → quién es
- Auth → cómo accede
- Memberships → dónde puede actuar
- Roles → qué puede hacer por baseline
- Grants → qué excepción aplica
- Access Resolution → qué acceso efectivo resulta finalmente

Otros módulos dependen conceptualmente de Access Resolution para:

- saber si una acción puede intentarse
- resolver capacidades efectivas sin reimplementar lógica
- evitar decisiones divergentes entre Partner Web, Platform Console, POS, shopper app u otras superficies, riesgo que ya tienes identificado cuando el backend no define claramente scope y permisos
- mantener decisiones trazables, explicables y auditables, algo que tus lineamientos exigen para motores de decisión relevantes

## 3. Fronteras

### Pertenece a Access Resolution

- resolución de acceso efectivo
- evaluación de capacidades sobre scope válido
- composición de membership + roles + grants
- precedencia y resolución de conflictos
- contexto de autorización resultante
- explicabilidad mínima de la decisión
- generación de permisos efectivos derivados en runtime
- invalidación lógica conceptual de decisiones ante cambios relevantes

Nota MVP:
La materialización persistente de snapshots de permisos efectivos no forma parte de esta fase.

### No pertenece a Access Resolution

- identidad base del usuario → Users
- autenticación/sesión → Auth
- pertenencia formal → Memberships
- definición de roles → Roles
- gestión de grants → Grants
- reglas de negocio del recurso afectado
- ownership de tenant/store
- enforcement técnico transversal de seguridad dura → Security & Operational Safeguards como guardrail transversal, no owner de la resolución canónica
- observabilidad transversal → Observability / Operational Traceability como estándar compartido, no owner del dato

## 4. Decisiones estructurales

### 4.1 ¿Qué representa exactamente Access Resolution?

#### Decisión

Representa el motor canónico de resolución de acceso efectivo del backend.

#### Justificación

No debe quedar disperso entre frontend, guards sueltos, endpoints aislados o lógica repetida por módulo, porque eso rompe consistencia entre superficies y scopes .

#### Impacto

Los módulos de negocio consumen decisiones de acceso resueltas o contratos equivalentes, en vez de recomponer memberships/roles/grants por su cuenta.

### 4.2 ¿Dónde vive este submódulo?

#### Decisión

Vive dentro de Identity & Access como submódulo autónomo.

#### Justificación

Su dominio natural es autorización efectiva, derivada de Auth, Memberships, Roles y Grants.
Las capacidades transversales definen estándares y protecciones, pero no deberían ser dueñas de la resolución canónica de acceso .

#### Impacto

El mapa debe actualizarse agregando Access Resolution debajo de Identity & Access.

### 4.3 ¿Qué entradas usa para resolver acceso?

#### Decisión

La resolución usa como inputs mínimos:

- userId autenticado
- estado de sesión/autenticación válido
- membership o contexto operativo activo solicitado
- roles asignados a esa membership
- grants activos aplicables
- capacidad/acción/recurso solicitado
- superficie o actor si la política lo requiere
- scope efectivo solicitado (platform, tenant, store, etc.)

#### Justificación

Tus lineamientos exigen que scope, ownership y fuente canónica sean explícitos para cada decisión .

#### Impacto

No se permite inferir acceso solo desde token o solo desde rol nominal.

### 4.4 ¿Qué devuelve Access Resolution?

#### Decisión

Devuelve un AccessDecision explícito, que contiene como mínimo:

- allowed / denied
- motivo o reason code
- capability/resource/action evaluado
- scope efectivo considerado
- membership usada
- roles y grants relevantes considerados
- explainability mínima
- timestamp/version de la resolución si aplica snapshot

#### Justificación

Toda decisión relevante debe ser explicable, auditable y asociable a inputs y reglas vigentes .

#### Impacto

No basta un booleano simple.

### 4.5 ¿Resuelve permisos o reglas de negocio?

#### Decisión

Resuelve autorización efectiva, no reglas de negocio finales.

#### Justificación

Tus riesgos base son claros: permisos dicen quién puede intentar; reglas de negocio dicen si puede ocurrir .

#### Impacto

Incluso con allowed = true, el módulo de negocio aún valida sus propias reglas.

### 4.6 ¿Cómo se resuelve la precedencia?

#### Decisión

La precedencia del MVP será:

1. sesión/auth válida
2. membership válida y scope compatible
3. capacidades base por roles
4. grants aplicables
5. deny explícito prevalece sobre allow
6. si no existe baseline ni grant que habilite, el resultado por defecto es deny

#### Justificación

La precedencia debe estar cerrada o el sistema se vuelve inmanejable.

#### Impacto

Debe existir documentación y tests explícitos de conflictos.

### 4.7 ¿Cómo se trata el contexto activo?

#### Decisión

Access Resolution consume un contexto activo explícito o una membership objetivo explícita.
No asume contexto por frontend ni por navegación implícita, consistente con tu regla de no mezclar contexto platform y tenant/store sin guardrails visibles y backend validation .

#### Impacto

Debe existir validación del active context en backend.

#### Aclaración de ownership del contexto activo

`ActiveMembershipContext` no constituye la verdad final de autorización ni reemplaza a `Membership`.

Su función en el MVP es actuar como un puntero operativo por superficie para indicar cuál membership desea usar actualmente el actor en una experiencia dada.

La verdad final para resolver acceso sigue siendo la `Membership` resuelta y validada en backend, junto con su estado, scope y ownership sobre el `userId` autenticado.

Impacto:

- nunca se debe autorizar una acción usando solo `ActiveMembershipContext`
- el backend debe resolver la membership referenciada y validarla explícitamente
- si el `ActiveMembershipContext` apunta a una membership inexistente, inválida o ajena al actor, la resolución debe fallar

### 4.8 ¿Debe existir endpoint de evaluación efectiva?

#### Decisión

Sí, pero restringido y con propósito claro.
El MVP puede exponer:

- evaluate access
- resolve active access context
- list effective permissions

Solo donde realmente aporte a UI compleja o debugging operativo.

#### Justificación

Tus lineamientos piden no dejar sin dueño las projections y vistas complejas, pero tampoco proliferarlas sin criterio .

#### Impacto

Debe definirse owner claro de read model o projection si se expone.

### 4.9 ¿Cómo se comporta frente a cambios en roles/grants/memberships?

#### Decisión

Toda resolución efectiva debe invalidarse o reevaluarse cuando cambie cualquiera de:

- sesión relevante
- membership
- role assignment
- role definition si impacta capacidades efectivas
- grant aplicable
- contexto activo

#### Justificación

No puedes dejar permisos efectivos cacheados sin invalidación clara.

#### Impacto

Necesitas política explícita de caché y refresh.

### 4.10 ¿Puede Access Resolution operar cross-surface?

#### Decisión

Sí, pero respetando la separación de superficies operativas.
El motor es único; la visibilidad y contexto de consumo cambian según superficie.

#### Justificación

Tus documentos distinguen claramente Partners Web, Platform Console y futuras superficies como contextos distintos, no simples permisos aislados .

#### Impacto

El decision engine no debe ocultar la separación entre platform-scoped y tenant/store-scoped.

#### Nota MVP:

Actualmente el sistema solo soporta la superficie:

- PARTNERS_WEB

El soporte para las siguientes superficies está planificado pero no implementado aún:

- Platform Console
- POS (Point of Sale)
- Shopper App (web y mobile)

La arquitectura del submódulo ya contempla multi-surface, pero su activación será progresiva.

## 5. Modelo conceptual

### Entidad principal

- AccessDecision (puede ser entidad efímera, contrato de dominio o projection, según tu implementación)

### Entidades auxiliares

- AccessEvaluationRequest
- AccessEvaluationContext
- EffectivePermissionSnapshot
- PermissionConflictResolution
- AccessDecisionAuditEvent
- ActiveOperationalContextProjection

### Ownership

- Access Resolution es owner de la decisión efectiva
- Auth es owner del estado autenticado
- Memberships es owner del contexto formal
- Roles es owner del baseline
- Grants es owner de excepciones

### Source of truth

- identidad → Users
- autenticación → Auth
- pertenencia/scope → Memberships
- capacidades base → Roles
- excepciones → Grants
- decisión efectiva → Access Resolution

### Relaciones

- consume AuthSession
- consume Membership
- consume RoleAssignment / Role
- consume Grant
- produce AccessDecision
- puede emitir snapshots/read models para superficies o backoffice

## 6. Invariantes del submódulo

- No puede existir decisión efectiva sin identidad autenticada válida, salvo flujos públicos explícitos.
- No puede existir acceso tenant/store-scoped sin membership válida y scope compatible.
- Roles y grants no sustituyen la ausencia de membership.
- deny explícito prevalece sobre allow en el MVP.
- Toda decisión debe apoyarse en inputs explícitos y trazables.
- El contexto operativo activo debe ser explícito y validado en backend.
- Access Resolution no redefine el catálogo de capacidades; lo consume.
- Access Resolution no redefine el ownership de recursos; lo respeta.
- Una decisión efectiva debe ser reproducible o al menos explicable con los inputs y versión de reglas aplicables.
- Ninguna superficie debe decidir permisos efectivos solo en frontend .

### Nota MVP sobre vigencia temporal de Membership

Aunque `Membership` modela los campos `effectiveFrom` y `expiresAt`, en la versión actual del MVP estos campos todavía no gobiernan automáticamente la elegibilidad runtime del contexto activo ni de la resolución efectiva de acceso.

En esta fase, la validación operativa se apoya principalmente en:

- existencia de la membership
- ownership correcto respecto del actor autenticado
- compatibilidad de scope
- status válido de membership

El enforcement temporal automático de `effectiveFrom` / `expiresAt` se incorporará en una fase posterior.

Impacto:

- no debe asumirse que una membership futura o vencida será bloqueada solo por esos campos si el runtime aún no aplica esa validación temporal
- cualquier política temporal crítica deberá implementarse explícitamente hasta que el motor incorpore enforcement temporal nativo

## 7. Lifecycle

### Estados

Aquí el lifecycle no es de una entidad persistente larga tipo User o Membership, sino de la evaluación o snapshot si decides persistirlo.

Advertencia:

El lifecycle descrito a continuación corresponde a un modelo conceptual y a una posible evolución futura del sistema con snapshots materializados.

En el MVP actual:

- AccessDecision se evalúa en runtime de forma efímera
- No existen estados persistentes ni transiciones materiales
- No se materializan snapshots de permisos efectivos

Para AccessDecision efímero (modelo conceptual)

- computed
- served
- invalidated (solo si existe caché/snapshot en fases futuras)

Para EffectivePermissionSnapshot si lo materializas (no activo en MVP)

- computed
- active
- stale
- invalidated

### Transiciones válidas

- computed -> served
- served -> invalidated
- computed -> active
- active -> stale
- stale -> invalidated
- stale -> active (recomputado)

### Transiciones inválidas

- invalidated -> active sin recomputación
- invalidated -> served sin recomputación
- stale -> served cuando la política exige refresh

### Reglas

- el acceso efectivo debe recomputarse o invalidarse tras cambios relevantes
- no mezclar el lifecycle de Access Resolution con el lifecycle de Roles, Grants o Memberships
- si no materializas snapshots, puedes omitir lifecycle persistente y tratarlo como evaluación pura

### Nota MVP:

En la versión actual, Access Resolution opera como evaluación efímera en runtime.

No se persisten snapshots de permisos efectivos, por lo que el lifecycle descrito aplica solo como diseño futuro y no como comportamiento activo del sistema.

## 8. Reglas críticas

- Scope y actor evaluado deben ser explícitos.
- El backend debe validar la membership y el contexto activo.
- La precedencia entre Roles y Grants debe estar documentada y cerrada.
- deny explícito prevalece sobre allow en el MVP.
- El resultado por defecto ante falta de habilitación explícita es deny.
- Los endpoints no deben reimplementar lógicas divergentes de autorización.
- Toda decisión sensible debe ser trazable.
- Toda projection o caché de permisos efectivos debe tener owner claro e invalidación definida.
- Access Resolution no debe decidir reglas de negocio que pertenecen al dominio funcional.
- La separación entre Platform Console y Partners Web debe respetarse a nivel de contexto operativo y validación backend.
- El cálculo de permisos efectivos y la evaluación de acceso deben derivar de la misma lógica base para evitar inconsistencias.

## 9. Impacto en otros módulos

- Auth provee identidad autenticada y estado de sesión, pero no resuelve autorización final.
- Users no participa directamente en la evaluación salvo como identidad canónica subyacente.
- Memberships es prerequisito central para scopes operativos.
- Roles aporta capacidades base.
- Grants modifica el baseline con excepciones.
- Invitations no participa en acceso efectivo hasta convertirse en membership.
- Todos los módulos de negocio deberían consumir decisiones de acceso consistentes, evitando guards divergentes.
- Security & Operational Safeguards define hardening y validaciones mínimas compartidas, pero no sustituye la resolución canónica de acceso .
- Observability & Operational Traceability debe capturar métricas, trazas y auditoría relevantes del motor de acceso .
- Operational surfaces deben consumir el mismo motor sin borrar la separación entre contextos platform y tenant/store .

## 10. Contratos

### DTOs

- EvaluateAccessQueryDto
- ResolveAccessContextQueryDto
- ListEffectivePermissionsQueryDto
- AccessDecisionResponseDto
- EffectivePermissionResponseDto
- EffectivePermissionSnapshotResponseDto
- AccessContextResponseDto

### Acciones

- evaluate access
- resolve active access context
- list effective permissions

Acciones diferidas:

- explain access decision (API extendida)
- invalidate effective permission snapshot (no implementado en MVP)

### Acciones administrativas diferidas o restringidas

- force recompute access snapshot
- inspect access decision trail
- compare access decisions across scopes
- repair stale permission projections

### Errores

- access_context_not_resolved
- invalid_active_membership
- membership_scope_mismatch
- access_denied (reason code de AccessDecision, no excepción)
- authorization_unresolvable
- surface_scope_conflict

Errores diferidos:

- effective_permissions_stale
- access_resolution_conflict

Nota:
access_denied no representa un error técnico del sistema, sino un resultado válido del motor de autorización.
Las excepciones del submódulo están reservadas exclusivamente para:
- contexto no resoluble
- inputs inválidos
- inconsistencias de identidad, sesión o membership

### Scopes

- self para resolver permisos efectivos propios donde aplique
- tenant/store admin solo dentro de scope permitido
- platform admin para inspección cross-tenant autorizada
- ninguna superficie debe bypass backend validation de scope

### Eventos

Eventos implementados en MVP:

- access_evaluated
- active_access_context_resolved (si se implementa el endpoint)
- effective_permissions_computed (si se implementa el endpoint)

Eventos diferidos:

- effective_permissions_invalidated
- access_resolution_conflict_detected

### Contratos intermodulares de lectura (reader ports)

#### AccessAuthReaderPort

Responsabilidad:
- exponer únicamente estado de sesión autenticada y contexto activo operativo
- no resolver autorización efectiva ni inferir permisos

Operaciones:
- findSessionByIdAndUserId({ sessionId, userId }) -> ResolvedAuthSession | null
- getActiveContext({ userId, surface }) -> ActiveAccessContext | null

Garantías mínimas:
- si retorna sesión, debe corresponder exactamente al userId solicitado
- status es obligatorio
- getActiveContext devuelve como máximo un contexto por userId + surface
- el contexto activo no sustituye la validación posterior de membership

#### AccessMembershipReaderPort

Responsabilidad:
- exponer la membership canónica mínima necesaria para autorización

Operación:
- findAuthorizationAnchorByMembershipId(membershipId) -> AuthorizationMembershipAnchor | null

Garantías mínimas:
- membershipId, userId, scopeType, tenantId y status son obligatorios
- storeId puede ser null solo cuando el scope no requiere store
- este contrato representa el anchor canónico de autorización, no una proyección UI

#### AccessRoleReaderPort

Responsabilidad:
- exponer capacidades baseline derivadas de roles activos de una membership

Operación:
- listActiveMembershipCapabilities(membershipId) -> MembershipRoleCapability[]

Garantías mínimas:
- solo incluye assignments activos aplicables al membership solicitado
- cada item debe incluir roleAssignmentId, roleId, roleKey, roleScopeType, assignmentStatus y capabilityKey
- Access Resolution es quien normaliza capabilityKey para evitar dependencia de formato del provider

#### AccessGrantReaderPort

Responsabilidad:
- exponer grants asociados a una membership para evaluación posterior por Access Resolution

Operación:
- listMembershipGrants(membershipId) -> MembershipApplicableGrant[]

Garantías mínimas:
- cada grant debe incluir id, membershipId, effect, targetType, status, validFrom y validUntil
- si targetType = CAPABILITY, capabilityKey debe venir poblado
- si targetType = RESOURCE_ACTION, resourceKey y actionKey deben venir poblados
- Access Resolution es quien normaliza capability/resource/action antes de resolver permisos efectivos

## 11. Diseño de validación

### Familias de prueba

- unit
- integración
- contrato
- E2E mínima

### Escenarios principales

- resolver acceso permitido con membership activa + role compatible
- resolver acceso denegado por falta de membership
- resolver acceso denegado por grant deny explícito
- listar permisos efectivos de un contexto activo válido
- resolver contexto platform-scoped vs tenant/store-scoped correctamente

### Escenarios inválidos

- evaluar acceso con sesión inválida
- evaluar acceso con membership suspendida/revocada/expirada
- evaluar acceso sobre scope distinto al activo
- conflicto entre role baseline y grants sin política cerrada
- snapshot stale servido como válido

### Casos borde

- usuario híbrido con memberships en múltiples tenants
- cambio de context activo mientras cambia el role assignment
- grant expira durante sesión activa
- role cambia mientras existe caché de permisos efectivos
- cambio deliberado entre Platform Console y Partners Web con contexto anterior persistido

### Seguridad

- no confiar en claims de frontend como verdad final
- validar actor, scope y membership en backend
- evitar filtración de permisos internos innecesarios
- proteger endpoints de inspección de permisos efectivos
- no usar Access Resolution como bypass de reglas de negocio

### Concurrencia

- invalidación concurrente de snapshot
- cambios simultáneos de membership y grants
- recomputación concurrente de permisos efectivos
- compare-and-set o versionado si materializas projections

### Criterios de aceptación

- acceso efectivo reproducible y explicable
- precedencia cerrada
- scope explícito
- separación entre autorización y negocio respetada
- invalidación/recomputación definida
- pruebas mínimas automatizadas definidas
- disponibilidad de evaluate access, resolve context y effective permissions en runtime
- coherencia entre evaluate access y effective permissions

### Normalización:
- Access Resolution normaliza internamente capabilityKey, resourceKey y actionKey antes de evaluar acceso o derivar permisos efectivos.
- Los providers lectores no son dueños de la canonicalización final de estas claves, aunque pueden devolverlas ya normalizadas.
- La fuente canónica de normalización pertenece a Access Resolution para evitar divergencias entre adapters.

## 12. Confiabilidad y hardening

- Idempotencia: recomputaciones e invalidaciones deben tolerar reintentos seguros.
- Auditoría: decisiones sensibles, denegaciones relevantes e inspecciones administrativas deben quedar auditadas.
- Observabilidad: métricas de access granted/denied, conflictos, staleness, recomputaciones e invalidaciones.
- Rate limiting: especialmente sobre endpoints de evaluación expuesta o debugging.
- Retry: solo sobre operaciones de recomputación o projections, nunca para “forzar” acceso.
- Concurrencia: locking/versionado/compare-and-set si existen snapshots materiales.
- Minimización de datos: no propagar PII ni detalles innecesarios en decisiones de acceso.
- Retención: definir cuánto tiempo se conservan access decisions auditables y snapshots.
- Explicabilidad: la decisión debe ser trazable a inputs, reglas y versiones vigentes, consistente con tus lineamientos para motores de decisión no opacos .
- Reconciliación: si existe divergence entre snapshot y source of truth, debe haber recomputación o reparación operativa, consistente con tu modelo transversal de resiliencia .

## 13. Riesgos

### Riesgos de diseño

- convertir Access Resolution en “caja negra”
- mezclar autorización con reglas de negocio
- permitir que cada módulo resuelva acceso distinto
- no separar platform scope y tenant/store scope
- acoplarlo excesivamente a una superficie concreta

### Riesgos de implementación

- cachés de permisos sin invalidación clara
- endpoints con lógica paralela diferente al motor central
- grants y roles evaluados con precedencia inconsistente
- reuso de claims incompletos como fuente canónica
- falta de explainability

### Riesgos operativos

- usuarios actuando en scope equivocado
- decisiones distintas entre Partner Web y Platform Console
- soporte incapaz de explicar por qué algo fue permitido/denegado
- snapshots stale sosteniendo acceso indebido
- degradaciones del motor bloqueando operaciones esenciales sin fallback seguro

## 14. Decisiones diferidas conscientemente

- explainability API completa y detallada
- materialización avanzada de snapshots por superficie
- attribute-based access control (ABAC)
- policy engine declarativo más sofisticado
- separación formal entre permission evaluation y surface ca-pability projection
- simulación “what-if” de acceso por cambios futuros de role/grant
- scoring de riesgo embebido en autorización efectiva
- invalidación persistente de permisos efectivos
- recomputación administrativa de permisos

## 15. Definition of Done

- Access Resolution agregado formalmente a Identity & Access
- propósito y fronteras claramente definidos
- precedencia entre Auth, Memberships, Roles y Grants cerrada
- scope y active context definidos
- invariantes documentados
- impacto en otros módulos documentado
- DTOs, acciones, errores, scopes y eventos definidos
- estrategia de invalidación/recomputación definida
- diseño de validación mínimo definido
- hardening mínimo definido
- riesgos principales identificados
- decisiones diferidas conscientemente registradas
