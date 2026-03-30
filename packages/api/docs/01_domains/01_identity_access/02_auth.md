# AUTH

## 1. Propósito del submódulo

Auth gestiona la autenticación de usuarios, la emisión y control de sesiones, y los flujos de verificación o challenge necesarios para permitir acceso seguro a la plataforma.

Resuelve:
- login mediante proveedores internos o externos
- emisión, refresh, revocación y cierre de sesiones
- verificación de identidad previa o complementaria al acceso
- recuperación de acceso cuando aplique
- resolución del contexto autenticado actual

No resuelve:
- identidad canónica de la persona → Users
- pertenencia a tenant/store → Memberships
- roles operativos → Roles
- permisos específicos u overrides → Grants
- onboarding organizacional por invitación → Invitations

No define por sí mismo:
- el alcance operativo final del usuario dentro del negocio
- permisos efectivos sobre módulos
- contexto organizacional autorizado más allá de la autenticación base

## 2. Definición canónica

Auth representa el dominio de prueba de identidad y continuidad de acceso dentro de la plataforma.

Su rol es autenticar a una persona contra mecanismos internos o externos, mapear ese resultado hacia un userId interno canónico, emitir una sesión válida y mantener controlado su lifecycle hasta logout, expiración o revocación.

Otros módulos dependen conceptualmente de Auth para:
- saber si existe una sesión válida
- obtener el actor autenticado actual
- confiar en que la identidad externa fue resuelta hacia identidad interna canónica
- reaccionar a eventos de login, logout, revocación o verificación

Esto debe mantenerse desacoplado de la identidad canónica interna, porque tu regla transversal es no mezclar identidad externa con identidad interna del dominio .

## 3. Fronteras

### Pertenece a Auth
- autenticación con proveedor interno o externo
- vinculación de identidad externa hacia identidad interna
- emisión y refresh de sesiones
- revocación y cierre de sesiones
- challenges de verificación previos o complementarios al login
- recuperación de acceso o credenciales cuando aplique
- estado de sesión autenticada actual
- reglas de expiración, revocación y validez de sesión
- auditoría de eventos sensibles de autenticación
- tokens técnicos de acceso/refresh si forman parte de la arquitectura

### No pertenece a Auth
- perfil canónico del usuario → Users
- contacto maestro del usuario → Users
- memberships activas o pertenencia organizacional → Memberships
- selección/autorización fina de tenant/store → Memberships + Roles + Grants
- invitaciones de acceso → Invitations
- decisiones de fraude como dominio autónomo → Fraud Prevention & Risk Monitoring
- observabilidad transversal como infraestructura → Observability
- idempotencia transversal como infraestructura reusable → Idempotency

## 4. Decisiones estructurales

### 4.1 ¿Qué representa exactamente Auth dentro del dominio?

#### Decisión
Auth representa la capa de autenticación y control de sesiones del sistema, no la identidad canónica ni la autorización operativa.

#### Justificación
Necesitas separar:
- quién es la persona en el dominio → Users
- cómo demuestra su identidad → Auth
- dónde puede actuar → Memberships
- qué puede hacer → Roles / Grants

#### Impacto
Ningún proveedor externo se convierte en la identidad principal del sistema; Auth siempre resuelve hacia userId.

### 4.2 ¿Qué diferencia hay entre User, AuthIdentity, AuthSession y Membership?

#### Decisión
- User = identidad canónica interna
- AuthIdentity = credencial o identidad externa/interna usada para autenticar
- AuthSession = continuidad temporal de acceso autenticado
- Membership = pertenencia formal a un scope operativo

#### Justificación
Evita mezclar prueba de identidad, permanencia de acceso y contexto organizacional.

#### Impacto
Una sesión válida no implica por sí sola que el usuario tenga acceso a cualquier tenant/store; eso se resuelve después vía memberships/roles/grants.

### 4.3 ¿Qué proveedores o mecanismos soportará el MVP?

#### Decisión
El MVP soportará:
- password-based auth interno, si aplica a tus superficies administrativas
- OTP / verification code, si aplica a actores shopper o phone-first
- proveedores externos federados, solo si ya forman parte real de la arquitectura
- refresh token/session renewal controlado

No se soportarán en MVP:
- passwordless avanzado multi-factor adaptable
- device trust sofisticado
- session federation compleja entre múltiples superficies
- step-up auth dinámico por scoring de riesgo, salvo reglas mínimas

#### Justificación
Cerrar el MVP evita sobre diseñar Auth.

#### Impacto
Los contratos y lifecycle deben cubrir password reset, verification challenge, provider link y sesiones revocables, pero no un motor MFA complejo todavía.

### 4.4 ¿Cómo se resuelve la identidad interna vs identidad externa?

#### Decisión
Toda autenticación exitosa debe resolver explícitamente una AuthIdentity vinculada a un userId interno.
Ningún providerSubject, firebaseUid u otro ID externo será tratado como identidad canónica del dominio .

#### Justificación
Evita acoplamiento con terceros, duplicidad y bloqueo futuro de migración.

#### Impacto
Todo login exitoso requiere:
1. validar autenticación en el mecanismo/proveedor
2. resolver o vincular AuthIdentity
3. obtener userId
4. emitir sesión autenticada

### 4.5 ¿Qué constituye una sesión válida?

#### Decisión
Una sesión válida debe cumplir simultáneamente:
- estar emitida correctamente por Auth
- no estar expirada
- no estar revocada
- estar asociada a un userId válido
- no depender de un challenge pendiente
- no estar invalidada por cambio crítico de credencial o política de seguridad

#### Justificación
Una sesión no puede depender solo de “token no vencido”; debe respetar su estado de negocio y seguridad.

#### Impacto
refresh, logout, logout all, reset de credenciales y revocación deben poder invalidar sesiones previas.

### 4.6 ¿Cómo se maneja refresh session?

#### Decisión
El sistema tendrá refresh session explícito con política de rotación o renovación controlada.
Refresh no creará una nueva identidad; solo renueva continuidad de acceso sobre una sesión o familia de sesión válida.

#### Justificación
Refresh debe ser controlado para evitar abuso y reuso indebido.

#### Impacto
Se necesita distinguir:
- access token / session token
- refresh token / refresh credential
- family/session lineage si implementas rotación

### 4.7 ¿Cómo se modela verification/challenge?

#### Decisión
Verification challenge es una entidad o agregado separado de la sesión.
Se usa para:
- verificar email o phone
- confirmar una acción sensible
- recuperar acceso
- completar login cuando el flujo lo requiera
No se modelará como simple flag dentro de User o Session.

#### Justificación
Tiene lifecycle propio: emitido, validado, expirado, consumido, fallido.

#### Impacto
Debe existir AuthVerificationChallenge o entidad equivalente.

### 4.8 ¿Cómo se resuelve el contexto autenticado actual?

#### Decisión
Auth solo entrega:
- identidad autenticada
- estado de sesión
- auth identities vinculadas
- contexto base de autenticación
El contexto operativo final de tenant/store/membership activa no pertenece a Auth.

#### Justificación
Evita que Auth absorba pertenencias, permisos y selección operativa.

#### Impacto
get current auth context no debe convertirse en “perfil operativo total”; puede incluir referencias mínimas, no ownership de memberships.

### 4.9 ¿Qué pasa con password reset?

#### Decisión
Si existe password auth en el MVP, password reset sí forma parte de Auth.
Se modela como flujo explícito con challenge temporal y consumo único.

#### Justificación
Reset es parte del control de acceso, no del perfil de usuario.

#### Impacto
Debe invalidar sesiones previas según política.

### 4.10 ¿Qué pasa con link/unlink provider?

#### Decisión
Link y unlink de proveedor pertenecen a Auth, siempre que operen sobre AuthIdentity.
No deben mutar la identidad canónica User.

##### Justificación
Vincular proveedor es una operación de autenticación, no de identidad maestra.

#### Impacto
Debe haber validaciones para evitar dejar una cuenta sin mecanismo válido de acceso.

## 5. Modelo conceptual

### Entidad principal
- AuthSession

### Entidades auxiliares
- AuthIdentity
- AuthVerificationChallenge
- RefreshToken o SessionRefreshGrant
- PasswordResetRequest o challenge reutilizable si unificas modelado
- AuthAuditEvent
- AuthRevocationRecord
- AuthProviderLink

### Ownership
- Auth es owner de sesiones, auth identities, verification challenges y revocaciones
- Users es owner de la identidad canónica
- Memberships es owner del contexto organizacional

### Source of truth
- verdad canónica de identidad personal → Users
- verdad canónica de autenticación y sesiones → Auth

### Relaciones
- AuthIdentity referencia a userId
- AuthSession referencia a userId
- AuthSession puede originarse desde una AuthIdentity
- VerificationChallenge puede vincularse a userId, AuthIdentity o flujo temporal según caso
- Auth emite eventos hacia Audit, Notifications, Risk Monitoring u otros consumidores

## 6. Invariantes del submódulo

- Ninguna identidad externa puede operar como identidad canónica del dominio.
- Toda autenticación exitosa debe resolver un userId interno antes de emitir sesión.
- Una AuthSession válida siempre pertenece a un único userId.
- Una sesión revocada no puede volver a estado activo.
- Una sesión expirada no puede volver a estado activo.
- Un verification challenge consumido no puede reutilizarse.
- Un verification challenge expirado no puede validarse exitosamente.
- Un password reset consumado invalida o reevalúa sesiones previas según política.
- Un unlink provider no puede dejar al usuario sin mecanismo válido de autenticación, salvo proceso administrativo explícito.
- Auth no define memberships, roles ni grants.
- Un login exitoso no implica autorización operativa automática.
- Toda operación sensible de autenticación debe ser auditable.
- Los errores de autenticación no deben exponer información innecesaria de existencia de cuenta o detalle interno, salvo donde negocio lo permita.

## 7. Lifecycle

### Estados
#### AuthSession
- issued
- active
- refreshed
- revoked
- expired
- logged_out

#### AuthVerificationChallenge
- issued
- validated
- failed
- expired
- consumed

#### Password reset flow
- requested
- issued
- consumed
- expired

### Transiciones válidas
#### Session
- issued -> active
- active -> refreshed
- active -> revoked
- active -> expired
- active -> logged_out
- refreshed -> revoked
- refreshed -> expired
- refreshed -> logged_out

#### Verification challenge
- issued -> validated
- issued -> failed
- issued -> expired
- validated -> consumed

#### Password reset
- requested -> issued
- issued -> consumed
- issued -> expired

### Transiciones inválidas
- revoked -> active
- expired -> active
- logged_out -> active
- consumed -> issued
- expired challenge -> validated
- consumed reset -> consumed nuevamente

### Reglas
- refresh no revive sesiones revocadas o expiradas
- logout invalida la continuidad de acceso de esa sesión
- logout all revoca todas las sesiones activas del usuario
- reset de credencial debe afectar sesiones previas según política cerrada
- verification challenge y session no comparten lifecycle
- provider link/unlink no forma parte del lifecycle principal de sesión

## 8. Reglas críticas

- AuthIdentity(provider, providerSubject) debe ser único.
- No se debe emitir sesión sin resolver userId.
- Toda sesión debe tener expiración explícita.
- Toda revocación debe quedar trazable.
- Todo challenge debe tener TTL explícito.
- Todo challenge debe tener límite de intentos si aplica.
- Reset password y verify code requieren consumo único.
- Auth debe minimizar enumeración de cuentas en errores públicos.
- El frontend no debe asumir validez de sesión sin validación backend.
- Scopes operativos no se infieren desde claims externos sin mediación de memberships/roles/grants.
- Toda acción crítica debe considerar idempotencia, auditoría, autorización y estado previo válido, como ya definiste para el mapa general .

## 9. Impacto en otros módulos

- Users depende de Auth para vincular credenciales o identidades externas sin absorberlas.
- Memberships consume el resultado autenticado, pero Auth no decide pertenencias.
- Roles y Grants no deben vivir en sesión como verdad canónica; solo pueden proyectarse mínimamente.
- Invitations puede requerir autenticación o challenge para aceptar acceso, pero no redefine la sesión.
- Audit debe registrar login, logout, refresh, reset, verify, link/unlink provider y revocaciones.
- Notifications puede enviar códigos o mensajes de verificación, pero no modela el challenge.
- Fraud Prevention & Risk Monitoring puede consumir señales de intentos fallidos, abuso o anomalías, sin apropiarse del ownership de sesión.
- Platform Console puede tener capacidades reforzadas para revocar sesiones o unlink providers.
- Partners Web / otras superficies no deben resolver seguridad crítica solo en frontend; la validez de sesión y revocación debe ser backend-driven, consistente con tus lineamientos de seguridad y resiliencia .

## 10. Contratos

### DTOs
- LoginDto
- LogoutDto
- LogoutAllSessionsDto
- RefreshSessionDto
- RequestVerificationCodeDto
- VerifyCodeDto
- ResendCodeDto
- RequestPasswordResetDto
- ConfirmPasswordResetDto
- LinkIdentityDto
- UnlinkIdentityDto
- GetCurrentAuthContextQueryDto
- VerifyChallengeDto
- AuthSessionResponseDto
- CurrentAuthContextResponseDto
- AuthIdentityResponseDto

### Acciones
- login
- refresh session
- logout
- logout all sessions
- request verification code
- resend verification code
- verify code
- request password reset
- confirm password reset
- get current auth context
- link auth provider
- unlink auth provider

### Acciones administrativas diferidas o restringidas
- revoke session by admin
- revoke all sessions by admin
- force unlink provider
- force reset auth method
- inspect auth audit trail

### Errores
- invalid_credentials
- auth_verification_required
- auth_verification_failed
- auth_session_expired
- auth_session_revoked
- auth_refresh_denied
- auth_provider_not_linked
- auth_provider_already_linked
- auth_provider_unlink_denied
- auth_password_reset_requested
- auth_password_reset_failed
- auth_password_reset_completed
- too_many_attempts
- challenge_expired
- challenge_already_consumed
- user_not_authenticable
- forbidden_auth_scope

### Scopes
- actor/self
- platform admin para revocaciones administrativas
- flows públicos controlados para login, verify, reset
- sin scope tenant/store como ownership del submódulo, salvo consumo contextual posterior

### Eventos
- auth_login_succeeded
- auth_login_failed
- auth_session_issued
- auth_session_refreshed
- auth_session_revoked
- auth_logout_completed
- auth_verification_requested
- auth_verification_succeeded
- auth_verification_failed
- auth_password_reset_requested
- auth_password_reset_completed
- auth_provider_linked
- auth_provider_unlinked
Esto sigue tu regla de que los eventos deben ser semánticos y no ambiguos .

## 11. Diseño de validación

### Familias de prueba
- reglas de negocio
- servicio
- integración con provider
- contrato/endpoint
- E2E mínima

### Escenarios principales
- login válido con emisión de sesión
- refresh válido
- logout de sesión actual
- logout all sessions
- verify code exitoso
- password reset exitoso
- link provider exitoso
- unlink provider permitido
- get current auth context con sesión válida

### Escenarios inválidos
- credenciales incorrectas
- challenge expirado
- challenge consumido
- refresh sobre sesión revocada
- refresh sobre sesión expirada
- unlink de último método válido
- provider ya vinculado a otro usuario
- login con user desactivado o no autenticable
- exceso de intentos de verify/reset/login

### Casos borde
- doble submit en login
- doble consumo de código
- refresh concurrente
- reset consumado mientras hay otras sesiones activas
- logout simultáneo desde varios dispositivos
- timeout del proveedor externo durante login o verify

### Seguridad
- no enumerar cuentas innecesariamente
- masking de datos sensibles
- rate limit en login/reset/verify/resend
- bloqueo temporal o cooldown donde aplique
- validación backend de cada sesión
- protección frente a replay de challenge o refresh

### Concurrencia
- refresh token rotation o compare-and-set
- invalidación consistente de sesiones
- consumo único de challenge
- serialización o versionado en operaciones sensibles

### Criterios de aceptación
- identidad externa siempre resuelta a userId
- lifecycle de sesión y challenge documentado y consistente
- errores clasificados
- acciones críticas auditadas
- idempotencia/retry definidos en acciones sensibles
- contratos claros y semánticos
- pruebas mínimas automatizadas definidas

## 12. Confiabilidad y hardening

- Idempotencia: login sensible, verify, reset confirm, link/unlink y revocaciones administrativas deben tolerar reintentos seguros cuando corresponda.
- Auditoría: login, logout, refresh, verify, reset, link/unlink y revocación deben quedar auditados.
- Observabilidad: métricas de login success/failure, refresh success/failure, code requested/validated/expired, reset success/failure, provider timeouts, session revocations.
- Rate limiting: obligatorio en login, verify, OTP, resend, reset.
- Retry: permitido de forma diferenciada para integraciones externas; no debe duplicar sesiones o consumos de challenge.
- Aislamiento de proveedor externo: timeouts, fallback y manejo explícito cuando el proveedor falla, alineado con tus lineamientos transversales de resiliencia .
- Concurrencia: refresh token rotation, compare-and-set o invalidación de familia de sesión.
- Minimización de PII: logs, DTOs y eventos no deben propagar códigos, passwords ni datos sensibles innecesarios .
- Retención: definir cuánto tiempo se conservan sesiones cerradas, intentos fallidos, audit trails y challenges expirados.
- Reconciliación: si un login o provider callback queda en estado incierto, debe existir verificación/reparación operativa, consistente con tu regla transversal para procesos críticos .

## 13. Riesgos

### Riesgos de diseño
- mezclar identidad externa con identidad interna
- convertir sesión en contenedor de roles, memberships o permisos canónicos
- modelar verification/reset como flags sueltos en lugar de lifecycle explícito
- acoplar demasiado Auth al proveedor externo
- tratar login y autorización como la misma cosa

### Riesgos de implementación
- refresh inseguro o reusable
- sesiones que no se revocan realmente
- challenge reutilizable por bug
- unlink provider dejando cuenta inaccesible
- errores públicos que filtran existencia de cuenta
- frontend resolviendo decisiones que deben ser backend

### Riesgos operativos
- abuso de resend/reset/login
- timeouts del proveedor externo
- sesiones persistentes tras incidentes críticos
- auditoría insuficiente en acciones sensibles
- cascadas de fallo por dependencia fuerte del proveedor
- retries sin idempotencia real

## 14. Decisiones diferidas conscientemente

- MFA adaptable avanzado
- device trust / trusted device model
- scoring dinámico de riesgo para step-up authentication
- SSO federado complejo entre múltiples superficies
- administración avanzada de sesiones por dispositivo
- passkeys o WebAuthn
- unlink forzado con workflow especial de recuperación
- challenge unificado multi-propósito si luego decides converger verify/reset/step-up

## 15. Definition of Done

- Auth definido como submódulo de autenticación, sesiones y verificación, separado de Users/Memberships
- identidad externa vs interna resuelta explícitamente
- entidades principales y auxiliares definidas
- invariantes documentados
- lifecycle de sesión, challenge y reset cerrado
- reglas críticas de emisión, refresh, revocación y verify definidas
- impacto en otros módulos documentado
- DTOs, acciones, errores, scopes y eventos definidos
- diseño de validación mínimo definido
- hardening mínimo obligatorio definido
- riesgos principales identificados
- decisiones diferidas conscientemente registradas