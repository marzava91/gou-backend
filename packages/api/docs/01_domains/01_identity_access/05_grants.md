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
Sí. Un Grant puede tener vigencia temporal explícita.

#### Justificación
Muchas excepciones no deben ser permanentes.

#### Impacto
Debe existir:
- validFrom
- validUntil
o equivalente

### 4.7 ¿Qué pasa cuando un grant expira?

#### Decisión
Un grant expirado deja automáticamente de participar en la evaluación efectiva y no vuelve a estado activo.

#### Justificación
Evita grants “zombie”.

#### Impacto
La expiración debe ser operativamente observable y auditable cuando aplique.

### 4.8 ¿Qué pasa cuando un grant se revoca?

#### Decisión
La revocación cierra formalmente el grant antes de su expiración natural.

#### Justificación
Necesitas cierre explícito por decisión administrativa o correctiva.

#### Impacto
Un grant revocado no puede volver a active.

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
Los grants deben invalidarse funcionalmente si la membership deja de ser operable.

## 5. Modelo conceptual

### Entidad principal
- Grant

### Entidades auxiliares
- GrantSubject
- GrantResource
- GrantEffect
- GrantValidityWindow
- GrantAuditEvent
- EffectivePermissionProjection o equivalente, si luego expones resolución consolidada

### Ownership
- Grants es owner de las excepciones de acceso
- Roles es owner del baseline de capacidades
- Memberships es owner del contexto formal de pertenencia

### Source of truth
- baseline de capacidades → Roles
- excepción explícita → Grants
- pertenencia y scope válido → Memberships

### Relaciones
- Grant referencia membershipId
- Grant puede referenciar capability, resource, action o combinación explícita
- Grant puede tener ventana de vigencia
- Access resolution consume Roles + Grants + Memberships válidas

## 6. Invariantes del submódulo

- Un Grant siempre pertenece a una Membership válida.
- Un Grant siempre debe tener effect explícito: allow o deny.
- Un Grant siempre debe tener target explícito y no ambiguo.
- Un Grant revocado no puede volver a estado active.
- Un Grant expirado no puede volver a estado active.
- Un Grant fuera de vigencia no participa en permisos efectivos.
- Grants no sustituyen la ausencia de Membership.
- Grants no sustituyen el catálogo base de Roles.
- La precedencia entre Role y Grant debe estar definida y ser estable.
- Un mismo grant no debe duplicarse activamente sobre el mismo target exacto y misma membership.
- Toda creación, revocación, expiración relevante o cambio sensible debe ser auditable.

## 7. Lifecycle

### Estados
- proposed
- active
- expired
- revoked

### Transiciones válidas
- proposed -> active
- active -> expired
- active -> revoked
- proposed -> revoked

### Transiciones inválidas
- expired -> active
- revoked -> active
- expired -> revoked
- revoked -> expired

### Reglas
- proposed no participa en evaluación efectiva
- active sí participa si está dentro de vigencia
- expired deja de participar automáticamente
- revoked cierra formalmente el grant antes o independientemente de la expiración
- la expiración natural y la revocación administrativa son conceptos distintos
- la pertenencia a Membership válida sigue siendo requisito externo al lifecycle del grant

## 8. Reglas críticas

- Todo grant debe tener target semántico explícito.
- Todo grant debe declarar allow o deny.
- La precedencia entre baseline de Roles y Grants debe estar documentada y cerrada.
- deny tiene precedencia sobre allow en el MVP, salvo excepción futura explícitamente diseñada.
- No se permiten grants activos duplicados sobre la misma combinación membershipId + effect + target.
- Un grant fuera de vigencia no debe seguir participando en evaluación efectiva.
- Un grant no debe compensar ausencia de role o membership cuando el negocio exige baseline formal.
- El sistema debe poder explicar por qué un acceso fue otorgado o denegado.
- Toda evaluación efectiva debe invalidar o refrescar caché cuando cambien grants relevantes.
- Un grant no debe tener naming ambiguo ni alcance implícito.

## 9. Impacto en otros módulos

- Users no consume grants directamente; el acceso siempre se contextualiza vía Memberships.
- Auth no decide grants, pero puede transportar contexto autenticado que luego será evaluado con grants.
- Memberships es prerequisito formal para que un grant sea operable.
- Roles provee baseline de capacidades; Grants lo ajusta.
- Audit debe registrar creación, revocación, expiración y cambios relevantes de grants.
- Access resolution depende críticamente de la precedencia Roles + Grants + Memberships válidas.
- Partners Web / Platform Console no deben resolver permisos efectivos solo en frontend ni cachearlos sin invalidación bien definida.
- Observability / Risk puede consumir señales de grants excepcionales o sensibles, pero no es owner del dato.

## 10. Contratos

### DTOs
- CreateGrantDto
- RevokeGrantDto
- ExtendGrantDto
- GetGrantByIdParamsDto
- ListGrantsQueryDto
- GrantResponseDto
- GrantSummaryDto
- EvaluateAccessQueryDto (solo si decides exponer evaluación consolidada)
- EffectivePermissionsResponseDto (solo si expones permisos efectivos)

### Acciones
- create grant
- revoke grant
- extend grant
- get grant by id
- list grants

### Acciones administrativas diferidas o restringidas
- expire grant manually
- bulk revoke grants
- repair inconsistent grants
- evaluate effective access
- list effective permissions

### Errores
- grant_not_found
- invalid_grant_scope
- invalid_grant_target
- duplicate_grant
- grant_not_active
- grant_already_revoked
- grant_already_expired
- grant_membership_conflict
- grant_conflict_with_role
- effective_permissions_unresolvable

### Scopes
- tenant/store admin según política, dentro de su scope
- platform admin para grants cross-tenant o administrativos especiales
- sin grants fuera de membership válida
- la evaluación efectiva expuesta, si existe, debe respetar el mismo scope de acceso

### Eventos
- grant_created
- grant_revoked
- grant_expired
- effective_permissions_changed

## 11. Diseño de validación

### Familias de prueba
- reglas de negocio
- servicio
- integración
- contrato/endpoint
- E2E mínima

### Escenarios principales
- crear grant allow válido sobre membership activa
- crear grant deny válido sobre membership activa
- revocar grant activo
- extender grant vigente
- listar grants del scope permitido
- recalcular permisos efectivos tras grant nuevo

### Escenarios inválidos
- crear grant sin membership válida
- crear grant duplicado
- crear grant con target ambiguo
- revocar grant inexistente
- extender grant revocado
- evaluar acceso con precedencia no resuelta

### Casos borde
- membership suspendida con grants todavía persistidos
- grant que expira mientras existe sesión autenticada activa
- coexistencia de role allow base y grant deny explícito
- múltiples grants sobre targets cercanos
- invalidación de caché tras revocación inmediata

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

## 12. Confiabilidad y hardening

- Idempotencia: creación, revocación y extensión deben tolerar reintentos seguros cuando corresponda.
- Auditoría: creación, revocación, extensión, expiración relevante y evaluación sensible deben quedar auditadas.
- Observabilidad: métricas de grants creados, revocados, expirados, conflictos detectados y errores de resolución efectiva.
- Rate limiting: especialmente en endpoints administrativos o de evaluación expuesta si existe.
- Retry: solo en operaciones reconciliables o idempotentes.
- Invalidación de caché: debe estar claramente definida cuando los grants cambien permisos efectivos.
- Concurrencia: constraints de unicidad, locking u optimistic versioning para evitar grants duplicados o estados inconsistentes.
- Minimización de datos: DTOs y eventos no deben exponer información innecesaria del recurso o actor.
- Retención: definir tiempo de conservación para grants expirados, revocados y audit trails.
- Explicabilidad: debe existir forma de reconstruir por qué un acceso fue permitido o denegado.

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