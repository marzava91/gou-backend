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

### 4.2 ¿Los roles son platform-scoped, tenant-scoped o ambos?

#### Decisión
El sistema soporta dos categorías explícitas de roles:
- platform-scoped roles: definidos y administrados por la plataforma para contextos platform
- tenant-scoped roles: definidos para operar dentro del contexto de un tenant y asignables sobre memberships válidas de ese tenant

No habrá roles ambiguos ni roles implícitamente reutilizables entre scopes incompatibles.

En el MVP:
- no habrá store-scoped roles como categoría independiente
- los roles tenant-scoped podrán operar sobre memberships tenant-scoped y, cuando la política lo permita, sobre memberships store-scoped pertenecientes al mismo tenant

#### Justificación
Esto evita mezclar catálogo de plataforma con catálogo operativo del tenant, y evita introducir una tercera dimensión de scope prematuramente.

#### Impacto
El modelo de Role debe declarar explícitamente:
- scopeType
- tenantId cuando el role sea tenant-scoped
- reglas de asignación compatibles con el scope de la membership

Ese cambio solo ya lo alinea bastante más.

### 4.3 ¿Los roles se asignan a User o a Membership?

#### Decisión
Los roles se asignan exclusivamente a Membership, y solo cuando exista compatibilidad entre el scopeType del role y el scope de la membership objetivo.

#### Justificación
Evita inconsistencias como:
- usuario con rol pero sin pertenencia válida
- permisos fuera de contexto

#### Impacto
No existe user-role directo ni asignación fuera de contexto.

### 4.4 ¿Qué contiene un Role?

#### Decisión
Un Role contiene:
- identificador único
- nombre
- descripción
- scopeType
- conjunto de capacidades (permission template)
- estado
- versión

No contiene:
- users
- memberships
- grants
- sesiones

#### Justificación
Separación clara entre definición y asignación.

### 4.5 ¿Cómo se modelan las capacidades?

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

### 4.6 ¿Qué pasa cuando cambia la definición de un Role?

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

### 4.7 ¿Puede un Role coexistir con otros?

#### Decisión
Sí, múltiples roles pueden coexistir en una misma membership, salvo reglas explícitas de incompatibilidad.

#### Justificación
Necesitas composición de capacidades.

#### Impacto
Debe existir validación de conflictos si aplica.

### 4.8 ¿Qué pasa con roles “admin”?

#### Decisión
No existe “admin” implícito.
Todo rol debe definirse explícitamente con capacidades.

#### Justificación
Evita ambigüedad y abuso.

#### Impacto
Nada depende de strings como “admin”.

### 4.9 ¿Cómo se relaciona Roles con Grants?

#### Decisión
Roles definen capacidades base.
Grants definen excepciones.

#### Justificación
Evita que roles se conviertan en contenedor de excepciones.

#### Impacto
No mezclar lógica.

### 4.10 ¿Qué pasa al remover un Role de una Membership?

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
- RoleAssignment
- RolePermissionTemplate
- RoleVersion
- RoleAuditEvent

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

## 6. Invariantes del submódulo

- Un Role no pertenece a un User directamente.
- Un Role solo puede asignarse a una Membership válida.
- Un Role debe tener scopeType explícito.
- Un Role no puede ser ambiguo en capacidades.
- Un Role deprecated no debe asignarse a nuevas memberships.
- Un Role archived no debe ser usable.
- Una RoleAssignment debe ser única por combinación membershipId + roleId.
- Un Role no define excepciones individuales.
- Las capacidades deben ser explícitas, no implícitas.
- Un cambio de Role debe ser auditable.
- Un Role solo puede asignarse a una Membership cuyo scope sea compatible con el scopeType del role.
- Un Role archived no puede participar en nuevas asignaciones ni seguir evolucionando.
- Un Role deprecated puede seguir afectando asignaciones históricas existentes según política, pero no debe usarse en nuevas asignaciones.
- Un RoleAssignment no puede existir sin Membership válida y Role asignable.

## 7. Lifecycle

### Estados
- draft
- active
- deprecated
- archived

### Transiciones válidas
- draft → active
- active → deprecated
- deprecated → archived

### Transiciones inválidas
- archived → active
- archived → deprecated

### Reglas
- draft no es asignable
- active sí es asignable
- deprecated puede seguir siendo reconocido para asignaciones históricas existentes, según política de transición, pero no debe usarse en nuevas asignaciones.
- archived no debe ser asignable ni editable, y su uso operativo futuro debe depender de una política explícita de migración o sustitución.


## 8. Reglas críticas

- Roles deben tener scope explícito.
- Roles no deben ser ambiguos en capacidades.
- No se permite asignación directa a User.
- Cambios en roles deben ser auditados.
- Roles no sustituyen Grants.
- No confiar en nombres de roles para lógica.
- Evitar proliferación descontrolada de roles.
- Validar conflictos entre roles.
- Roles deben ser versionables o auditables.
- No se puede asignar un role a una membership con scope incompatible.
- Un role no puede usarse para simular pertenencia a un scope no cubierto por la membership.

## 9. Impacto en otros módulos

- Memberships habilita el contexto formal sobre el cual los roles pueden asignarse y operar.
- Users no recibe roles directamente ni mantiene capacidades canónicas.
- Auth autentica, pero no define capacidades operativas.
- Grants modifica o restringe capacidades efectivas derivadas de roles, sin reemplazar el catálogo base.
- Access Resolution consume roles asignados, memberships válidas y grants para resolver acceso efectivo.
- Audit debe registrar creación, cambio, deprecación, archivado y asignación/remoción de roles.
- Partners Web y otras superficies no deben inferir capacidades solo por nombre de rol; deben consumir resolución efectiva consistente.
- Platform Console puede administrar roles platform-scoped y, según política, supervisar tenant-scoped roles o sus asignaciones.

## 10. Contratos

### DTOs
- CreateRoleDto
- UpdateRoleDto
- AssignRoleToMembershipDto
- RemoveRoleFromMembershipDto
- DeprecateRoleDto
- ArchiveRoleDto
- GetRoleByIdParamsDto
- ListRolesQueryDto
- ListMembershipRolesQueryDto
- RoleResponseDto
- RoleSummaryResponseDto

### Acciones
- create role
- update role
- get role by id
- list roles
- list roles assigned to membership
- assign role to membership
- remove role from membership
- deprecate role
- archive role

### Acciones administrativas
- archive role
- migrate role definitions
- bulk assign/remove roles

### Errores
- role_not_found
- invalid_role_scope
- role_already_assigned
- role_not_assignable
- role_scope_mismatch
- role_conflict
- role_deprecated
- role_archived
- membership_not_found
- invalid_role_assignment

### Scopes

- platform admin para crear y administrar platform-scoped roles
- tenant admin, según política, para administrar roles tenant-scoped dentro de su tenant
- administradores autorizados para asignar/remover roles dentro de memberships compatibles por scope

### Eventos
- role_created
- role_updated
- role_deprecated
- role_archived
- role_assigned_to_membership
- role_removed_from_membership

## 11. Diseño de validación

### Familias de prueba
- reglas de negocio
- servicio
- integración con provider
- contrato/endpoint
- E2E mínima

### Escenarios principales
- crear role válido platform-scoped
- crear role válido tenant-scoped
- asignar role compatible a membership válida
- remover role asignado
- deprecate role activo
- archive role deprecated

### Escenarios inválidos
- asignar role archived
- asignar role deprecated a nueva membership
- asignar role con scope incompatible
- duplicar role assignment
- remover role no asignado

### Casos borde
- múltiples roles coexistiendo en una misma membership
- cambio de definición de role en uso
- transición a deprecated con asignaciones existentes
- role assignment concurrente duplicado

### Seguridad
- no permitir asignación fuera del scope autorizado
- no confiar en nombres de role para autorización
- no exponer catálogo de roles de otros scopes sin autorización

### Concurrencia
- creación concurrente de roles equivalentes
- doble asignación simultánea del mismo role a una membership
- actualización concurrente de definición de role y resolución de permisos efectivos

### Criterios de aceptación
- separación clara entre Role, Membership y Grant
- scope explícito y compatible
- asignación contextualizada
- cambios auditables
- contratos claros
- pruebas mínimas automatizadas definidas

## 12. COnfiabilidad y hardening

- Idempotencia: asignación y remoción de roles deben tolerar reintentos seguros.
- Auditoría: creación, actualización, deprecación, archivado y cambios de asignación deben quedar auditados.
- Observabilidad: métricas de roles creados, asignados, removidos, deprecados, archivados y conflictos de asignación.
- Rate limiting: principalmente sobre endpoints administrativos masivos o sensibles.
- Retry: solo en operaciones idempotentes o reconciliables.
- Concurrencia: unique constraints o locking para evitar RoleAssignment duplicados.
- Minimización de datos: DTOs y eventos no deben exponer más contexto del necesario.
- Retención: definir cuánto tiempo se conserva historial de definiciones y asignaciones.
- Invalidación: cambios relevantes en roles o asignaciones deben invalidar o refrescar permisos efectivos.

## 13. Riesgos

- mezclar catálogo de roles con catálogo de permisos dinámicos
- permitir tenant roles sin límites claros
- mantener roles deprecated vivos indefinidamente
- incapacidad de reconstruir qué capacidades tenía un usuario históricamente

## 14. Decisiones diferidas

- jerarquía de roles
- roles dinámicos
- inheritance

## 15. Definition of Done

- catálogo de roles definido con scope explícito
- compatibilidad entre roles y memberships documentada
- separación entre Role, RoleAssignment y Grant definida
- invariantes del submódulo documentados
- lifecycle del role cerrado
- política de deprecación y archivado definida
- impacto en otros módulos documentado
- DTOs, acciones, errores, scopes y eventos definidos
- estrategia de invalidación de permisos efectivos definida
- diseño de validación mínimo definido
- hardening mínimo definido
- riesgos principales identificados
- decisiones diferidas conscientemente registradas