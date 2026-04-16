# GRANTS

## 1. Propósito del submódulo

Grants gestiona excepciones explícitas de acceso otorgadas o denegadas sobre recursos, acciones o capacidades concretas dentro de un scope válido, complementando la autorización base definida por Roles.

Resuelve:
- concesión explícita de capacidades adicionales
- restricción explícita de capacidades que normalmente vendrían por rol
- excepciones puntuales por recurso, acción o capacidad
- vigencia temporal de permisos excepcionales
- revocación, expiración y trazabilidad de excepciones
- evaluación de permisos efectivos en combinación con roles, cuando ese contrato se expone

No resuelve:
- identidad del usuario → Users
- autenticación o sesiones → Auth
- pertenencia organizacional → Memberships
- definición de capacidades base → Roles
- ownership del recurso de negocio afectado
- autorización completa de negocio fuera del marco de capacidades y excepciones

No define por sí mismo:
- pertenencia al scope
- acceso base sin role o membership válida
- políticas globales de negocio ajenas a autorización

## 2. Definición canónica

Un Grant es una excepción formal, explícita y trazable aplicada sobre una Membership válida, para permitir o denegar una capacidad específica sobre un alcance determinado.

Su rol dentro del sistema es completar el modelo:
- Users → quién es
- Auth → cómo accede
- Memberships → dónde puede actuar
- Roles → qué puede hacer por defecto
- Grants → qué excepción aplica sobre ese baseline

Otros módulos dependen de Grants para:
- resolver excepciones finas sin proliferar roles
- aplicar allow/deny explícitos sobre capacidades concretas
- soportar casos especiales sin contaminar el catálogo de roles

La regla arquitectónica central aquí es:
Grants no reemplaza Roles ni Memberships; Grants ajusta el resultado base de autorización.

## 3. Fronteras

### Pertenece a Grants
- definición de grant como excepción formal
- tipo de grant (allow / deny)
- target del grant (capacidad, recurso, acción o combinación definida)
- vigencia temporal del grant
- revocación y expiración
- trazabilidad y auditoría del grant
- evaluación de conflicto entre grants y baseline, si el submódulo lo expone
- precedencia entre role y grant

### No pertenece a Grants
- identidad del usuario → Users
- sesión autenticada → Auth
- pertenencia al tenant/store → Memberships
- definición de roles base → Roles
- ownership del recurso funcional afectado
- reglas de negocio ajenas a acceso/autorización
- permisos implícitos no documentados
- simulación de membership inexistente

## 4. Decisiones estructurales

### 4.1 ¿Qué representa exactamente un Grant?

#### Decisión
Un Grant representa una excepción explícita de autorización aplicada sobre una Membership válida.

#### Justificación
Necesitas un mecanismo fino para casos especiales sin contaminar el catálogo de roles.

#### Impacto
Grant no sustituye el baseline de acceso; lo complementa o restringe.

### 4.2 ¿El grant se asigna a User, Membership, Role o combinación?

#### Decisión
El Grant se asigna a Membership.

#### Justificación
La autorización debe permanecer contextualizada al scope operativo válido.
Asignarlo a User rompería la separación con Memberships.

#### Impacto
No existe user-grant directo en el diseño base.

### 4.3 ¿El grant otorga, restringe o ambas cosas?

#### Decisión
Sí. El modelo soporta dos efectos explícitos:
- allow
- deny

#### Justificación
Necesitas tanto excepciones expansivas como restrictivas.

#### Impacto
Todo grant debe declarar explícitamente su effect.

### 4.4 ¿Qué puede targetear un grant?

#### Decisión
Un Grant puede targetear:
- una capacidad específica
- una acción específica
- un recurso o tipo de recurso
- una combinación recurso + acción
- opcionalmente una instancia concreta si el dominio lo soporta

#### Justificación
Debes permitir granularidad suficiente sin volver el modelo ambiguo.

#### Impacto
El grant debe tener estructura explícita de target.
No bastan strings sueltos sin semántica.

### 4.5 ¿Qué relación tiene con el rol?

#### Decisión
Roles definen capacidad base.
Grants ajustan el resultado efectivo.

#### Regla de precedencia
Para el MVP, la precedencia será:
1. Membership válida
2. Capacidades base por Roles
3. Grants aplicables
4. Resolución final con prioridad de deny sobre allow, salvo política específica documentada

#### Justificación
La precedencia debe estar cerrada. Si no, el sistema se vuelve imposible de auditar.

#### Impacto
Debe existir política explícita de resolución de conflictos.

### 4.6 ¿Puede expirar un grant?

#### Decisión
Sí. Un Grant puede tener vigencia temporal explícita, pero esta es opcional.

#### Justificación
Muchas excepciones no deben ser permanentes, pero otras sí pueden ser indefinidas según el contexto operativo.

#### Impacto
- Si se define una ventana de vigencia (validFrom, validUntil), esta debe respetarse en la evaluación efectiva.
- Si no se define validFrom ni validUntil, el grant se considera de vigencia indefinida hasta revocación explícita.
- En el MVP actual, la ventana temporal se persiste en el agregado Grant, pero su materialización automática al estado EXPIRED queda diferida.
- La evaluación efectiva deberá tratar un grant fuera de vigencia como no aplicable, aunque el registro persistido continúe en ACTIVE hasta una reconciliación futura.

### 4.7 ¿Qué pasa cuando un grant expira?

#### Decisión
Un grant fuera de su ventana de vigencia deja de participar en la evaluación efectiva.

#### Justificación
Evita grants “zombie” sin obligar a una reconciliación inmediata en el modelo persistido.

#### Impacto
- Un grant fuera de vigencia no debe ser considerado en la evaluación efectiva.
- En el MVP actual, la expiración puede evaluarse dinámicamente sin requerir transición inmediata a estado `EXPIRED`.
- La materialización explícita del estado `EXPIRED` y su reconciliación automática se consideran una mejora futura.
- El historial de cambios podrá registrar transiciones explícitas a EXPIRED cuando exista reconciliación administrativa o automática en una fase futura, pero ello no es requisito operativo del MVP actual.

### 4.8 ¿Qué pasa cuando un grant se revoca?

#### Decisión
La revocación cierra formalmente el grant antes de su expiración natural.

#### Justificación
Necesitas cierre explícito por decisión administrativa o correctiva.

#### Impacto
Un grant revocado no puede volver a ACTIVE.

### 4.9 ¿Qué granularidad exacta tendrá el target en el MVP?

#### Decisión
El MVP soportará grants sobre:
- capability
- resource + action

No se soportará en MVP:
- condition-based grants complejos
- ABAC avanzado
- políticas dependientes de atributos dinámicos del recurso en runtime

#### Justificación
Hay que evitar sobre diseñar.

#### Impacto
El target debe mantenerse explícito y acotado.

### 4.10 ¿Puede existir un grant sin membership válida?

#### Decisión
No.

#### Justificación
Un grant sin membership válida rompe el modelo de contexto y scope.

#### Impacto
- Un grant solo es operable si su membership asociada es válida y operable.

### 4.11 ¿Cuál es el estado inicial del grant en el MVP?

#### Decisión
En el MVP actual, los grants administrativos se crean directamente en estado `ACTIVE`.

#### Justificación
Los grants representan decisiones explícitas ya aprobadas por un actor con autoridad suficiente, por lo que no requieren un estado intermedio de aprobación.

#### Impacto
- El estado `PROPOSED` se mantiene en el modelo para evolución futura.
- No se implementa en el MVP un flujo de solicitud/aprobación de grants.

### 4.12 ¿Cómo se modelan los motivos administrativos y la trazabilidad histórica?

#### Decisión
Los motivos administrativos se modelan explícitamente por tipo de evento en el agregado Grant, separando:
- creationReason
- revocationReason
La trazabilidad histórica de transiciones relevantes se registra en GrantHistory.

#### Justificación
Separar los motivos por tipo de evento evita ambigüedad semántica y permite interpretar correctamente el estado actual del grant sin depender de inferencias sobre un campo único.

#### Impacto
- El agregado Grant expone claramente el motivo de creación y, cuando aplique, el motivo de revocación.
- GrantHistory registra eventos de transición (fromStatus, toStatus, changedBy, reason, createdAt).
- En el MVP actual, GrantHistory se considera un log de transiciones y no un snapshot completo del estado del grant.
- La reconstrucción completa del estado histórico requerirá evolución futura si se necesita snapshotting.
- La expiración del grant se explica por su ventana de vigencia (validUntil), sin requerir un motivo administrativo explícito adicional.
- En el MVP actual, GrantHistory se limita a registrar transiciones relevantes del lifecycle del grant; cambios administrativos que no impliquen transición de estado quedan fuera de su alcance y deberán resolverse vía audit trail o mediante una ampliación futura del modelo histórico.

## 5. Modelo conceptual

### Entidad principal
- Grant: representa una excepción explícita de acceso aplicada sobre una membership válida.
Contiene el effect (allow / deny), el target explícito, la ventana de vigencia opcional, el estado actual del grant y los datos administrativos asociados a su lifecycle actual, incluyendo:
  - creationReason
  - revocationReason
  - activatedAt
  - revokedAt
  - expiredAt (solo si se materializa la transición a EXPIRED)

### Entidades auxiliares
- GrantEffect: define si la excepción expande o restringe el baseline (allow / deny);
- GrantValidityWindow: representa la ventana temporal opcional de aplicabilidad del grant (validFrom, validUntil);
- GrantHistory: registra transiciones relevantes del lifecycle del grant, incluyendo estado origen, estado destino, actor, motivo y timestamp; en el MVP no registra correcciones administrativas que no impliquen cambio de estado;
- GrantAuditEvent: representa la trazabilidad operativa y de auditoría complementaria del submódulo;
- EffectivePermissionProjection o equivalente, si luego expones resolución consolidada.

### Ownership
- Grants es owner de las excepciones de acceso;
- Roles es owner del baseline de capacidades;
- Memberships es owner del contexto formal de pertenencia.

### Source of truth
- baseline de capacidades → Roles;
- excepción explícita → Grants;
- pertenencia y scope válido → Memberships.

### Relaciones
- Grant referencia membershipId;
- Grant puede referenciar capability, resource, action o combinación explícita;
- Grant puede tener ventana de vigencia;
- Grant puede tener historial de transiciones relevantes en GrantHistory;
- Access Resolution consume Roles + Grants + Memberships válidas.

## 6. Invariantes del submódulo

- Un Grant siempre pertenece a una Membership válida.
- Un Grant siempre debe tener effect explícito: allow o deny.
- Un Grant siempre debe tener target explícito y no ambiguo.
- Un Grant revocado no puede volver a estado ACTIVE.
- Un Grant expirado no puede volver a estado ACTIVE.
- Un Grant fuera de vigencia no participa en permisos efectivos.
- Grants no sustituyen la ausencia de Membership.
- Grants no sustituyen el catálogo base de Roles.
- La precedencia entre Role y Grant debe estar definida y ser estable.
- No deben existir grants ACTIVE equivalentes sobre la misma combinación membershipId + effect + target exacto.
- Toda creación, revocación, expiración relevante o cambio sensible debe ser auditable.
- La no duplicación de grants activos equivalentes debe protegerse tanto en validación de aplicación como en restricción fuerte de base de datos.
- Grants históricos o ya persistidos pueden seguir siendo consultables aunque la membership asociada deje de estar activa posteriormente; su operabilidad efectiva dependerá del estado vigente de la membership.
- Si ambos campos están presentes, validUntil debe ser estrictamente mayor que validFrom.
- En el MVP actual, la equivalencia de grants activos no considera diferencias en validFrom o validUntil; por tanto, no se permiten dos grants ACTIVE equivalentes sobre la misma combinación membershipId + effect + target exacto, aunque sus ventanas temporales difieran.

## 7. Lifecycle

### Estados
- PROPOSED
- ACTIVE
- EXPIRED
- REVOKED

### Transiciones válidas
- PROPOSED -> ACTIVE
- ACTIVE -> EXPIRED
- ACTIVE -> REVOKED
- PROPOSED -> REVOKED

### Transiciones inválidas
- EXPIRED -> ACTIVE
- REVOKED -> ACTIVE
- EXPIRED -> REVOKED
- REVOKED -> EXPIRED

### Reglas
- PROPOSED no participa en evaluación efectiva
- ACTIVE participa en evaluación efectiva solo si además está dentro de vigencia, cuando exista ventana temporal.
- Un grant fuera de vigencia deja de participar en evaluación efectiva aunque el estado persistido todavía no haya sido materializado como EXPIRED.
- EXPIRED deja de participar automáticamente cuando esa transición haya sido materializada.
- la expiración natural y la revocación administrativa son conceptos distintos
- la pertenencia a Membership válida sigue siendo requisito externo al lifecycle del grant
- En el MVP actual, los grants administrativos se crean directamente en estado `ACTIVE`.
- El estado `PROPOSED` no forma parte del flujo operativo actual.
- La consulta histórica del grant no depende de que su membership siga activa; depende de reglas de acceso administrativo y trazabilidad.
- La expiración del grant responde exclusivamente a su ventana temporal (validUntil) y no a cambios en la membership o en el usuario.
- Aunque el estado EXPIRED forma parte del modelo y del lifecycle teórico, en el MVP actual no se implementa un flujo operativo explícito de transición a EXPIRED; la expiración se trata dinámicamente en la evaluación efectiva y su materialización queda diferida.

## 8. Reglas críticas

- Todo grant debe tener target semántico explícito.
- Todo grant debe declarar allow o deny.
- La precedencia entre baseline de Roles y Grants debe estar documentada y cerrada.
- deny tiene precedencia sobre allow en el MVP, salvo excepción futura explícitamente diseñada.
- No se permiten grants ACTIVE duplicados sobre la misma combinación membershipId + effect + target exacto.
- En la etapa actual, esta restricción se protege mediante validación semántica en aplicación.
- Antes del despliegue productivo del MVP, deberá reforzarse mediante una garantía fuerte en base de datos (por ejemplo, constraint o índice único parcial acorde al shape semántico del target).
- Un grant fuera de vigencia no debe seguir participando en evaluación efectiva.
- Un grant no debe compensar ausencia de role o membership cuando el negocio exige baseline formal.
- El sistema debe poder explicar por qué un acceso fue otorgado o denegado.
- Toda evaluación efectiva debe invalidar o refrescar caché cuando cambien grants relevantes.
- Un grant no debe tener naming ambiguo ni alcance implícito.
- Los grants ya persistidos deben seguir siendo trazables y consultables incluso si la membership asociada cambia posteriormente a un estado no operable.

## 9. Impacto en otros módulos

- Users no consume grants directamente; el acceso siempre se contextualiza vía Memberships.
- Auth no decide grants, pero puede transportar contexto autenticado que luego será evaluado con grants.
- Memberships es prerequisito formal para crear y operar efectivamente un grant.
- Los grants ya persistidos pueden seguir siendo consultados y auditados aunque la membership asociada cambie luego de estado.
- Roles provee baseline de capacidades; Grants lo ajusta.
- Audit / History debe registrar creación, revocación, expiración materializada cuando exista, y cambios relevantes de grants.
- GrantHistory registra transiciones relevantes del lifecycle; el audit trail puede complementar información operativa adicional.
- Cambios administrativos no asociados a transición de estado no forman parte del alcance actual de GrantHistory y, si requieren trazabilidad futura, deberán resolverse mediante audit trail o una ampliación explícita del modelo histórico.
- Access resolution depende críticamente de la precedencia Roles + Grants + Memberships válidas.
- Partners Web / Platform Console no deben resolver permisos efectivos solo en frontend ni cachearlos sin invalidación bien definida.
- Observability / Risk puede consumir señales de grants excepcionales o sensibles, pero no es owner del dato.
- La evaluación efectiva de permisos deberá considerar:
  - membership operable
  - capacidades base por roles
  - grants aplicables
  - vigencia temporal del grant
  - precedencia deny sobre allow en el MVP
- La expiración de un grant está determinada exclusivamente por su ventana de vigencia y no por eventos administrativos externos como cambios en membership o usuario.

## 10. Contratos

### DTOs (MVP)
- CreateGrantDto
- RevokeGrantDto
- GrantIdParamDto
- MembershipIdParamDto
- ListGrantsQueryDto
- GrantResponseDto
- GrantSummaryResponseDto

### DTOs diferidos (no incluidos en MVP)
- ExtendGrantDto
- EvaluateAccessQueryDto
- EffectivePermissionsResponseDto

### Acciones (MVP)
- create grant
- revoke grant
- get grant by id
- list grants
- list grants by membership

### Acciones diferidas
- extend grant
- expire grant manually
- evaluate effective access
- list effective permissions

### Acciones administrativas diferidas o restringidas
- expire grant manually
- bulk revoke grants
- repair inconsistent grants
- evaluate effective access
- list effective permissions

### Errores (MVP implementados)
- grant_not_found
- grant_membership_not_found
- grant_membership_inactive
- duplicate_active_grant
- invalid_grant_target
- invalid_grant_transition
- grant_access_denied
- invalid_grant_validity_window

### Errores diferidos / no implementados aún
- invalid_grant_scope
- grant_already_revoked
- grant_already_expired
- grant_membership_conflict
- grant_conflict_with_role
- effective_permissions_unresolvable

### Scopes (MVP)
- administración de grants restringida a platform admin
- sin grants fuera de membership válida

### Scopes futuros (diferidos)
- administración delegada a actores con autoridad dentro de su scope (tenant_admin, store_manager, etc.)
- control basado en jerarquía organizacional

### Eventos
- grant_created
- grant_revoked
- grant_expired
- effective_permissions_changed

## Historial
- GrantHistory registra transiciones relevantes del lifecycle del grant
- en el MVP actual, GrantHistory no representa snapshot completo del agregado en cada cambio
- en el MVP actual, GrantHistory no registra correcciones administrativas que no impliquen transición de estado

## 11. Diseño de validación

### Familias de prueba
- reglas de negocio
- servicio
- integración
- contrato/endpoint
- E2E mínima

### Escenarios principales (MVP)
- crear grant allow válido sobre membership activa
- crear grant deny válido sobre membership activa
- revocar grant activo
- listar grants del scope permitido
- listar grants por membership
- consultar grant histórico aunque la membership asociada ya no esté activa

### Escenarios diferidos
- extender grant vigente
- recalcular permisos efectivos tras grant nuevo
- registrar históricamente cambios administrativos sin transición de estado

### Escenarios inválidos
- crear grant sin membership válida
- crear grant duplicado
- crear grant con target ambiguo
- revocar grant inexistente
- extender grant revocado
- evaluar acceso con precedencia no resuelta
- crear grant con ventana temporal inválida (validUntil <= validFrom)

### Casos borde
- membership suspendida o revocada con grants todavía persistidos y consultables administrativamente
- grant que expira mientras existe sesión autenticada activa
- coexistencia de role allow base y grant deny explícito
- múltiples grants sobre targets cercanos
- invalidación de caché tras revocación inmediata
- doble creación concurrente del mismo grant; en la etapa actual se cubre parcialmente a nivel semántico en aplicación y deberá completarse con constraint real de DB antes de producción.
- revocación concurrente con fallo de optimistic versioning

### Seguridad
- no permitir creación de grants fuera del scope autorizado
- no exponer grants sensibles de otros scopes
- no confiar en frontend para resolver precedencia
- validar backend del target exacto del grant
- minimizar filtración de estructura interna de permisos

### Concurrencia
- doble creación simultánea del mismo grant
- revocación concurrente
- expiración natural concurrente con revocación administrativa
- evaluación efectiva mientras cambia baseline o grants

### Criterios de aceptación
- Grant claramente separado de Role y Membership
- effect y target explícitos
- precedencia documentada
- lifecycle coherente
- unicidad operativa protegida
- evaluación efectiva explicable
- eventos y errores semánticos definidos
- pruebas mínimas automatizadas definidas
- contrato oficial de listado por membership definido
- unicidad fuerte de grants activos equivalentes protegida en DB
- semántica de reason e historia definida explícitamente
- alcance de GrantHistory acotado explícitamente a transiciones de lifecycle en el MVP

## 12. Confiabilidad y hardening

- Idempotencia: creación, revocación y extensión deben tolerar reintentos seguros cuando corresponda.
- Auditoría: creación y revocación deben registrar motivos administrativos explícitos en el agregado Grant; la expiración natural se explica por la ventana de vigencia y no requiere motivo adicional.
- Observabilidad: métricas de grants creados, revocados, expirados, conflictos detectados y errores de resolución efectiva.
- Rate limiting: especialmente en endpoints administrativos o de evaluación expuesta si existe.
- Retry: solo en operaciones reconciliables o idempotentes.
- Invalidación de caché: debe estar claramente definida cuando los grants cambien permisos efectivos.
- Concurrencia: en la etapa actual, la no duplicación de grants activos equivalentes se protege mediante validación semántica en aplicación.
- Antes del despliegue productivo del MVP, deberá añadirse una restricción fuerte en base de datos que proteja esa unicidad frente a concurrencia real.
- La revocación debe usar optimistic versioning y validar que la actualización afecte exactamente un registro.
- Minimización de datos: DTOs y eventos no deben exponer información innecesaria del recurso o actor.
- Retención: definir tiempo de conservación para grants expirados, revocados y audit trails.
- Explicabilidad: debe existir forma de reconstruir por qué un acceso fue permitido o denegado.
- Historia: el modelo actual de GrantHistory registra transiciones relevantes del lifecycle (fromStatus, toStatus, changedBy, reason, createdAt); no registra en el MVP correcciones administrativas sin cambio de estado. Una reconstrucción completa del estado histórico requerirá evolución adicional si se necesita snapshotting o historial de cambios no-lifecycle.

## 13. Riesgos

### Riesgos de diseño
- convertir grants en sustituto de roles
- no definir precedencia clara entre role y grant
- grants demasiado amplios o ambiguos
- usar grants para suplir memberships inexistentes
- mezclar excepción operativa con política base

### Riesgos de implementación
- grants activos duplicados
- expiración no aplicada realmente
- caché de permisos sin invalidación correcta
- conflictos no resueltos entre baseline y excepción
- endpoint de evaluación efectiva opaco o inconsistente
- asumir que GrantHistory representa snapshot completo cuando en realidad solo registra transiciones relevantes
- optimistic versioning incompleto que permita revocaciones “exitosas” sin afectar filas
- divergencia entre validación semántica y constraint real de unicidad en DB
- asumir que GrantHistory cubre cualquier cambio administrativo cuando en realidad en el MVP solo cubre transiciones de lifecycle
- mientras no exista constraint real en DB, la protección contra grants activos duplicados equivalentes no queda completamente cerrada ante concurrencia real

### Riesgos operativos
- no poder explicar por qué alguien tuvo acceso
- proliferación caótica de grants excepcionales
- grants temporales que quedan vivos demasiado tiempo
- denegaciones no visibles que rompen operación
- dependencia excesiva de grants para sostener procesos normales

## 14. Decisiones diferidas conscientemente

- ABAC o condiciones dinámicas por atributos
- grants por instancia compleja de recurso
- políticas jerárquicas de herencia entre recursos
- precedence matrix más sofisticada que deny-over-allow
- motor central de policy evaluation avanzado
- explainability API completa
- reconciliación automática masiva de grants huérfanos
- workflow formal de grants con estado PROPOSED y activación posterior
- administración delegada de grants por jerarquía organizacional
- materialización automática del estado EXPIRED mediante reconciliación
- evaluación consolidada de permisos efectivos (Access Resolution)
- snapshot histórico completo del agregado Grant en cada cambio
- API de consulta histórica detallada / reconstrucción temporal del grant
- historial explícito de cambios administrativos no asociados a transición de estado
- implementación física de la garantía fuerte de unicidad en base de datos para grants ACTIVE equivalentes; queda diferida hasta contar con la base de datos real y deberá completarse antes de producción del MVP

## 15. Definition of Done

- Grants definido como submódulo de excepciones de acceso, separado de Roles y Memberships
- subject, effect y target claramente definidos
- precedencia con baseline de Roles cerrada
- lifecycle de grant cerrado
- invariantes documentados
- impacto en otros módulos documentado
- DTOs, acciones, errores, scopes y eventos definidos
- estrategia de expiración, revocación e invalidación resuelta
- diseño de validación mínimo definido
- hardening mínimo definido
- riesgos principales identificados
- decisiones diferidas conscientemente registradas
- semántica de los motivos administrativos (creationReason, revocationReason) y de GrantHistory definida explícitamente
- contrato oficial de list grants by membership documentado
- comportamiento de consulta histórica frente a memberships no activas documentado
- estrategia de unicidad fuerte en DB definida
- protección semántica en aplicación implementada en la etapa actual
- implementación física de la restricción fuerte en DB pendiente obligatoria antes de despliegue productivo del MVP
- alcance de GrantHistory respecto a cambios lifecycle vs. no-lifecycle definido explícitamente