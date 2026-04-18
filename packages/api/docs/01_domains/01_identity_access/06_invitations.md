# INVITATIONS

## 1. Propósito del submódulo
Invitations gestiona el proceso formal de invitar a una persona a acceder a un scope organizacional específico, controlando la emisión, entrega, aceptación, expiración y conversión en una Membership.

Resuelve:
- creación de invitaciones dirigidas a un destinatario específico
- control de tokens o links de invitación
- aceptación de invitaciones y validación del destinatario
- conversión de invitación en membership efectiva
- expiración, revocación y reenvío
- trazabilidad completa del flujo de invitación

No resuelve:
- identidad canónica del usuario → Users
- autenticación → Auth
- pertenencia efectiva → Memberships (solo la origina)
- roles asignados → Roles
- permisos excepcionales → Grants
- autorización final de acceso

No define por sí mismo:
- acceso operativo hasta que la invitación sea aceptada y convertida
- permisos efectivos
- identidad externa del usuario

## 2. Definición canónica
Una Invitation es una propuesta formal, temporal y controlada para que una persona acceda a un scope organizacional específico, que puede convertirse en una Membership tras su aceptación válida.
Su rol dentro del sistema:
- Users → quién es
- Auth → cómo accede
- Invitations → cómo se le invita a entrar
- Memberships → dónde pertenece efectivamente
- Roles → qué puede hacer después
Otros módulos dependen de Invitations para:
- onboarding controlado de usuarios
- evitar creación arbitraria de memberships
- validar destinatario antes de habilitar acceso
- generar trazabilidad de quién invitó, a quién, cuándo y con qué alcance

## 3. Fronteras

### Pertenece a Invitations
- definición de invitación
- destinatario (email/phone u otro identificador)
- scope de la invitación
- token o link de invitación
- estado de la invitación
- expiración
- aceptación
- revocación
- conversión a membership
- trazabilidad de invitador, destinatario y resultado

### No pertenece a Invitations
- identidad del usuario → Users
- autenticación → Auth
- pertenencia efectiva → Memberships
- roles o permisos → Roles / Grants
- lógica de autorización
- gestión de sesiones
- ownership del tenant/store

## 4. Decisiones estructurales

### 4.1 ¿Qué representa exactamente una Invitation?

#### Decisión
Una Invitation representa una intención formal de otorgar acceso futuro a un scope organizacional, sujeta a aceptación válida.

#### Justificación
Separar invitación de membership evita accesos prematuros o inconsistentes.

#### Impacto
Una invitación no otorga acceso por sí misma.

### 4.2 ¿A quién va dirigida una invitación?

#### Decisión
La invitación se dirige a un identificador de contacto:
- email o
- phone
No a un userId necesariamente.

#### Justificación
Debe poder invitar a personas que aún no existen en el sistema.

#### Impacto
En aceptación:
- si existe User → se enlaza
- si no existe → se crea o se completa onboarding

#### Nota de modelado MVP
En persistencia, el destinatario no se separa en una entidad propia.
Se almacena directamente en `Invitation` mediante:
- `recipientType`
- `recipientValue`

### 4.3 ¿Qué contiene una Invitation?

#### Decisión
Debe contener:
- identificador único
- destinatario (email/phone)
- scope (tenant/store)
- metadata opcional (rol sugerido, etc.)
- token o link seguro
- estado
- timestamps
- expiración
- invitador (createdBy)

#### Justificación
Debe ser suficiente para:
- validar
- auditar
- convertir a membership

#### Nota de modelado MVP
En el MVP, el token no se modela como entidad independiente.
Solo se persiste el token vigente de manera embebida en `Invitation`, mediante:
- `currentTokenHash`
- `currentTokenIssuedAt`

El valor plano del token no se persiste.

### 4.4 ¿Qué define el scope de la invitación?

#### Decisión
El scope es explícito y mutuamente excluyente:
- si `scopeType = TENANT` → requiere `tenantId` y `storeId` debe ser `null` / ausente
- si `scopeType = STORE` → requiere `tenantId` y `storeId`

#### Justificación
Debe alinearse con Memberships y evitar combinaciones ambiguas o incoherentes.

#### Impacto
No se permiten invitaciones ambiguas de scope.
Toda validación de coherencia de scope debe resolverse en validation/application layer antes de persistir.

### 4.5 ¿Qué pasa cuando se acepta una invitación?

#### Decisión
Se ejecuta un flujo atómico:
1. validar token
2. validar vigencia
3. validar destinatario
4. resolver o crear User
5. crear Membership
6. marcar Invitation como accepted

#### Justificación
Evita estados intermedios inconsistentes.

#### Impacto
Debe ser idempotente.

### 4.6 ¿Puede alguien distinto aceptar la invitación?

#### Decisión
No en el MVP.
El destinatario debe coincidir con:
- email o phone

#### Justificación
Evita suplantación.

#### Impacto
Comparación obligatoria en aceptación.

### 4.7 ¿Qué pasa si ya tiene membership?

#### Decisión
Se valida antes de crear:
- si membership equivalente ya existe → error o noop controlado
- si existe membership distinta → depende de política (permitir o bloquear)

#### Impacto
Evita duplicados.

### 4.8 ¿Se puede reenviar una invitación?

#### Decisión
Sí, pero:
- invalida tokens anteriores
- genera nuevo token

#### Justificación
Evita reutilización insegura.

#### Efectos obligatorios del reenvío
Al reenviar una invitación, el sistema debe:
- invalidar el token vigente anterior
- generar un nuevo token seguro
- actualizar `currentTokenHash` y `currentTokenIssuedAt`
- reenviar la notificación al destinatario
- registrar audit
- publicar evento de dominio
- registrar trazabilidad persistida en `InvitationHistory`

#### Nota de modelado MVP
En el MVP, el reenvío no implica transición de lifecycle.
Por ello, su trazabilidad persistida se registra en `InvitationHistory` como una entrada técnica de mismo estado:
- `fromStatus = sent`
- `toStatus = sent`
- `reason = invitation_resent` o motivo equivalente

### 4.9 ¿Puede una invitación expirar?

#### Decisión
Sí, obligatoriamente.

Toda invitación debe tener expiración efectiva (`expiresAt`), calculada bajo una política TTL controlada por el sistema.

#### Regla de negocio
- si el cliente no envía `expiresAt`, el sistema asigna un TTL default
- si el cliente envía `expiresAt`, el valor resultante debe respetar límites mínimos y máximos
- `expiresAt` debe ser una fecha válida
- `expiresAt` debe estar en el futuro respecto al momento de creación evaluado por el servidor

#### Política TTL MVP
- default TTL: `DEFAULT_TTL_HOURS`
- TTL mínimo permitido: `MIN_TTL_MINUTES`
- TTL máximo permitido: `MAX_TTL_HOURS`

#### Justificación
Evita invitaciones inválidas al origen, expiraciones inmediatas, horizontes excesivos y comportamientos ambiguos entre clientes.

#### Impacto
- no se aceptan invitaciones vencidas al momento de crearse
- no se aceptan TTLs por debajo del mínimo
- no se aceptan TTLs por encima del máximo
- toda validación de TTL debe resolverse en application layer antes de persistir

### 4.10 ¿Qué pasa si se revoca?

#### Decisión
La revocación invalida permanentemente una invitación que aún no ha sido aceptada.

#### Regla de negocio
- solo puede revocarse una invitación que todavía no haya sido convertida en membership
- en el MVP, la revocación aplica sobre invitaciones en estado `sent`
- una invitación revocada no puede volver a estado previo
- una invitación revocada no puede ser aceptada posteriormente
- la revocación invalida el token vigente y bloquea cualquier uso posterior del link de invitación

#### Efectos obligatorios
Al revocar una invitación, el sistema debe:
- persistir el cambio de estado a `revoked`
- registrar `revokedAt`
- registrar `revokedBy`
- invalidar el token actual
- registrar history de transición
- registrar audit
- publicar evento de dominio

#### Justificación
La revocación permite cortar administrativamente una invitación ya emitida sin eliminar trazabilidad ni producir ambigüedad sobre si el acceso seguía disponible.

#### Impacto
- `sent → revoked`
- `revoked` es estado terminal
- la invitación continúa existiendo como evidencia histórica
- la revocación no elimina registros previos ni borra evidencia del envío
- si la invitación ya fue aceptada, ya no corresponde revocación sobre la invitación; cualquier gestión posterior del acceso pertenece al lifecycle de Memberships

### 4.11 ¿Cuál es la diferencia entre canceled y declined?

#### Decisión
- canceled representa cancelación administrativa interna antes del envío
- declined representa rechazo explícito del destinatario después del envío

#### Justificación
Separar ambos resultados preserva semántica de negocio, trazabilidad y consistencia entre estado, auditoría y eventos.

#### Impacto
- proposed → canceled
- sent → declined
- ambos son terminales

## 5. Modelo conceptual

### Entidad principal
- Invitation

### Entidades auxiliares persistidas en el MVP
- InvitationHistory
- InvitationAcceptanceRecord

### Nota de modelado MVP
En el MVP, el modelo físico de Invitations está intencionalmente simplificado respecto del modelo conceptual más abstracto:

- el destinatario no se persiste como una entidad separada `InvitationRecipient`
- el token no se persiste como una entidad separada `InvitationToken`
- los eventos/auditoría no se persisten como una entidad propia `InvitationAuditEvent`

En su lugar:

- el destinatario se modela embebido en `Invitation` mediante `recipientType` y `recipientValue`
- el token vigente se modela embebido en `Invitation` mediante `currentTokenHash` y `currentTokenIssuedAt`
- la trazabilidad persistida del lifecycle y de ciertos eventos técnicos del proceso se registra en `InvitationHistory`
- la evidencia persistida de conversión/aceptación se registra en `InvitationAcceptanceRecord`
- la auditoría operacional y la publicación de eventos de dominio se resuelven mediante puertos/adapters, no como tablas propias del submódulo en este MVP

### Ownership
- Invitations es owner del proceso de invitación
- Memberships es owner de la pertenencia efectiva

### Source of truth
- invitación y su lifecycle persistido → Invitations
- trazabilidad persistida de transiciones y eventos técnicos relevantes → InvitationHistory
- evidencia persistida de aceptación/conversión → InvitationAcceptanceRecord
- pertenencia efectiva → Memberships

### Relaciones
- `Invitation` referencia `tenantId`
- `Invitation` puede referenciar `storeId`
- `Invitation` puede quedar asociada a `membershipId` tras aceptación
- `InvitationHistory` pertenece a una `Invitation`
- `InvitationAcceptanceRecord` pertenece de forma única a una `Invitation`

### Criterio de evolución futura
Si más adelante el dominio requiere:
- múltiples tokens simultáneos o rotaciones históricas auditables
- múltiples destinatarios por invitación
- auditoría persistida dentro del mismo bounded context
- análisis histórico detallado de entregas/notificaciones

entonces podrá evolucionarse a entidades separadas como:
- `InvitationRecipient`
- `InvitationToken`
- `InvitationAuditEvent`

Sin embargo, esas entidades quedan explícitamente fuera del alcance del MVP actual.

## 6. Invariantes del submódulo

- Una invitación siempre tiene destinatario explícito.
- Una invitación siempre tiene scope definido.
- Una invitación aceptada no puede volver a estado previo.
- Una invitación expirada no puede ser aceptada.
- Una invitación revocada no puede ser aceptada.
- Una invitación no equivale a una membership.
- La conversión a membership debe ser única.
- El token debe ser único y no reutilizable.
- La aceptación debe ser idempotente.
- No puede haber múltiples invitaciones activas equivalentes sin política explícita.

## 7. Lifecycle

### Estados
- proposed
- sent
- accepted
- declined
- expired
- revoked
- canceled

### Transiciones válidas
- proposed → sent
- proposed → canceled
- sent → accepted
- sent → declined
- sent → expired
- sent → revoked

### Transiciones inválidas
- sent → canceled
- proposed → declined
- accepted → sent
- declined → accepted
- expired → accepted
- revoked → accepted

### Reglas
- sent es el único estado aceptable
- accepted es terminal
- declined es terminal
- expired es terminal
- revoked es terminal
- canceled es terminal
- expiración automática
- revocación manual
- cancelado solo antes de envío
- declined representa rechazo explícito del destinatario
- en el MVP, la expiración se materializa mediante una operación explícita de reconciliación que persiste el cambio a expired, registra history, audit y evento; posteriormente este flujo será ejecutado automáticamente mediante Jobs

## 8. Reglas críticas

- Invitación debe tener TTL.
- Token debe ser único y seguro.
- Destinatario debe validarse.
- Conversión a membership debe ser atómica.
- Reenvío invalida tokens anteriores.
- No permitir aceptación doble.
- No permitir aceptación fuera de scope.
- Auditoría obligatoria.
- No exponer token en logs.
- `expiresAt` debe ser una fecha válida.
- `expiresAt` debe estar en el futuro.
- Si no se envía `expiresAt`, el sistema asigna un TTL default.
- El TTL resultante no puede ser menor al mínimo permitido.
- El TTL resultante no puede exceder el máximo permitido.
- La validación temporal se calcula respecto al reloj del servidor.

## 8.1 Trazabilidad persistida MVP

En el MVP, la trazabilidad persistida del submódulo se distribuye así:

- `InvitationHistory` registra transiciones de lifecycle y ciertos eventos técnicos persistidos del proceso, como el reenvío
- `InvitationAcceptanceRecord` registra la evidencia única de aceptación/conversión
- audit trail operativo y eventos de dominio se emiten vía puertos/adapters y no constituyen tablas propias del submódulo en esta fase

## 9. Impacto en otros módulos

- Users se crea o vincula en aceptación
- Auth puede participar en validación previa
- Memberships se crea desde invitation aceptada (integración real diferida a fase de integración del dominio)
- Roles puede asignarse tras conversión
- Grants no participa directamente
- Audit registra todo el flujo
- Notifications envía invitación

## 10. Contratos

### DTOs
- CreateInvitationDto
- ResendInvitationDto
- RevokeInvitationDto
- AcceptInvitationDto
- DeclineInvitationDto
- GetInvitationByTokenDto
- ListInvitationsQueryDto

### Acciones
- create invitation
- send invitation
- resend invitation
- revoke invitation
- cancel invitation
- decline invitation
- accept invitation

### Errores
- invitation_not_found
- invitation_expired
- invitation_revoked
- invitation_already_accepted
- invalid_invitation_token
- invitation_recipient_mismatch
- equivalent_active_invitation_exists
- membership_conflict
NOTA: Si ya existe una invitación activa equivalente para el mismo recipient y scope, create invitation debe fallar con `equivalent_active_invitation_exists`.

### Eventos
- invitation_created
- invitation_sent
- invitation_resent
- invitation_revoked
- invitation_canceled
- invitation_declined
- invitation_expired
- invitation_accepted
- invitation_converted_to_membership

## 11. Diseño de validación

### Escenarios principales
- crear invitación válida
- enviar invitación
- aceptar invitación
- convertir a membership

### Escenarios inválidos
- token inválido
- invitación expirada
- destinatario incorrecto

### Casos borde
- doble aceptación
- reenvío concurrente
- expiración durante flujo

### Validación de expiración al crear invitación
- rechazar `expiresAt` inválido
- rechazar `expiresAt` en pasado
- rechazar TTL por debajo del mínimo
- rechazar TTL por encima del máximo
- aceptar `expiresAt` dentro de ventana válida
- aplicar TTL default si `expiresAt` no fue enviado

## 12. Confiabilidad y hardening

- idempotencia en aceptación
- invalidación de tokens previos
- auditoría completa
- TTL obligatorio
- no exposición de tokens
- reconciliación si falla creación de membership
- en el MVP, la expiración persistida se ejecuta mediante reconciliación explícita; en una fase siguiente se conectará a Jobs para materialización automática periódica
- política TTL centralizada en constantes del submódulo:
  - default: 72 horas
  - mínimo: 15 minutos 
  - máximo: 30 días 

### Nota de testing e infraestructura MVP
La validación automática del submódulo en esta fase se apoya principalmente en:
- unit tests de reglas, servicios, mapper y token service
- e2e tests del controller desacoplados de infraestructura externa

Las pruebas de integración repository-level contra Prisma y base de datos real quedan fuera del cierre actual del MVP de Invitations, no por ausencia de diseño de prueba, sino porque aún no existe un entorno de test database integrado y estable para este dominio.

Impacto:
- no se considera bloqueo funcional del submódulo
- sí queda como pendiente técnico obligatorio antes del cierre de integración real del dominio


## 13. Riesgos

- aceptación doble
- token reutilizable
- invitación a usuario equivocado
- duplicación de memberships
- inconsistencia entre invitation y membership

## 14. Decisiones diferidas

- invitaciones abiertas (no dirigidas)
- invitaciones multi-uso
- invitaciones jerárquicas
- políticas avanzadas de aceptación
- automatización de expiración mediante Jobs periódicos (la lógica de expiración persistida queda implementada primero y luego será orquestada automáticamente)
- integración real con Memberships para conversión efectiva de invitación:
  - reemplazo del NoopInvitationMembershipWriterAdapter por implementación real
  - conexión con el submódulo Memberships para creación de membership persistida
  - validación de conflictos de membership equivalente en tiempo real
  - pruebas de integración cross-module (Invitations → Memberships)
  - verificación end-to-end del flujo:
    invitation → acceptance → membership efectiva
- pruebas de integración repository-level con base de datos real:
  - el spec de integración contra Prisma fue diseñado durante la fase de implementación
  - su ejecución no forma parte del cierre actual del submódulo porque todavía no existe un entorno de base de datos de pruebas estable y dedicado para Invitations
  - en esta fase se prioriza cobertura unitaria y e2e controller-level desacoplada de infraestructura
  - cuando exista test database integrada al dominio, deberán reintroducirse pruebas de integración repository-level para:
    - aceptación transaccional
    - idempotencia persistida
    - expiración persistida
    - trazabilidad histórica en base de datos

## 15. Definition of Done

- flujo invitation → membership definido
- lifecycle cerrado
- invariantes definidos
- tokens seguros
- auditoría definida
- contratos claros
- cobertura unitaria mínima implementada para:
  - reglas
  - command service
  - query service
  - token service
  - mapper
- e2e del controller implementado para contratos HTTP principales
- integración real con Memberships documentada como decisión diferida
- pruebas repository-level con base de datos real documentadas como pendiente de infraestructura y reintegración futura