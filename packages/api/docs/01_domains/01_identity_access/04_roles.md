# ROLES

## 1. Propósito del submódulo

Roles define conjuntos estructurados de capacidades operativas que pueden ser asignadas a una Membership dentro de un scope válido, permitiendo determinar qué puede hacer un usuario dentro de ese contexto.

Resuelve:
- definición de roles como agrupaciones de capacidades
- asignación de roles a memberships
- versionado y evolución controlada de roles
- separación entre capacidades base (roles) y excepciones (grants)
- trazabilidad de cambios en roles y asignaciones

No resuelve:
- identidad del usuario → Users
- autenticación o sesiones → Auth
- pertenencia a tenant/store → Memberships
- permisos individuales excepcionales → Grants
- ejecución de autorización en runtime (eso es capa de access resolution)

No define por sí mismo:
- decisiones de autorización en endpoints (eso se evalúa en runtime)
- pertenencia organizacional
- identidad externa
- lógica de negocio específica por feature

## 2. Definición canónica

Un Role es una definición estructurada y reusable de capacidades que puede ser asignada a una Membership para habilitar acciones dentro de un scope determinado.

Su rol dentro del sistema:
- Users → quién es
- Auth → cómo accede
- Memberships → dónde puede actuar
- Roles → qué puede hacer (base)
- Grants → excepciones o overrides

Otros módulos dependen de Roles para:
- resolver capacidades base del usuario dentro de un scope
- evitar hardcode de permisos en múltiples lugares
- mantener consistencia en autorización

Esto está alineado con tu principio de no usar grants para todo y evitar dispersión de lógica de permisos .

## 3. Fronteras

### Pertenece a Roles
- definición de roles
- capacidades asociadas a cada rol
- metadata del rol
- asignación de roles a memberships
- versionado y evolución del rol
- lifecycle del rol
- trazabilidad de cambios de definición y asignación

### No pertenece a Roles
- pertenencia (Memberships)
- permisos individuales → Grants
- identidad → Users
- autenticación → Auth
- resolución final de permisos en runtime
- reglas de negocio específicas por endpoint
- ownership de tenant/store

## 4. Decisiones estructurales

### 4.1 ¿Qué representa exactamente un Role?

#### Decisión
Un Role representa un conjunto semántico de capacidades operativas, no un usuario ni una pertenencia.

#### Justificación
Evita confundir:
- role = capacidad
- membership = pertenencia

#### Impacto
Roles siempre se asignan sobre memberships, no sobre users directamente.

### 4.2 ¿Los roles son TENANT-scoped, STORE-scoped o ambos?

#### Decisión
En el MVP, el sistema soporta dos categorías explícitas de roles:
- TENANT-scoped roles
- STORE-scoped roles

No existe en esta versión un catálogo separado de platform-scoped roles, ni un `tenantId` como parte del modelo de Role.

#### Justificación
Esto alinea la planificación con el modelo actual implementado en Prisma y servicios, evitando introducir segmentación de catálogo no implementada todavía.

#### Impacto
El modelo de Role declara explícitamente:
- scopeType (`TENANT` o `STORE`)

En el MVP, la compatibilidad entre Role y Membership es estricta por igualdad de scope:
- TENANT role → TENANT membership
- STORE role → STORE membership

No se permite, en esta versión, asignar un TENANT role sobre una STORE membership ni viceversa.

La segmentación más avanzada del catálogo queda diferida.

### 4.3 ¿Los roles se asignan a User o a Membership?

#### Decisión
Los roles se asignan exclusivamente a Membership, y solo cuando exista compatibilidad estricta entre el `scopeType` del role y el `scopeType` de la membership objetivo.

En el MVP:
- TENANT role → TENANT membership
- STORE role → STORE membership

No se permite asignación cruzada entre scopes incompatibles.

#### Justificación
Evita inconsistencias como:
- usuario con rol pero sin pertenencia válida
- permisos fuera de contexto
- asignaciones ambiguas entre niveles organizacionales distintos

#### Impacto
No existe user-role directo ni asignación fuera de contexto.
Toda asignación de role queda anclada a una membership válida y compatible por scope.

### 4.4 ¿Qué contiene un Role?

#### Decisión
Un Role contiene:
- identificador único
- key
- name
- description
- scopeType
- conjunto de capacidades explícitas
- indicador temporal de retiro operativo (`retiredAt`)
- versión
- indicador `isSystem`

No contiene:
- users
- memberships
- grants
- sesiones
- un lifecycle multietapa formal en esta versión MVP

### Semántica MVP de `isSystem`
- `isSystem = true` → role sembrado o reservado como parte del catálogo base de plataforma
- `isSystem = false` → role creado como definición operativa/custom

En este corte MVP, los roles creados por endpoint administrativo nacen por defecto como `isSystem = false`, salvo indicación explícita.

#### Justificación
En el MVP el catálogo de roles necesita una semántica simple y operable.
Se usará `retiredAt` para indicar que un role ya no puede participar en nuevas asignaciones, sin introducir todavía estados adicionales como draft, deprecated o archived.

#### Impacto
El modelo de Role no implementa aún un estado formal de lifecycle.
Las políticas de transición más ricas quedan diferidas para una iteración posterior.

### 4.5 ¿Cómo se normaliza `role.key`?

#### Decisión
`role.key` se normaliza antes de validarse y persistirse:
- trim de espacios laterales
- lowercase canónico

#### Justificación
Evita duplicados semánticos y asegura unicidad lógica estable del catálogo.

#### Impacto
La unicidad de `role.key` debe evaluarse sobre su forma normalizada.

### 4.6 ¿Cómo se modelan las capacidades?

#### Decisión
Se modelan como un permission template explícito (lista estructurada de capacidades).

Ejemplo conceptual:
- orders.read
- orders.create
- users.manage

#### Justificación
Evita:
- lógica implícita
- roles “mágicos”
- dependencia de nombres

#### Impacto
Roles no son solo labels; son estructuras semánticas.

### 4.7 ¿Qué pasa cuando cambia la definición de un Role?

#### Decisión
El cambio de un role:
- no modifica automáticamente el historial
- sí impacta las capacidades futuras efectivas
- debe generar evento
- puede requerir invalidación o refresh de permisos efectivos

#### Justificación
Evita inconsistencias silenciosas.

#### Impacto
Auth/Access layer debe reevaluar capacidades.

### 4.8 ¿Puede un Role coexistir con otros?

#### Decisión
Sí, múltiples roles pueden coexistir en una misma membership, salvo reglas explícitas de incompatibilidad.

#### Justificación
Necesitas composición de capacidades.

#### Impacto
Debe existir validación de conflictos si aplica.

### 4.9 ¿Qué pasa con roles “admin”?

#### Decisión
No existe “admin” implícito.
Todo rol debe definirse explícitamente con capacidades.

#### Justificación
Evita ambigüedad y abuso.

#### Impacto
Nada depende de strings como “admin”.

### 4.10 ¿Cómo se relaciona Roles con Grants?

#### Decisión
Roles definen capacidades base.
Grants definen excepciones.

#### Justificación
Evita que roles se conviertan en contenedor de excepciones.

#### Impacto
No mezclar lógica.

### 4.11 ¿Qué pasa al remover un Role de una Membership?

#### Decisión
- se elimina la capacidad base asociada
- no afecta la membership en sí
- puede afectar permisos efectivos inmediatamente

#### Impacto
Debe haber reevaluación de acceso.

## 5. Modelo conceptual

### Entidad principal
- Role

### Entidades auxiliares
- RoleCapability
- RoleAssignment
- RoleAssignmentHistory

### Nota de implementación MVP
La auditoría y publicación de eventos se abstraen mediante puertos del submódulo.
No existe en esta versión una entidad persistida explícita llamada RoleAuditEvent o RoleVersion.

### Ownership
- Roles es owner del catálogo de capacidades base reutilizables
- Memberships es owner de la pertenencia formal y del contexto habilitado
- Grants es owner de excepciones explícitas
- Access Resolution es owner de la decisión efectiva final

### Source of truth
- definición de capacidades base reutilizables → Role
- asignación concreta de capacidades base a un contexto formal → RoleAssignment

### Relaciones
- RoleAssignment referencia membershipId
- RoleAssignment referencia roleId
- un Role puede estar asignado a múltiples memberships compatibles
- una Membership puede tener múltiples roles compatibles
- Grants ajusta el resultado efectivo, pero no redefine el catálogo de roles
- Access Resolution consume roles asignados y grants para resolver acceso efectivo

### Semántica MVP del campo `reason`
- En `RoleAssignment`, `reason` representa la razón original de asignación.
- Las razones de cambio de estado posteriores, como revocación, se registran en `RoleAssignmentHistory`.

## 6. Invariantes del submódulo

- Un Role no pertenece a un User directamente.
- Un Role solo puede asignarse a una Membership válida.
- Un Role debe tener `scopeType` explícito.
- Un Role no puede ser ambiguo en capacidades.
- Un Role con `retiredAt` distinto de null no debe asignarse a nuevas memberships.
- Un Role no define excepciones individuales.
- Las capacidades deben ser explícitas, no implícitas.
- Un cambio de Role debe ser auditable.
- Un Role solo puede asignarse a una Membership cuyo `scopeType` sea estrictamente igual al `scopeType` del role.
- En el MVP no se permite asignación cruzada entre scopes incompatibles:
  - TENANT role → TENANT membership
  - STORE role → STORE membership
- Un Role retirado no debe seguir evolucionando operativamente dentro del flujo MVP si la política de servicio así lo restringe.
- Un RoleAssignment no puede existir sin Membership válida y Role asignable.
- No debe existir más de una asignación activa equivalente para la misma combinación membershipId + roleId.

## 7. Lifecycle

### Role catalog lifecycle en MVP
En esta versión MVP, Role no implementa un lifecycle formal con estados como draft, deprecated o archived.

En cambio, el catálogo usa una semántica operativa mínima:

- `retiredAt = null` → role disponible para uso operativo
- `retiredAt != null` → role retirado; no debe usarse en nuevas asignaciones

### Reglas
- Un role no retirado puede ser creado, consultado y asignado según compatibilidad de scope y reglas de acceso.
- Un role retirado puede seguir existiendo por trazabilidad e historial.
- Un role retirado no debe participar en nuevas asignaciones.
- La semántica de deprecated/archive queda diferida para una iteración posterior.

### Decisión diferida
La introducción de estados explícitos de lifecycle del catálogo queda postergada hasta que exista una necesidad clara de gobierno avanzado de roles, migraciones controladas o versionado operativo más rico.

## 8. Reglas críticas

- Roles deben tener scope explícito.
- Roles no deben ser ambiguos en capacidades.
- No se permite asignación directa a User.
- Cambios en roles deben ser auditados.
- Roles no sustituyen Grants.
- No confiar en nombres de roles para lógica.
- Evitar proliferación descontrolada de roles.
- Validar conflictos entre roles cuando esa política exista.
- Roles deben ser versionables o auditables.
- No se puede asignar un role a una membership con scope incompatible.
- En el MVP, la compatibilidad entre Role y Membership es estricta por igualdad de scope:
  - TENANT role → TENANT membership
  - STORE role → STORE membership
- No se permite, en esta versión, asignar un TENANT role sobre una STORE membership ni viceversa.
- Un role no puede usarse para simular pertenencia a un scope no cubierto por la membership.
- Un role retirado no puede participar en nuevas asignaciones.

## 9. Impacto en otros módulos

- Memberships habilita el contexto formal sobre el cual los roles pueden asignarse y operar.
- Users no recibe roles directamente ni mantiene capacidades canónicas.
- Auth autentica, pero no define capacidades operativas.
- Grants modifica o restringe capacidades efectivas derivadas de roles, sin reemplazar el catálogo base.
- Access Resolution consume roles asignados, memberships válidas y grants para resolver acceso efectivo.
- Audit debe registrar creación, retiro operativo y cambios de asignación de roles.
- Las superficies consumidoras no deben inferir capacidades solo por nombre de role; deben consumir resolución efectiva consistente.
- La compatibilidad entre roles y memberships, en este MVP, depende de igualdad estricta de scope:
  - TENANT role → TENANT membership
  - STORE role → STORE membership
- La segmentación administrativa más avanzada del catálogo queda diferida para una iteración posterior.

## 10. Contratos

### DTOs implementados en este corte MVP
- CreateRoleDto
- AssignRoleDto
- RevokeRoleDto
- ListRolesQueryDto
- MembershipIdParamDto
- RoleAssignmentIdParamDto
- RoleResponseDto
- RoleAssignmentResponseDto
- RoleSummaryResponseDto

### Acciones implementadas
- create role
- list roles
- list roles con filtro opcional por `scopeType`
- assign role to membership
- revoke role assignment
- list roles assigned to membership

### Acciones preparadas o diferidas
- update role
- get role by id
- retire role
- bulk assign/remove roles
- catálogo segmentado por administración avanzada de scope

### Errores implementados o alineados con el corte MVP
- role_not_found
- role_already_exists
- role_retired
- role_membership_scope_mismatch
- duplicate_role_assignment
- role_assignment_not_found
- invalid_role_assignment_transition
- role_assignment_membership_not_found
- role_assignment_membership_inactive

### Scopes

En este corte MVP, la administración expuesta del submódulo está restringida a actores con privilegio de platform admin.
La delegación de administración tenant-scoped o políticas más finas de acceso quedan diferidas para una iteración posterior.

### Eventos

- role_created
- role_updated
- role_retired
- role_assigned
- role_assignment_revoked

## 11. Diseño de validación

### Familias de prueba
- reglas de negocio
- servicio
- contrato/endpoint
- E2E mínima

### Escenarios principales
- crear role válido TENANT
- crear role válido STORE
- asignar role compatible a membership válida
- revocar role assignment activo
- listar roles
- listar roles asignados a una membership

### Escenarios inválidos
- asignar role retirado
- asignar role con scope incompatible
- duplicar role assignment activo
- asignar role a membership inexistente
- asignar role a membership no activa
- revocar role assignment inexistente
- revocar role assignment ya no revocable

### Casos borde
- múltiples roles coexistiendo en una misma membership
- cambio futuro de definición de role en uso
- role assignment concurrente duplicado
- normalización y deduplicación de capability keys

### Seguridad
- no permitir asignación fuera del scope autorizado
- no confiar en nombres de role para autorización
- no exponer más catálogo del necesario según política de acceso

### Concurrencia
- creación concurrente de roles equivalentes
- doble asignación simultánea del mismo role a una membership
- actualización concurrente futura de definición de role y resolución de permisos efectivos

### Criterios de aceptación
- separación clara entre Role, Membership y Grant
- scope explícito y compatible
- compatibilidad estricta entre role y membership por igualdad de scope en el MVP
- asignación contextualizada
- cambios auditables
- contratos claros
- pruebas mínimas automatizadas definidas

## 12. Confiabilidad y hardening

- Idempotencia: asignación y remoción de roles deben tolerar reintentos seguros.
- Auditoría: creación, actualización futura, retiro operativo y cambios de asignación deben quedar auditados.
- Observabilidad: métricas de roles creados, asignados, revocados, retirados y conflictos de asignación.
- Rate limiting: principalmente sobre endpoints administrativos masivos o sensibles.
- Retry: solo en operaciones idempotentes o reconciliables.
- Concurrencia: unique constraints o locking para evitar RoleAssignment duplicados.
- Minimización de datos: DTOs y eventos no deben exponer más contexto del necesario.
- Retención: definir cuánto tiempo se conserva historial de definiciones y asignaciones.
- Invalidación: cambios relevantes en roles o asignaciones deben invalidar o refrescar permisos efectivos.

### Nota de implementación MVP
La unicidad de asignación activa equivalente se protege actualmente a nivel de servicio y mediante manejo de concurrencia / errores transaccionales.
El refuerzo estricto a nivel DB queda sujeto a una estrategia posterior más precisa.

## 13. Riesgos

- mezclar catálogo de roles con catálogo de permisos dinámicos
- permitir catálogos o scopes sin límites claros antes de modelarlos correctamente
- mantener roles retirados sin política futura clara de limpieza o sustitución
- incapacidad de reconstruir qué capacidades tenía un usuario históricamente

## 14. Decisiones diferidas

- jerarquía de roles
- roles dinámicos
- inheritance

## 15. Definition of Done

- catálogo de roles definido con scope explícito
- capacidades explícitas por role modeladas y normalizadas
- separación entre Role, RoleAssignment y Grant definida
- compatibilidad entre Role y Membership documentada para el MVP
- compatibilidad estricta entre scopes documentada:
  - TENANT role → TENANT membership
  - STORE role → STORE membership
- política de retiro operativo vía `retiredAt` documentada
- asignación y revocación de roles sobre memberships implementadas
- invariantes principales del submódulo documentados
- contratos MVP expuestos y probados
- pruebas mínimas automatizadas definidas para reglas, servicios y endpoints principales