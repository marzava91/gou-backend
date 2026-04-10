# AUTH

## 1. Propósito del submódulo

Auth gestiona la autenticación de usuarios, la emisión y control de sesiones, y los flujos de verificación o challenge necesarios para permitir acceso seguro a la plataforma.

Resuelve:
- login mediante proveedores internos, brokers de autenticación o proveedores federados
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
- autenticación con proveedores internos, brokers de autenticación o proveedores federados
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
Toda autenticación exitosa debe resolver explícitamente una AuthIdentity vinculada a un userId interno canónico.
Ningún providerSubject, firebaseUid u otro identificador externo será tratado como identidad canónica del dominio.
En el MVP respaldado por Firebase:
- User.id sigue siendo la identidad canónica interna del sistema;
- Firebase UID se almacena como AuthIdentity.providerSubject;
- Firebase actúa como broker de autenticación, no como owner de la identidad canónica.

#### Justificación
Evita acoplamiento con terceros, duplicidad de usuarios y bloqueo futuro de migración.
Separar identidad interna de sujeto externo permite:
- mantener a Users como source of truth de identidad canónica;
- usar Firebase como autenticador principal sin convertirlo en identidad maestra del dominio;
- soportar linking, unlinking y auto-linking sin colapsar identidad externa e identidad interna.

#### Impacto
Todo login exitoso requiere:
1. validar autenticación en el mecanismo o broker correspondiente;
2. obtener un providerSubject externo verificable;
3. resolver una AuthIdentity existente por provider + providerSubject;
4. si no existe, evaluar auto-linking controlado usando señales verificadas;
5. obtener un único userId interno válido;
6. emitir sesión autenticada.
La resolución ocurre primero por AuthIdentity existente y, en ausencia de esta, mediante auto-linking controlado si existen señales verificadas suficientes para resolver un único userId candidato.
providerSubject puede provenir de infraestructura externa, pero nunca reemplaza al userId canónico del dominio.

### 4.5 ¿Qué constituye una sesión válida?

#### Decisión
Una sesión válida debe cumplir simultáneamente:
- haber sido emitida correctamente por Auth
- no estar expirada (EXPIRED)
- no estar revocada (REVOKED)
- no haber sido cerrada voluntariamente (LOGGED_OUT)
- estar asociada a un userId válido y autenticable
- no depender de un challenge pendiente
- no haber sido invalidada por cambio crítico de credencial o política de seguridad
Adicionalmente, la validez de una sesión está determinada por su estado de lifecycle.

#### Estados de sesión
- ISSUED: sesión creada pero aún no utilizada
- ACTIVE: sesión en uso válida
- REFRESHED: sesión renovada recientemente
- LOGGED_OUT: sesión cerrada voluntariamente por el usuario
- REVOKED: sesión invalidada por el sistema (seguridad, reset, acciones administrativas)
- EXPIRED: sesión expirada por tiempo

#### Reglas clave
- Una sesión válida solo puede estar en estado:
  - ACTIVE
  - REFRESHED

- Una sesión deja de ser válida cuando pasa a cualquiera de los siguientes estados:
  - LOGGED_OUT
  - REVOKED
  - EXPIRED

- LOGGED_OUT representa una acción voluntaria del usuario

- REVOKED representa una invalidación forzada por el sistema, incluyendo:
  - password reset
  - políticas de seguridad
  - acciones administrativas
  - eventos de riesgo

#### Justificación
Una sesión no puede depender únicamente de la expiración de tokens; debe respetar su estado de negocio, seguridad y lifecycle explícito.
Separar LOGGED_OUT de REVOKED permite:
- trazabilidad precisa de eventos
- auditoría diferenciada entre acciones del usuario y del sistema
- mejores decisiones de seguridad y análisis de comportamiento

#### Impacto
- refresh, logout, logout all, reset de credenciales y revocación deben actualizar explícitamente el estado de la sesión
- los tokens deben ser considerados inválidos si la sesión subyacente no es válida, independientemente de su expiración técnica
- los sistemas consumidores de Auth deben validar estado de sesión, no solo token

### 4.6 ¿Cómo se maneja refresh session?

#### Decisión
El sistema tendrá refresh session explícito con política de rotación o renovación controlada.
Refresh no creará una nueva identidad; solo renueva continuidad de acceso sobre una sesión o familia de sesión válida.
Refresh no puede operar sobre sesiones en estado REVOKED, EXPIRED o LOGGED_OUT.

#### Justificación
Refresh debe ser controlado para evitar abuso y reuso indebido.

#### Impacto
Se necesita distinguir:
- access token / session token
- refresh token / refresh credential
- family/session lineage si implementas rotación

### 4.7 ¿Cómo se modela verification/challenge?

#### Decisión
Verification challenge se modela como una entidad o agregado separado de la sesión autenticada.
Se utiliza para flujos que requieren validación temporal, prueba adicional de control o confirmación de identidad, incluyendo:
- verificación de email
- verificación de phone
- recuperación de acceso o password reset
- login mediante código u OTP, cuando aplique
- step-up authentication limitado para acciones sensibles o flujos reforzados del MVP
No se modelará como simple flag dentro de User o AuthSession.

#### Purposes soportados en MVP
Los purposes iniciales del sistema son:
- VERIFY_EMAIL
- VERIFY_PHONE
- PASSWORD_RESET
- LOGIN
- STEP_UP

#### Lifecycle
AuthVerificationChallenge tiene lifecycle propio y explícito:
- ISSUED: challenge emitido y vigente
- VALIDATED: challenge validado correctamente
- FAILED: challenge fallido por intento inválido o regla de seguridad
- EXPIRED: challenge vencido por tiempo
- CONSUMED: challenge ya utilizado y no reutilizable

#### Reglas clave
- Verification no depende de la existencia de una sesión activa
- Puede existir antes, durante o después del login, según el flujo
- Un challenge validado no implica automáticamente una sesión válida; la emisión de sesión sigue siendo responsabilidad de Auth
- Un challenge consumido no puede reutilizarse
- Un challenge expirado o fallido no debe permitir continuar el flujo asociado
- Verification y session son lifecycle distintos y no deben colapsarse en una sola entidad

#### Justificación
Verification challenge tiene un lifecycle distinto al de User y AuthSession, con reglas temporales, intentos, expiración, validación y consumo único.
Separarlo permite:
- modelar correctamente OTP, verify email/phone y password reset
- evitar mezclar prueba temporal de identidad con continuidad de acceso
- soportar endurecimiento futuro sin rediseñar User o Session
- mantener trazabilidad y reglas de seguridad explícitas

#### Impacto
- Debe existir AuthVerificationChallenge o entidad equivalente
- Los flujos de verify email, verify phone, password reset, login por código y step-up deben apoyarse en esta entidad
- Session y Verification deben validarse con reglas distintas
- El modelo queda preparado para endurecimiento futuro sin requerir MFA complejo desde el MVP

#### Nota de alcance MVP

En el MVP, STEP_UP no representa un motor completo de autenticación adaptativa o MFA avanzado, sino una capacidad limitada para reforzar validaciones en flujos sensibles cuando la superficie lo requiera.

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

#### Nota de implementación MVP
En esta fase, los endpoint contracts protegidos por AuthAuthenticatedGuard quedan soportados por un guard estructural que valida únicamente la presencia de un AuthenticatedAuthActor previamente resuelto en request.user.

La autenticación real del actor queda diferida a la capa de infraestructura (middleware / interceptor / auth gateway), responsable de:

- validar access token o credencial upstream;
- resolver el actor autenticado desde el token;
- poblar request.user con un AuthenticatedAuthActor confiable;
- opcionalmente verificar existencia y estado de sesión en persistencia.

Por tanto, el guard actual no constituye todavía validación criptográfica o stateful completa de autenticación, sino un enforcement transitorio del contrato de actor autenticado para endpoints protegidos del submódulo.

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

### 4.11 ¿Cómo se resuelve la vinculación automática (auto-linking)?

#### Decisión
Auth puede vincular automáticamente una identidad externa (AuthIdentity) a un userId existente únicamente cuando se dispone de señales verificadas provenientes del proveedor.

#### Reglas

El auto-linking solo ocurre si:
- la señal está explícitamente verificada por el proveedor (emailVerified o phoneVerified)
- la señal resuelve a un único userId candidato
- no existe conflicto entre múltiples usuarios candidatos

Prioridad de resolución:
1. email verificado
2. phone verificado

No se permite auto-link cuando:
- la señal no está verificada
- múltiples usuarios coinciden con la señal
- no existe ningún candidato válido

#### Justificación
Permite onboarding fluido en proveedores federados sin comprometer seguridad.

#### Impacto
- GOOGLE y APPLE pueden auto-linkear bajo condiciones controladas
- PASSWORD nunca auto-linkea
- evita duplicación de usuarios

#### Flujo operativo de resolución durante login

Durante login, Auth sigue esta secuencia:

1. autentica contra el provider correspondiente
2. intenta resolver una AuthIdentity existente por provider + providerSubject
3. si no existe identidad vinculada, evalúa auto-linking usando señales verificadas
4. si las señales verificadas resuelven un único userId candidato, crea AuthIdentity y la vincula
5. si no se puede resolver un único userId válido, el login falla
6. si se resuelve userId, Auth valida que el usuario sea autenticable antes de emitir sesión

### 4.12 ¿Qué tipos de proveedores existen?

#### Decisión
Se distinguen dos niveles de integración:
1. Broker de autenticación (infraestructura)
    - FIREBASE
    - Responsable de validar credenciales o tokens externos
    - Puede respaldar flujos de PASSWORD, PHONE_CODE, GOOGLE, APPLE o equivalentes
    - No representa identidad canónica del dominio
2. Métodos o providers del dominio
    - PASSWORD
    - EMAIL_CODE
    - PHONE_CODE
    - GOOGLE
    - APPLE
Estos representan la forma de acceso que el dominio reconoce y gobierna a nivel de reglas, linking, unlinking, auto-linking y capacidades funcionales.

#### Justificación
Separar broker de autenticación vs método del dominio evita acoplamiento indebido, preserva claridad semántica y permite cambiar infraestructura sin rediseñar identidad canónica ni contratos de negocio.

#### Impacto
- FIREBASE no define identidad canónica;
- User.id sigue siendo interno;
- providerSubject almacena el sujeto externo verificable;
- PASSWORD, PHONE_CODE, GOOGLE, APPLE y EMAIL_CODE siguen siendo los métodos que el dominio expone y gobierna;
- el sistema mantiene control total sobre resolución de userId, linking y emisión de sesión.

### 4.13 ¿Cuándo se invalidan sesiones?

#### Decisión
Las sesiones deben invalidarse en los siguientes casos:
- logout → LOGGED_OUT
- logout all iniciado por el usuario → LOGGED_OUT
- password reset → REVOKED
- unlink crítico → REVOKED (si aplica)
- política de seguridad → REVOKED
- expiración → EXPIRED

#### Impacto
- el sistema no depende solo de expiración de tokens
- garantiza consistencia de seguridad

### 4.14 ¿Qué capacidades soporta cada provider?

| Provider / Method | Login | Link | Unlink | Reset Password | Verify Token |
| ----------------- | ----- | ---- | ------ | -------------- | ------------ |
| PASSWORD          | ✔     | ✖    | ✖     | ✔             | ✖            |
| GOOGLE            | ✔     | ✔    | ✔     | ✖             | ✔            |
| APPLE             | ✔     | ✔    | ✔     | ✖             | ✔            |
| EMAIL_CODE        | ✔     | ✖    | ✖     | ✖             | ✖            |
| PHONE_CODE        | ✔     | ✖    | ✖     | ✖             | ✖            |

#### Capacidades del broker de autenticación

| Broker   | Authenticate | Verify External Token | Reset Password |
| -------- | ------------ | --------------------- | -------------- |
| FIREBASE | ✔            | ✔                    | ✔              |


#### Justificación
Evita lógica implícita en código y separa correctamente:
- lo que el dominio reconoce como método de autenticación;
- de la infraestructura que realmente valida credenciales o tokens.

#### Impacto
- los servicios del dominio no deben asumir que FIREBASE es un provider de negocio al mismo nivel que GOOGLE o PASSWORD;
- FIREBASE opera como broker técnico;
- las reglas funcionales siguen gobernadas por los métodos del dominio.

## 5. Modelo conceptual

#### Entidades principales
- AuthSession
- AuthIdentity
- AuthVerificationChallenge

#### Ownership
- Auth es owner de sesiones, auth identities y verification challenges
- Users es owner de la identidad canónica
- Memberships es owner del contexto organizacional

#### Source of truth
- verdad canónica de identidad personal → Users
- verdad canónica de autenticación, account linking, verification y sesiones → Auth

#### Relaciones
- AuthIdentity referencia a userId
- AuthSession referencia a userId
- AuthSession puede originarse desde una AuthIdentity
- AuthVerificationChallenge puede vincularse a userId, authIdentityId o a un flujo temporal según el caso
- Auth publica eventos de autenticación, linking, verification y lifecycle de sesión hacia consumidores externos

#### Nota de modelado
- refresh token no se modela como entidad conceptual separada en esta fase; forma parte de la estrategia de sesión y continuidad de acceso
- password reset se soporta mediante AuthVerificationChallenge con purpose específico, no como entidad separada
- provider link / unlink se modela como operación sobre AuthIdentity, no como entidad autónoma
- auditoría y revocación forman parte de capacidades y reglas del submódulo, sin requerir por ahora entidades conceptuales independientes
- AuthIdentity.provider representa el método o provider reconocido por el dominio
- AuthIdentity.providerSubject representa el sujeto externo verificable devuelto por el broker o provider
- en el MVP respaldado por Firebase, AuthIdentity.providerSubject será típicamente el Firebase UID
- ese providerSubject externo nunca reemplaza al User.id interno canónico del dominio.

### Entidades principales
- AuthSession
- AuthIdentity
- AuthVerificationChallenge

### Ownership
- Auth es owner de sesiones, auth identities y verification challenges
- Users es owner de la identidad canónica
- Memberships es owner del contexto organizacional

### Source of truth
- verdad canónica de identidad personal → Users
- verdad canónica de autenticación, account linking, verification y sesiones → Auth

### Relaciones
- AuthIdentity referencia a userId
- AuthSession referencia a userId
- AuthSession puede originarse desde una AuthIdentity
- AuthVerificationChallenge puede vincularse a userId, authIdentityId o a un flujo temporal según el caso
- Auth publica eventos de autenticación, linking, verification y lifecycle de sesión hacia consumidores externos

### Nota de modelado
- refresh token no se modela como entidad conceptual separada en esta fase; forma parte de la estrategia de sesión y continuidad de acceso
- password reset se soporta mediante AuthVerificationChallenge con purpose específico, no como entidad separada
- provider link / unlink se modela como operación sobre AuthIdentity, no como entidad autónoma
- audit y revocación forman parte de capacidades y reglas del submódulo, sin requerir por ahora entidades conceptuales independientes


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
- ISSUED
- ACTIVE
- REFRESHED
- REVOKED
- EXPIRED
- LOGGED_OUT

#### AuthVerificationChallenge
- ISSUED
- VALIDATED
- FAILED
- EXPIRED
- CONSUMED

#### Password reset flow
- REQUESTED
- ISSUED
- CONSUMED
- EXPIRED

### Transiciones válidas
#### Session
- ISSUED -> ACTIVE
- ACTIVE -> REFRESHED
- ACTIVE -> REVOKED
- ACTIVE -> EXPIRED
- ACTIVE -> LOGGED_OUT
- REFRESHED -> REVOKED
- REFRESHED -> EXPIRED
- REFRESHED -> LOGGED_OUT

#### Verification challenge
- ISSUED -> VALIDATED
- ISSUED -> FAILED
- ISSUED -> EXPIRED
- VALIDATED -> CONSUMED

#### Password reset
- REQUESTED -> ISSUED
- ISSUED -> CONSUMED
- ISSUED -> EXPIRED

### Transiciones inválidas
#### Session
- REVOKED -> ACTIVE
- EXPIRED -> ACTIVE
- LOGGED_OUT -> ACTIVE

#### AuthVerificationChallenge
- CONSUMED -> ISSUED
- EXPIRED -> VALIDATED

#### Password reset flow
- CONSUMED -> CONSUMED nuevamente

### Reglas
- refresh no revive sesiones REVOKED, EXPIRED o LOGGED_OUT
- logout invalida la continuidad de acceso de esa sesión
- logout all iniciado por el propio usuario marca como LOGGED_OUT todas las sesiones activas elegibles del usuario
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
- RequestPasswordResetDto
- ConfirmPasswordResetDto
- LinkIdentityDto
- UnlinkIdentityDto
- AuthSessionResponseDto
- CurrentAuthContextResponseDto
- AuthIdentityResponseDto

### DTOs diferidos / fase 2
- ResendCodeDto
- GetCurrentAuthContextQueryDto
- VerifyChallengeDto

### Acciones
- login
- refresh session
- logout
- logout all sessions
- request verification code
- verify code
- request password reset
- confirm password reset
- get current auth context
- link auth provider
- unlink auth provider

### Acciones diferidas / fase 2
- resend verification code

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
- auth_password_reset_failed
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
- rate limit en login, reset y verify
- bloqueo temporal o cooldown donde aplique
- validación backend de cada sesión
- protección frente a replay de challenge o refresh

Nota:
- resend verification code queda fuera del MVP actual; si se incorpora en fase 2, deberá incluir cooldown, anti-abuso, trazabilidad y límites explícitos.

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

## 16. Estado del submódulo (MVP closure)

### Estado actual
El submódulo Auth se considera cerrado a nivel de dominio, contratos y reglas de negocio para el MVP.

### Alcance cubierto
- autenticación multi-provider (PASSWORD, EMAIL_CODE, PHONE_CODE, GOOGLE, APPLE)
- resolución de identidad externa hacia userId canónico
- auto-linking controlado basado en señales verificadas
- emisión, refresh y lifecycle completo de sesiones
- logout y logoutAllSessions con semántica diferenciada (LOGGED_OUT vs REVOKED)
- verification challenges (email, phone, password reset, login, step-up limitado)
- password reset con revocación de sesiones
- modelado explícito de lifecycle de sesión y challenge
- auditoría y eventos a nivel de dominio mediante puertos

### Cobertura de testing
El submódulo cuenta con cobertura de:
- reglas de negocio críticas (account resolution, lifecycle, invariantes)
- servicios de aplicación (login, session, identity, linking, reset)
- contrato de controladores
- integración con provider (adapter Firebase)

La cobertura es suficiente para validar el comportamiento del dominio en el contexto MVP.

### Decisiones relevantes consolidadas
- separación estricta entre User (identidad canónica) y AuthIdentity (credenciales)
- Firebase actúa como broker de autenticación, no como identidad del dominio
- la validez de sesión depende de lifecycle explícito, no solo de expiración técnica
- verification challenge es entidad independiente con lifecycle propio
- auto-linking solo ocurre con señales verificadas y sin ambigüedad

### Pendientes no bloqueantes (infraestructura)
- implementación real de:
  - AUTH_AUDIT_PORT
  - AUTH_EVENTS_PORT
  - AUTH_TOKEN_ISSUER_PORT
  - AUTH_VERIFICATION_PORT
- reemplazo de adapters noop por integraciones reales (Firebase Admin, email/SMS)
- validación stateful de sesión en capa de infraestructura (token verification + DB check)
- evolución del AuthAuthenticatedGuard a validación completa (no solo estructural)

### Criterio de cierre
El submódulo se considera listo para:
- ser consumido por Memberships, Roles, Grants e Invitations
- servir como base de autenticación del sistema

No se considera aún:
- completamente listo para producción sin capa de infraestructura real