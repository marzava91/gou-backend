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

### 4.4 ¿Qué define el scope de la invitación?

#### Decisión

El scope es explícito:

- tenantId
- opcionalmente storeId

#### Justificación

Debe alinearse con Memberships.

#### Impacto

No se permiten invitaciones ambiguas de scope.

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

### 4.9 ¿Puede una invitación expirar?

#### Decisión

Sí, obligatoriamente.

#### Impacto

Debe tener TTL explícito.

### 4.10 ¿Qué pasa si se revoca?

#### Decisión

La invitación queda inválida permanentemente.

## 5. Modelo conceptual

### Entidad principal

- Invitation

### Entidades auxiliares

- InvitationRecipient
- InvitationToken
- InvitationAcceptanceRecord
- InvitationAuditEvent

### Ownership

- Invitations es owner del proceso de invitación
- Memberships es owner de la pertenencia efectiva

### Source of truth

- invitación → Invitations
- pertenencia → Memberships

### Relaciones

- Invitation referencia tenantId
- puede referenciar storeId
- puede generar membershipId al aceptarse

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
- expired
- revoked
- canceled

### Transiciones válidas

- proposed → sent
- sent → accepted
- sent → expired
- sent → revoked
- proposed → canceled

### Transiciones inválidas

- accepted → sent
- expired → accepted
- revoked → accepted

### Reglas

- sent es el único estado aceptable
- accepted es terminal
- expiración automática
- revocación manual
- cancelado solo antes de envío

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

## 9. Impacto en otros módulos

- Users se crea o vincula en aceptación
- Auth puede participar en validación previa
- Memberships se crea desde invitation aceptada
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
- resend invitation
- revoke invitation
- accept invitation
- decline invitation
- get invitation by token
- list invitations

### Errores

- invitation_not_found
- invitation_expired
- invitation_revoked
- invitation_already_accepted
- invalid_invitation_token
- invitation_recipient_mismatch
- membership_conflict

### Eventos

- invitation_created
- invitation_sent
- invitation_resent
- invitation_revoked
- invitation_expired
- invitation_accepted
- invitation_declined
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

## 12. Confiabilidad y hardening

- idempotencia en aceptación
- invalidación de tokens previos
- auditoría completa
- TTL obligatorio
- no exposición de tokens
- reconciliación si falla creación de membership

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

## 15. Definition of Done

- flujo invitation → membership definido
- lifecycle cerrado
- invariantes definidos
- tokens seguros
- auditoría definida
- contratos claros
