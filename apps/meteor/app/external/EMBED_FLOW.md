# External (SFA app) embed & auth flow

What this file is: notes on the custom flow that lets the SFA Flutter app (the "partner") show Rocket.Chat inside a WebView and log users in automatically.
It only contains what is verified from the code in this repo and from the app-side `MessengerController` (Dart) code.
Anything not yet confirmed is listed under **Open questions**.

## Pieces involved

| Piece | Location |
|---|---|
| Landing page (auth shim) | `apps/meteor/public/embed-landing.html` and `apps/meteor/public/embed-landing.js` |
| Register endpoint | `app/external/server/api/v1/external-register.ts` → `POST /api/v1/external.register` |
| Exchange endpoint | `app/external/server/api/v1/external-exchange.ts` → `POST /api/v1/external.exchange` |
| Reparent endpoint | `app/external/server/api/v1/external-reparent.ts` → `POST /api/v1/external.reparent` |
| Partner HMAC check | `app/external/server/lib/partnerAuth.ts` |
| Per-user key storage | `app/external/server/lib/keyStore.ts` |
| Login token minting | `app/external/server/lib/token.ts` |
| User upsert | `app/external/server/lib/userUpsert.ts` |
| DM linking (parent/children) | `app/external/server/lib/linkSalesTeam.ts` |
| Group/broadcast rooms per parent | `app/external/server/lib/grouping.ts` |
| Request-reviewed push | `app/api/server/v1/mobile.ts` → `POST /api/v1/mobile.review-request` |
| RC client → app bridge | `client/startup/notifications/konchatNotifications.ts` and `client/startup/rcbridge.ts` |
| Module entry | `app/external/server/index.ts`, imported from `server/main.ts` |

The app does not use an `<iframe>`. It loads the messenger URL as the top-level page of a Flutter `WebViewController`.
App ↔ page communication works like this:
- **App → page**: `runJavaScript('window.postMessage(<json>, "*")')`. The page receives it as a `message` event whose `data` is an object.
- **Page → app**: the `RCBridge` JavaScript channel, called as `RCBridge.postMessage(<string>)`. The app parses the string with `jsonDecode` and switches on `type`.

## Data model

- **Partner**: a document in the `partners` collection with `partnerId`, `partnerSecret`, `allowedTags`, `status`, and other fields. Code looks it up by `partnerId`.
- **RC user created by the partner**, with these fields:
  - `roles: ['sfa']`
  - `customFields.tag`
  - `customFields.salesTeamId`
  - `customFields.organizationId`
  - `customFields.parentSalesTeamId`
  - `customFields.externalAuth = { partnerId, enc, fp, status: 'active', updatedAt }`
- **K_user**: a random 32-byte key per user, stored as base64url. It is created once and reused on later registers.
  - Stored as `enc`: AES-256-GCM with key `sha256(EXTERNAL_KEY_SERVER_MASTER)`, packed as `iv(12)|tag(16)|ct` in base64url.
  - Returned to the partner as `key`: the same scheme, with key `sha256(partnerSecret)`.

## Flow 1: registration (partner backend → RC)

`POST /api/v1/external.register` (`authRequired: false`, guarded by `verifyPartnerHMAC`)

1. **Headers**: `x-partner-id`, `x-timestamp` (unix seconds, must be within ±300s), `x-signature`.
   - `x-signature` is a hex string: `HMAC-SHA256(partnerSecret, "METHOD|req.url|ts|sha256hex(JSON body)")`.
   - The partner must exist and must not have `status: 'inactive'`, otherwise the call fails with `partner-not-found`. A partner with no `status` field (created before `external.partners.create`) counts as active.
2. **Body**: a single item, an array of items, or `{ users: [...] }`.
   - Item fields: `tag` (required), `username`, `email`, `name`, `salesTeamId`, `organizationId`, `parentId`, `childrenIds`.
3. **For each item**:
   1. If no email is given, the email is set to `${username}@${tag}.ir`.
   2. The user is upserted by email. New users are inserted directly into `users` with no password or login service, with `customFields.externalAuth = { partnerId, status: 'pending' }` so ownership is recorded from the start. Existing users get their fields updated, and the previous `parentSalesTeamId` is kept.
      - An existing user is updated only if `externalAuth.partnerId` is the calling partner. A user with no `externalAuth` (created before ownership was recorded) is accepted only if `sfa` is its only role. Otherwise the item fails with `user already exists and is not managed by this partner`, so a partner cannot take over regular RC users or another partner's users.
   3. K_user is reused if an active record owned by this partner exists; otherwise it is generated and saved.
   4. `linkSalesTeamRelations` creates DMs with the users whose `customFields.salesTeamId` is in `{parentId} ∪ childrenIds`, scoped by the same org and tag. This step is best effort.
   5. `reconcileParentGroup` runs for the user's own group (if it has children), its parent's group, and its old parent's group (if the parent changed).
      - Each parent group is a private writable group `group-<tag>-<org>-<parentId>` plus a read-only broadcast group `channel-<tag>-<org>-<parentId>`. The parent is made owner of the broadcast group.
      - The bot user `EXTERNAL_BOT_USERNAME` (default `G.GapBot`) does the work.
4. **Response**: `{ success: true, results: [{ index, username, email, userId, key, salesTeamId, organizationId } | { ..., error }] }`.
   - `userId` here is the **Rocket.Chat `_id`**.

## Flow 2: opening the messenger (login)

### Messages

| Message | Direction | Delivered via | Fields |
|---|---|---|---|
| `RC_CONTEXT` | app → page | `window.postMessage` after every `onPageFinished` | `expectedUserId`, `partnerId`, `tag`, `theme` |
| `RC_NEEDS_ASSERTION` | page → app | `RCBridge` (JSON string) | `expectedUserId` |
| `RC_ASSERTION` | app → page | `window.postMessage` | `partnerId`, `userId`, `tag`, `exp`, `signature` |
| `RC_ASSERTION_SUCCESS` | page → app | `RCBridge` | `userId`. Sent after a successful exchange, just before the redirect. Stops the app's 30s timer. |
| `RC_ASSERTION_FAILED` | page → app | `RCBridge` | `code`, `message`, `expectedUserId` (see "Login failure codes") |
| `RC_REQUEST_REVIEWED` | page → app | `RCBridge` | `payload` |

### Sequence

1. The app loads `getMessengerUrl()`. The page that handles login is `/embed-landing.html`, which loads `/embed-landing.js`.
2. On `onPageFinished`, the app posts `RC_CONTEXT`. The page sets `data-theme` on its own `<html>` from `theme`. If no session flow is running yet and `expectedUserId` is present, it stores `expectedUserId`, `partnerId` and `tag` and calls `ensureSession()`. Later `RC_CONTEXT` messages on the same page load only update the theme (Android can fire `onPageFinished` more than once).
3. `ensureSession()` reads `Meteor.loginToken` and `Meteor.userId` from `localStorage`:
   - **Stored userId ≠ expectedUserId**: calls `POST /api/v1/logout` with the old token (best effort), clears `Meteor.*` keys, and treats the session as invalid.
   - **Stored userId = expectedUserId**: calls `POST /api/v1/login` with `{ resume: token }` (see "Why resume login" below). If it succeeds for `expectedUserId`, the page calls `location.replace('/home')`. Done. If it is rejected, the page clears `Meteor.*` and continues with the next bullet.
   - **Otherwise** (including no stored token): the page sends `RC_NEEDS_ASSERTION`. It posts the message to `window.parent`, which is the page itself in a top-level WebView, so this copy is ignored. It also sends it through `RCBridge`, and that is the copy the app acts on.
4. The app gets `RC_NEEDS_ASSERTION` and calls `_sendAssertion`:
   1. Starts a 30s timeout.
   2. Calls `_messengerUseCase.getSignature()`, which returns `{signature, expirationDate}`.
   3. Posts `RC_ASSERTION` with `exp = expirationDate`.
5. The page gets `RC_ASSERTION`:
   1. It ignores the message unless it is waiting for an assertion, and fails with `user-mismatch` if `userId !== expectedUserId`.
   2. It clears `Meteor.*` and calls `POST /api/v1/external.exchange` with `{partnerId, userId, tag, exp, signature}`.
   3. The server's checks are listed under "external.exchange checks" below.
   4. It verifies the new token with `POST /api/v1/login` `{ resume: token }`.
   5. On success, the page writes `Meteor.loginToken`, `Meteor.userId` and `Meteor.loginTokenExpiresAt` to `localStorage`, sends `RC_ASSERTION_SUCCESS`, then calls `location.replace('/home')`.
   6. On failure, it clears the tokens, sends `RC_ASSERTION_FAILED` to the app, and replaces the body with `Auth failed`.
6. The RC web client boots on `/home` and resumes the session from `localStorage`. The app posts `RC_CONTEXT` again on this page's `onPageFinished`, but nothing in the RC client listens for it.

### Why resume login

The RC client on `/home` logs in by resuming the stored token over DDP. The server then checks token age (`Accounts_LoginExpiration`) and runs `Accounts.validateLoginAttempt` (active user, roles, login blocking by IP/user). If that fails, the client logs out and shows the RC login page, which the user must never see.

`GET /api/v1/me` and token minting in `external.exchange` do not run those checks, so the page used to redirect to sessions that `/home` then rejected. `POST /api/v1/login` with `{ resume }` runs the same login handlers as `/home` (2FA is skipped for resume), and returns the same token. The page only redirects after it succeeds.

### Login failure codes

`RC_ASSERTION_FAILED.code` is stable; `message` is free text for logs only.

| `code` | Source | Meaning |
|---|---|---|
| `missing-fields` | `external.exchange` | A field is missing. This is what happens when the SFA backend has no `SalesTeamMessenger` row (null signature, `exp` 0). |
| `assertion-expired` | `external.exchange` | `exp` is in the past. |
| `key-not-authorized` | `external.exchange` | No active `externalAuth` record, it belongs to another partner, or the partner is inactive. Usually: user not registered in RC. |
| `tag-mismatch` | `external.exchange` | The user's `customFields.tag` differs from the assertion's `tag`. |
| `bad-signature` | `external.exchange` | HMAC does not match. |
| `exchange-failed` | `external.exchange` | Unexpected server error, including a signature that is not valid hex of the right length. |
| `user-inactive` | `external.exchange` or resume login | The RC user is deactivated. |
| `user-has-no-roles` | `external.exchange` or resume login | The RC user has no `roles` array. |
| `login-blocked` | resume login | `Block_Multiple_Failed_Logins` is blocking this IP or user. |
| `session-rejected` | resume login | Any other resume rejection, for example an expired or removed token. |
| `user-mismatch` | page | The assertion, or the user returned by the server, is not `expectedUserId`. |
| `rate-limited` | page | The server answered HTTP 429 (REST rate limiter). |
| `network-error` | page | A request could not be sent. |
| `invalid-response` | page | A server response is not JSON. |
| `unknown` | page | Any other error in the page. |

The server codes are returned as `errorType` in the failure response.

**The current app ignores `RC_ASSERTION_FAILED`** (its `RCBridge` switch has no case for it). It still shows its generic error after the 30s assertion timeout. To show a relevant message, the app needs a `case 'RC_ASSERTION_FAILED'` that calls `_failWebView(...)` with a message chosen by `code`.

### external.exchange checks

The server does these checks in order:

1. All fields are present.
2. `exp` (unix seconds) is not in the past. There is no upper bound on `exp`.
3. The user's `externalAuth` record exists, is `active`, and has `partnerId` equal to the request's `partnerId`. The partner is not `inactive`.
4. The user's `customFields.tag` equals the request's `tag`.
5. `signature` (hex) equals `HMAC-SHA256(K_user, "partnerId|userId|tag|exp")`.
6. The user is active and has a `roles` array (same rules as `Accounts.validateLoginAttempt`). Checked after the signature, so unauthenticated callers learn nothing about the user.
7. A login token is minted and pushed into `services.resume.loginTokens`. The server returns `{ userId, authToken, expiresAt (now + 90 days) }`.

There is no replay protection: the `jti` code is commented out.

## Flow 4: partner login with a signed assertion (new Flutter client)

Replaces Flow 2 for the native Flutter messenger. Flow 2 keeps working until the WebView app is retired.

| Piece | Location |
|---|---|
| Login handler `partner` | `app/external/server/loginHandler.ts` |
| JWT verification | `app/external/server/lib/assertion.ts` |
| Replay store (`rocketchat_external_used_assertions`, TTL on `expireAt`) | `app/external/server/lib/usedAssertions.ts` |
| Partner public keys | `partners.publicKeys[] = { kid, pem, status: 'active' \| 'retired', createdAt }` |

### Sequence

1. The app asks its partner backend for an assertion, using its own session with that backend. For SFA this is the MobileAPI query `GetMessengerAssertion`.
2. The backend returns a compact JWT signed with ES256 by the partner's private key:
   - header: `alg: ES256`, `kid`
   - claims: `iss` (partnerId), `aud: "ggap-messenger"`, `sub` (the RC `_id` returned by `external.register`; for SFA, `SalesTeamMessenger.MessengerUserId`), `iat`, `exp`, optional `nbf`, `jti`, `tag`
3. The app calls `POST /api/v1/login` with `{ "partner": { "assertion": "<JWT>" } }` (or DDP method `login` with the same argument) and gets `{ userId, authToken }`.
4. The app uses `X-User-Id` / `X-Auth-Token` for REST and `{ resume: authToken }` over the websocket. On a 401 it gets a new assertion and logs in again.

### Checks, in order

1. JWT has three parts, `alg` is `ES256` (fixed by the server, not read from the header) and `kid` is present.
2. The partner from `iss` exists, is not `inactive`, and has an `active` public key with that `kid`.
3. The ES256 signature is valid. Claims are trusted only from here on.
4. `aud` contains `ggap-messenger`; `sub`, `jti` (≤128 chars) and `tag` are present.
5. Time, with 30s clock leeway: `exp` not passed, `iat` and `nbf` not in the future, and `exp - iat` ≤ 300s.
6. `tag` is in the partner's `allowedTags`.
7. The user `sub` exists, its `externalAuth.partnerId` is `iss`, and `externalAuth.status` is `active` or `pending`.
8. `tag` equals the user's `customFields.tag`.
9. `jti` is recorded as used (unique per partner). A second use fails.
10. RC's normal `Accounts.validateLoginAttempt` then runs (active user, roles, login blocking). 2FA is skipped for type `partner`.

### Failure codes

Returned by `login` as HTTP 401 with `error` set to the code.

| `error` | Meaning |
|---|---|
| `assertion-malformed` | Not a JWT, wrong `alg`/`aud`, missing claim, or lifetime over 300s. |
| `partner-not-authorized` | Unknown or inactive partner, unknown or retired `kid`, or `tag` not allowed. |
| `bad-signature` | Signature does not match the key. |
| `assertion-expired` / `assertion-not-yet-valid` | Outside the time window (check server clocks). |
| `user-not-authorized` | `sub` is not a user registered by this partner, or its record is revoked. |
| `tag-mismatch` | `tag` does not match the user's tag. |
| `assertion-replayed` | This `jti` was already used. |
| `error-user-is-not-activated`, `error-user-has-no-roles`, `error-login-blocked-for-*` | RC's own login checks. |
| `partner-login-failed` | Unexpected server error (logged). |

### Partners and partner keys

The messenger makes each key pair. It keeps only the public key on the partner record and returns the private key once, to hand to the partner. The private key is never stored or logged on the messenger side.

Endpoints (`app/external/server/api/v1/external-partners.ts` and `external-partner-keys.ts`). All need a logged-in user with the `manage-external-partners` permission (default role: `admin`).

| Endpoint | Body / query | Result |
|---|---|---|
| `GET /api/v1/external.partners.list` | — | `{ partners: [{ partnerId, name }] }`, sorted by name. Never returns `partnerSecret` or keys. |
| `POST /api/v1/external.partners.create` | `{ name, allowedTags: [..] }` | `{ partnerId, name, allowedTags, status: 'active', partnerSecret }`, sent with `Cache-Control: no-store`. `partnerSecret` is shown only here. Errors: `invalid-name`, `invalid-allowed-tags`, `duplicate-name`. |
| `POST /api/v1/external.partners.setStatus` | `{ partnerId, status: 'active' \| 'inactive' }` | `{ partnerId, status }`. An inactive partner cannot call `external.register` or log users in. Existing user sessions are not ended. |
| `POST /api/v1/external.partnerKeys.create` | `{ partnerId }` | `{ partnerId, algorithm: 'ES256', kid, status, createdAt, publicKeyPem, privateKeyPem }`, sent with `Cache-Control: no-store`. |
| `GET /api/v1/external.partnerKeys.list` | `?partnerId=` | `{ partnerId, keys: [{ kid, status, createdAt, publicKeyPem }] }`. No private keys. |
| `POST /api/v1/external.partnerKeys.retire` | `{ partnerId, kid }` | `{ partnerId, kid, status: 'retired' }`. Login with that `kid` fails at once. |

- `kid` has the form `YYYYMMDD-<8 hex>`.
- The private key is PKCS#8 PEM (`-----BEGIN PRIVATE KEY-----`), EC P-256.
- A partner can have at most 2 active keys (`too-many-active-keys`).
- Retired keys stay in the list for audit. There is no way to make a retired key active again.
- If the partner loses the private key, it cannot be recovered: create a new key and retire the old one.

Rotation:

1. `external.partnerKeys.create`, and give the new private key and `kid` to the partner.
2. The partner switches its signing to the new key and `kid`.
3. `external.partnerKeys.retire` for the old `kid`.

## Theme

The app sends `theme` (`'light'` or `'dark'`) in every `RC_CONTEXT`, which it posts after every full page load, including `/home`.

- **Landing page** (`embed-landing.js`): sets `data-theme` on `<html>`. `embed-landing.html` styles the shim page from it, using RC's dark palette colors.
- **RC client** (`client/startup/rcbridge.ts`): on `RC_CONTEXT` with a valid theme it:
  1. sets `data-theme` on `<html>`, which the custom sidebar header tabs read;
  2. once the user is logged in, saves the theme as the user's `themeAppearence` preference through `POST /v1/users.setPreferences`, but only if it differs. That preference drives RC's own palette (`useThemeMode` → `PaletteStyleTag`).

The app's theme always wins. If the user changes the theme from RC's user menu, the next full page load resets it to the app's theme.

## Flow 3: request reviewed (partner backend → RC → app)

1. Something calls `POST /api/v1/mobile.review-request` (`authRequired: false`, no HMAC) with a body that contains `username`.
2. The server runs `Notifications.notifyUser(<rc _id of username>, 'request-reviewed', body)`.
3. The RC client (`konchatNotifications.ts`) runs `window.postMessage({type: 'RC_REQUEST_REVIEWED', payload: body}, '*')`.
4. `rcbridge.ts` catches that and forwards it with `RCBridge.postMessage(JSON.stringify(m))`.
5. The app's `handleReviewedRequest(data)` parses `data['payload']` into a `MessagingRequestPermissionEntity` and applies it. The supported actions are POS card entry, cancel sales quote, cancel return sales quote, and cancel delivery.

## Signature generation (SFA MobileAPI backend)

The app's `MessengerUseCase.getSignature()` is served by the SFA MobileAPI query `GetSignature` (`Gng.SFA.MobileAPI.Application.Features.SalesTeamMessengerService.Queries`). For the current account and sales team, it:

1. Reads three organization configs: `GgapPartnerId_Organization`, `GgapPartnerSecret_Organization` and `GgapTag_Organization`.
2. Loads the `SalesTeamMessenger` row for the current `SalesTeamId`. The row has `MessengerUserKey` and `MessengerUserId`.
3. Decrypts `MessengerUserKey` with AES-256-GCM, using `SHA256(partnerSecret.Trim())` as the key and the layout `iv(12)|tag(16)|ct` in base64url. This is the inverse of `encryptForPartnerTransport` in `keyStore.ts`, so the plaintext is K_user.
4. Sets `exp = now (UTC unix seconds) + 90`.
5. Computes `signature = lowercase hex HMAC-SHA256(UTF8(K_user), "partnerId|MessengerUserId|tag|exp")`. This matches what `external.exchange` checks.
6. Returns `{ Signature, ExpirationDate = exp }`.

Consequences of this code:

- **No `SalesTeamMessenger` row**: the query still succeeds, but returns an empty response (null signature, `exp` 0). The app then sends `RC_ASSERTION` without a usable signature. `external.exchange` answers `missing fields` and the page shows `Auth failed`.
- **Two sources for the same values**: the signature uses `partnerId` and `tag` from the organization config and the user id from `SalesTeamMessenger.MessengerUserId`. The `RC_ASSERTION` message carries `partnerId`, `userId` and `tag` from the app's `Config.messengerConfig`. The two sets must be identical, or the signature check fails.
- **Short lifetime**: the assertion is valid for 90 seconds, measured by the SFA backend's clock. RC compares `exp` against its own clock, so a clock difference of more than 90s between the two servers makes every assertion expire on arrival.
- **Key encoding**: both sides use the K_user base64url string's UTF-8 bytes as the HMAC key, not the decoded 32 bytes. The signatures match.
- **Secret trimming**: the backend trims `partnerSecret` before hashing it, but RC does not. They match only if the secret stored in RC has no leading or trailing whitespace.

## Facts noticed in the code (not judged yet, just recorded)

- **`embed-landing.js`, `ensureSession`**: the code is `setTimeout(sendToFlutter(x), timeout)`.
  - `sendToFlutter(x)` runs immediately, so the message is delivered.
  - `timeout` is not defined anywhere, so the line then throws a `ReferenceError` inside the async function.
- **`RCBridge?.postMessage(...)`**: this throws a `ReferenceError` when `RCBridge` is not defined, for example in a normal browser. Optional chaining does not protect an undeclared identifier.
- **Reparent route**: `app/external/server/index.ts` imports only `external-register` and `external-exchange`. `external-reparent.ts` is never imported, so `external.reparent` is not registered.

## Confirmed by the owner

- `external.register` is called when a user is added to the overall system. It is not called by the same caller as `mobile.review-request`.
- The app uses this RC instance only as its own messenger.
- One app login maps to exactly one `userId`. Different app users never share the same device or WebView, so the user-switching branch in `ensureSession()` is defensive only.
- The WebView lands on `embed-landing.html`.
- `Config.messengerConfig.userId` (sent as `expectedUserId` and `userId`) is the RC `_id` returned by `external.register`.
- `mobile.review-request` is called by a separate service that runs messaging flows. Those flows are out of scope for now. The call exists only to notify the app that an action happened.
- Users cannot change the theme themselves, so the app's theme always winning is correct.
- The SSO flow exists so users have no password and cannot use their account outside the app. Saving the theme to the account is therefore fine.
- The Flutter repo is not accessible. App-side behavior is known only from the pasted `MessengerController`, and app-side changes are out of scope for now.

## TODO

### Functional

- `external.reparent` should be live. It is currently not registered.
- **App side, when allowed:** handle `RC_ASSERTION_FAILED` and show a message per `code`. The RC side is done.
- RC must handle `partnerSecret` exactly like the SFA backend does, which trims it before hashing.

### Accepted as-is (owner decision)

- The SFA backend and RC servers are usually in clock sync, so the 90s `exp` window is acceptable.
- `partnerId`, `userId` and `tag` come from two sources (backend org config vs app `messengerConfig`). This is fine for now.

### Security

- **Hardcoded partner secret**: `users.getAvatar` (`app/api/server/v1/users.ts`) inserts a hardcoded partner, with its secret, every time it is called.
- **Hardcoded master key**: `keyStore.ts` has a hardcoded fallback for `EXTERNAL_KEY_SERVER_MASTER`.
- **Logged secrets**: `console.log` calls in `verifyPartnerHMAC` print the partner document (including the secret) and the expected signature.
- **No auth on `mobile.review-request`**: anyone can call it.
- **`allowedTags` not enforced**: `ensureTagAllowed` is defined in `partnerAuth.ts` but never called.
- **Partner `status` not checked**: `verifyPartnerHMAC` accepts a partner whatever its `status` is.
- **REST rate limiter is per IP per route** (default 10 calls / 60s, `API_Enable_Rate_Limiter_Limit_Calls_Default`). `external.exchange` and `login` are both covered. If clients reach RC through a shared IP (carrier NAT, or a reverse proxy without correct forwarded-IP handling), logins across all users share that budget and fail with `rate-limited`.
- **No replay protection in `external.exchange`**: the `jti` code is commented out. The window is limited by the 90s `exp` set by the SFA backend, but RC itself puts no upper bound on `exp`.
