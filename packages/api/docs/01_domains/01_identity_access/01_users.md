# USERS

## 1. Propósito del submódulo

Users representa la identidad global canónica de una persona dentro de la plataforma, independiente de su pertenencia a tenants, stores, roles o sesiones activas. No resuelve autenticación, autorización ni contexto operativo.

## 2. Definición canónica

Un User es la representación interna y persistente de una persona en el dominio.

Es la identidad principal sobre la que se apoyan autenticación, memberships, roles, grants, invitaciones, auditoría y trazabilidad transversal.

## 3. Fronteras

### Pertenece a Users
- identidad global interna
- datos base del usuario
- estado general del usuario
- datos de contacto principales canónicos (primaryEmail, primaryPhone) en el MVP
- políticas de desactivación, anonimización y merge

### No pertenece a Users
- credenciales y sesiones → Auth
- pertenencia a tenant/store → Memberships
- acceso base por rol → Roles
- excepciones de permisos → Grants
- onboarding por invitación → Invitations

## 4. Decisiones estructurales

### 4.1 ¿Qué representa exactamente un User dentro del dominio?

#### Decisión:
User representa la identidad interna canónica de una persona en la plataforma.

#### Justificación:
Necesitas una entidad estable e independiente de proveedores externos, memberships o sesiones.

#### Impacto:
Todos los demás submódulos se referencian a userId, no a IDs de terceros.

### 4.2 ¿Qué diferencia hay entre User, AuthIdentity y Membership?

#### Decisión:
- User = identidad global interna
- AuthIdentity = credencial o identidad externa/interna usada para autenticar
- Membership = relación formal entre un user y un scope operativo

#### Justificación:
Evita mezclar identidad, autenticación y pertenencia.

#### Impacto:
No se deben incrustar memberships ni credenciales dentro de User como verdad canónica.

### 4.3 ¿Qué atributos son canónicos y cuáles solo referenciales?

#### Decisión:
Canónicos en User:
- id
- firstName
- lastName
- displayName
- avatarUrl
- primaryEmail
- primaryPhone
- emailVerified
- phoneVerified
- status
- createdAt
- updatedAt
- deactivatedAt
- anonymizedAt
- version

Referenciales o no canónicos en User:
- avatar externo proveniente de provider
- claims de proveedor
- metadata de login/social provider
- señales analíticas
- preferencias avanzadas
- atributos de marketing
- memberships
- roles
- grants
- sessions

#### Justificación
Users debe ser el source of truth de identidad global, no el contenedor de todo. Tus riesgos base son claros sobre no convertir entidades en monstruos y no mezclar dato maestro con derivado .

#### Impacto
User queda suficientemente rico para operar identidad y contacto base, pero no absorbe perfil expandido, preferencias, analytics ni contexto operativo.

### 4.4 ¿Cómo se evita crear el mismo usuario dos veces?

#### Decisión
La política de unicidad del MVP será:
- primaryEmail único cuando no sea null
- primaryPhone único cuando no sea null
- AuthIdentity(provider, providerSubject) único en Auth
- creación y vinculación sujetas a proceso de deduplicación previo
- si existe colisión entre email/phone y auth identity, la operación entra en flujo de linking o revisión controlada, no en creación automática de un segundo User

#### Regla operativa
No se crea un nuevo User si:
- el email ya pertenece a otro User
- el phone ya pertenece a otro User
- el provider identity ya está vinculado a otro User

#### Justificación
- Es la política más robusta para un ecosistema multi-surface.
- Si usas solo email, fallas con phone-first.
- Si usas solo phone, fallas con email/password, B2B e invitaciones.
- Si no usas ambos, te complicas el merge futuro innecesariamente.

#### Impacto
- Auth debe hacer lookup previo por auth identity y fallback por contactos verificados.
- Invitations no debe asumir que “invitar = crear nuevo user”.
- Memberships debe enlazarse a userId, nunca a email/phone como verdad relacional.

#### Comportamiento en el MVP
- Una colisión por `primaryEmail` o `primaryPhone` durante la creación explícita de un User produce rechazo inmediato de la operación.
- No se realiza linking automático desde el submódulo Users.
- Los procesos de vinculación pertenecen a Auth o a flujos controlados de onboarding.

### 4.5 ¿Qué campos se podrán editar y bajo qué condiciones?

#### Clasificación de atributos

**Editables sin verificación adicional**
- displayName
- firstName
- lastName
- avatarUrl
- atributos livianos fuera del núcleo canónico

**Editables con verificación obligatoria**
- primaryEmail
- primaryPhone

**Editables solo por actores privilegiados o procesos internos**
- status
- emailVerified / phoneVerified
- anonymizedAt
- deactivatedAt

#### Regla de cambio de contacto primario

Un cambio de `primaryEmail` o `primaryPhone` sigue un flujo controlado en dos fases:

1. solicitud de cambio del nuevo contacto
2. verificación exitosa del nuevo contacto
3. promoción del contacto verificado a contacto primario

Hasta que la verificación no sea exitosa, el contacto canónico vigente no se modifica.

#### Restricciones de mutación de perfil

- Un comando `update profile` debe contener al menos un campo efectivo a modificar.
- No se permiten comandos vacíos.
- No se generan cambios de estado, auditoría ni eventos cuando no existen modificaciones reales.

#### Política de solicitudes de cambio de contacto

Para cada usuario y tipo de contacto (`primaryEmail` o `primaryPhone`):

- Solo puede existir una solicitud activa relevante a la vez.
- Una nueva solicitud debe:
  - reutilizar la existente si representa el mismo objetivo, o
  - cancelar o reemplazar la anterior de forma controlada.

Esto evita:
- múltiples flujos de verificación simultáneos
- estados inconsistentes en contacto canónico
- duplicidad de tokens o procesos de validación

#### Justificación

- Protege contra secuestro de cuenta y cambios no autorizados.
- Mantiene consistencia entre Users, Auth e Invitations.
- Preserva trazabilidad y auditabilidad de cambios sensibles.
- Evita estados intermedios ambiguos en datos canónicos.

#### Impacto

Este conjunto de reglas impacta directamente en:
- Users (estado canónico y reglas de mutación)
- Auth (identificación, recuperación y login)
- Invitations (resolución de identidad)
- Audit (trazabilidad de cambios sensibles)
- Notifications / Verification flows (gestión de confirmaciones)

### 4.6 ¿Qué política habrá para desactivación, anonimización o merge?

#### Decisión
Hard delete
No permitido para Users con relaciones históricas, transaccionales, de auditoría o membresía.

Deactivation
- revoca capacidad operativa según reglas de Auth/Memberships
- preserva integridad histórica
- no borra relaciones

Anonymization
- reemplaza o tokeniza PII directa
- preserva claves técnicas, referencias históricas y auditabilidad compatible con política legal
- solo permitida cuando la política de retención lo soporte

Merge
- No entra al MVP operativo de autoservicio
- Sí entra como capacidad administrativa explícitamente modelada
- se representa mediante UserMergeRecord
- solo disponible desde Platform Console o workflow interno controlado
- siempre deja auditoría y redirección lógica de referencias futuras

#### Justificación
- Diferir merge “conceptualmente no modelado” es error.
- Diferir merge “como operación normal de negocio”, pero dejarlo previsto, es lo correcto.

#### Impacto
- Audit debe registrar merge/deactivate/anonymize.
- Auth debe invalidar o revisar vinculaciones tras merge.
- Memberships debe soportar reasignación controlada si un merge ocurre.
- No habrá endpoint público de merge en MVP.

### 4.7 ¿Habrá estado draft?

#### Decisión 
No. User no tendrá estado draft.

#### Justificación
El estado draft complica el dominio sin aportar suficiente valor en Users.
La pre-identidad incompleta pertenece mejor a:
- Invitation
- Auth onboarding state
- procesos temporales de registro
User debe nacer cuando ya existe una identidad interna materializada.

#### Impacto
Simplifica lifecycle y evita estados débiles en la entidad canónica.

### 4.8 ¿Dónde viven primaryEmail y primaryPhone?

#### Decisión final
En el MVP vivirán en User como campos canónicos, y opcionalmente se permitirá una entidad auxiliar UserContactMethod para extensibilidad futura.

#### Política exacta
- User.primaryEmail y User.primaryPhone son la referencia canónica operativa
- UserContactMethod queda reservado para: 
    - múltiples emails/teléfonos
    - historial de contacto
    - secondary contacts
    - canales alternativos
    - estado granular de verificación por contacto

#### Justificación
Para MVP, poner primaryEmail/primaryPhone fuera de User mete demasiada complejidad pronto.
Pero no debes cerrar la puerta a multi-contact y historial.

#### Impacto
- el dominio sigue simple
- no rompes futura expansión
- Invitations/Auth pueden leer el contacto canónico sin joins innecesarios

## 5. Modelo conceptual

### Entidad principal
- User

### Entidades auxiliares potenciales
- UserProfile
- UserContactMethod
- UserStatusHistory
- UserMergeRecord
- UserAuditEvent

### Ownership
- User pertenece al dominio Identity & Access
- el source of truth de identidad global vive aquí
- ningún otro submódulo debe redefinir identidad base

## 6. Invariantes del submódulo

- Un User representa una identidad interna canónica, no una credencial ni una membresía.
- Un User puede existir sin AuthIdentity.
- Un User puede existir sin Memberships.
- Un User no contiene permisos, grants ni roles directamente.
- Un User no depende de un tenant o store para existir.
- Un User no se elimina físicamente si tiene relaciones históricas, auditables o transaccionales.
- Un User anonymized no puede volver a estado active.
- Un User deactivated no pierde su identidad histórica ni sus referencias transversales.
- primaryEmail y primaryPhone, cuando existen, no pueden estar asignados simultáneamente a más de un User no absorbido por merge.
- Ningún ID externo de proveedor puede ser tratado como identidad canónica del dominio.
- Todo cambio sensible de contacto primario debe pasar por verificación antes de consolidarse.
- Todo cambio irreversible de lifecycle debe dejar trazabilidad auditable.
- User es source of truth de identidad global; otros módulos solo lo referencian o proyectan.

## 7. Lifecycle

### Estados
- active
- suspended
- deactivated
- anonymized

### Transiciones principales
- active -> suspended
- suspended -> active
- active -> deactivated
- suspended -> deactivated
- deactivated -> anonymized

### Transiciones inválidas
- anonymized -> active
- anonymized -> suspended
- anonymized -> deactivated
- deactivated -> active
- cualquier transición desde entidad absorbida por merge lógico

### Reglas
- anonymized no retorna a active
- deactivated no implica borrado físico
- suspended afecta acceso, pero preserva trazabilidad
- un User absorbido por merge no puede seguir operando como identidad principal
- merge no forma parte del lifecycle principal; se modela como capacidad administrativa complementaria.

## 8. Reglas críticas
- primaryEmail debe ser único cuando exista.
- primaryPhone debe ser único cuando exista.
- Identidad interna y AuthIdentity deben permanecer separadas conceptualmente.
- No se permite hard delete sobre Users con relaciones históricas, auditables o transaccionales.
- Todo cambio de contacto primario requiere verificación antes de consolidación.
- Ningún módulo externo redefine identidad canónica base.
- Desactivación y suspensión no deben romper integridad referencial ni trazabilidad histórica.
- Anonimización debe preservar integridad relacional, auditabilidad permitida y cumplimiento de retención.
- Todo cambio sensible de estado debe validar transición previa y autorización.
- Todo cambio sensible debe ser auditable.
- Las respuestas públicas deben minimizar exposición de PII según superficie y scope.
- Un comando de actualización de perfil (`update profile`) debe contener al menos un campo efectivo a modificar.
- No se deben aceptar updates vacíos.
- No se deben generar auditoría, eventos ni incremento de versión para operaciones sin cambios efectivos.
- En filtros administrativos por fecha, `createdFrom` se interpreta desde el inicio del día y `createdTo` hasta el final del día cuando se recibe una fecha simple.

## 9. Impacto en otros módulos
- Auth depende de userId como identidad interna canónica y puede usar primaryEmail / primaryPhone como identificadores operativos de login o recuperación, pero nunca como reemplazo conceptual del User.
- AuthIdentity debe mapear explícitamente identidades externas al userId, evitando acoplar el dominio a IDs de terceros.
- Memberships depende de User como entidad base; no debe duplicar nombre, email o phone como verdad canónica salvo snapshots o campos operativos justificados.
- Roles y Grants se asignan sobre contexto y pertenencia; no viven dentro de User.
- Invitations puede iniciarse con email o phone, pero su aceptación debe resolver si enlaza a un User existente o materializa uno nuevo bajo reglas de unicidad.
- Audit debe registrar cambios sensibles de perfil, contacto, estado, anonimización y merge.
- Notifications / Communications pueden consumir datos de contacto, pero idealmente mediante vistas minimizadas o adapters, no leyendo indiscriminadamente toda la entidad User.
- Analytics / BI no deben convertir User en repositorio de señales derivadas; deben producir snapshots o señales externas al dato maestro.
- Platform Console requiere capacidades administrativas reforzadas para suspensión, desactivación, anonimización y merge.
- Partners Web no debería tener control total sobre lifecycle global de User salvo casos explícitamente autorizados por scope.
- Platform Console concentra las operaciones administrativas reforzadas sobre lifecycle global de User.
- Las superficies operativas de negocio no deben asumir control irrestricto sobre identidad global ni lifecycle canónico.

## 10. Contratos
### DTOs
- CreateUserDto (solo cuando exista creación explícita de User como comando de dominio o proceso administrativo/interno)
- UpdateUserProfileDto
- RequestPrimaryEmailChangeDto
- ConfirmPrimaryEmailChangeDto
- RequestPrimaryPhoneChangeDto
- ConfirmPrimaryPhoneChangeDto
- SuspendUserDto
- ReactivateUserDto
- DeactivateUserDto
- AnonymizeUserDto
- MergeUsersDto (solo administrativo / futuro cercano, no autoservicio)
- GetUserByIdParamsDto
- ListUsersQueryDto
- UserResponseDto
- UserSummaryResponseDto

### Acciones

#### Self-service
- get current profile
- update profile
- request primary email change
- confirm primary email change
- request primary phone change
- confirm primary phone change

#### Administrativas
- create user
- get user by id
- list users
- suspend user
- reactivate user
- deactivate user
- anonymize user

### Acciones administrativas diferidas o restringidas
- merge users 

### Política de autenticación en endpoints self-service

Los endpoints self-service del submódulo Users (por ejemplo `me`, `me/profile`,
`me/primary-email-change/*`, `me/primary-phone-change/*`) requieren autenticación
explícita a nivel de endpoint mediante guards declarados.

#### Regla operativa
- Todo endpoint `me/*` debe estar protegido explícitamente con `UserAuthenticatedGuard`.
- El acceso a `CurrentUser` no debe depender de supuestos implícitos.

#### Política en el MVP
- Los endpoints self-service utilizan `UserAuthenticatedGuard`.
- Los endpoints administrativos utilizan guards diferenciados según el nivel de privilegio requerido.

#### Justificación
- Reduce ambigüedad en el contrato HTTP.
- Evita exposición accidental de endpoints sin protección.
- Mejora auditabilidad y revisión de seguridad.

### Errores
- duplicate_primary_email
- duplicate_primary_phone
- new_primary_email_matches_current
- new_primary_phone_matches_current
- user_already_active
- user_already_suspended
- user_already_deactivated
- user_already_anonymized
- invalid_status_transition
- contact_verification_required
- user_concurrent_modification
- empty_profile_update
- user_not_found
- forbidden_user_access

### Scopes
- platform
- tenant/store solo para lectura o uso contextual, según tu política

### Eventos
- user_created
- user_profile_updated
- user_primary_email_change_requested
- user_primary_email_changed
- user_primary_phone_change_requested
- user_primary_phone_changed
- user_suspended
- user_reactivated
- user_deactivated
- user_anonymized
- user_merged

## 11. Diseño de validación
### Familias de prueba
- reglas de negocio
- servicio
- integración
- endpoint/contrato
- E2E mínima donde aplique

### Escenarios principales
- crear usuario válido
- actualizar perfil
- suspender usuario
- reactivar usuario
- anonimizar usuario permitido

### Escenarios inválidos
- crear usuario duplicado
- transición de estado no válida
- editar contacto primario sin verificación requerida
- consultar usuario inexistente

### Casos borde
- usuario ya desactivado
- usuario ya anonimizado
- colisión entre email y phone en creación o actualización

### Seguridad
- no exponer PII innecesaria
- no permitir acceso por scope incorrecto
- no permitir cambios sensibles sin autorización reforzada

### Concurrencia
- doble actualización simultánea
- doble intento de suspensión/reactivación
- actualización de contacto mientras otro proceso vincula auth identity

### Criterios de aceptación
- identidad canónica clara
- unicidad operativa protegida
- lifecycle consistente
- contratos claros
- trazabilidad suficiente
- pruebas mínimas automatizadas definidas

## 12. Confiabilidad y hardening
- Idempotencia: creación por provider linkage, request de cambio de contacto y acciones administrativas sensibles deben tolerar reintentos seguros.
- Auditoría: suspensión, reactivación, desactivación, anonimización, merge y cambio de contacto primario deben quedar auditados.
- Observabilidad: métricas de duplicados evitados, fallos de verificación, colisiones de contacto, cambios sensibles y errores por transición inválida.
- Rate limiting: endpoints de lookup sensible, cambio de contacto y confirmación deben tener límites.
- Retry: solo en integraciones de verificación o notificación; no en mutaciones de lifecycle sin idempotencia.
- Retención/anonimización: política explícita para PII, snapshots, logs y referencias históricas.
- Concurrencia:
  - Las mutaciones sensibles utilizan optimistic locking mediante `version`.
  - Si una actualización falla por conflicto de versión, la operación debe rechazarse.
  - No se deben asumir actualizaciones parciales en caso de colisión concurrente.
- PII minimization: DTOs, eventos y logs deben exponer solo lo mínimo necesario.
- Los conflictos de concurrencia deben resolverse mediante rechazo explícito de la operación.
- No se deben aplicar retries automáticos sobre mutaciones sensibles de lifecycle o identidad.

## 13. Riesgos
- convertir User en entidad monstruo
- mezclar memberships o roles dentro de User
- duplicar usuarios por múltiples providers
- no poder anonimizar sin romper integridad
- exponer PII de más

## 14. Decisiones diferidas conscientemente
- UserContactMethod como expansión futura para multi-contacto e historial
- MergeUsers como capacidad administrativa no expuesta en MVP público
- extensiones avanzadas de perfil fuera del núcleo canónico de User
- políticas regulatorias específicas de retención y anonimización por jurisdicción

## 15. Definition of Done
- identidad canónica de User definida y separada de Auth/Memberships
- source of truth y fronteras documentadas
- invariantes del submódulo documentados
- política de unicidad cerrada para email, phone y auth identities
- lifecycle cerrado con transiciones válidas e inválidas
- política de suspensión, desactivación y anonimización definida
- merge modelado conceptualmente aunque no expuesto como capacidad de autoservicio MVP
- DTOs de comando, consulta, acción y response definidos
- errores semánticos del submódulo definidos
- eventos principales definidos
- impacto en otros módulos documentado
- requisitos mínimos de auditoría, observabilidad, concurrencia y PII definidos
- pruebas mínimas de negocio, integración y seguridad especificadas
- endpoints self-service protegidos explícitamente mediante guard
- updates vacíos rechazados
- estrategia de concurrencia implementada mediante optimistic locking
- errores semánticos consistentes para conflictos de concurrencia