# DevSync — Authentication & Cryptographic Security Architecture

## 1. Authentication Mechanisms Summary

DevSync implements three distinct authentication and authorization mechanisms:
1. **Local Authentication:** Email & salted bcrypt password with JSON Web Token (JWT) issuance.
2. **Google OAuth 2.0 (OpenID Connect):** Single Sign-On enabling instant registration and passwordless login.
3. **GitHub OAuth 2.0:** Secure authorization granting DevSync repository management access with encrypted token storage.

---

## 2. Local Email & Password Authentication

### A. User Registration (`server/src/controllers/authController.ts`)
1. Inbound request is validated using Zod (`registerSchema`):
   - Name: 2–80 characters.
   - Email: Valid email format, normalized to lowercase.
   - Password: 6–72 characters (preventing bcrypt truncation issues).
2. Checks PostgreSQL for existing email uniqueness:
   `prisma.user.findUnique({ where: { email } })`
3. Hashes password using **bcrypt** with a cost factor (salt rounds) of 10:
   `const passwordHash = await bcrypt.hash(validated.password, 10);`
4. Creates user record in PostgreSQL.
5. Generates signed JWT token and returns user profile without sensitive fields.

### B. User Login & Password Verification
1. Zod validates email and password presence.
2. Retrieves user record from database by email.
3. If `user.passwordHash` is null, returns a friendly error indicating the user originally signed in via Google:
   *"This account was created via Google Sign-In. Please sign in using Google."*
4. Compares plain-text candidate password with stored hash:
   `const isMatch = await bcrypt.compare(validated.password, user.passwordHash);`
   If invalid, returns `401 Unauthorized` and logs `[AUTH] Failed login attempt: user@example.com - invalid credentials`.
5. Upon successful match, generates a signed JWT.

### C. JWT Specification & Protected Routes
- **Algorithm:** HMAC SHA-256 (`HS256`).
- **Expiration:** 7 days (`7d`).
- **Payload:**
  ```json
  {
    "userId": "c110f6d2-523c-4cde-8bcf-3b976c407ffe",
    "email": "alex@devsync.io",
    "role": "LEAD",
    "iat": 1730366400,
    "exp": 1730971200
  }
  ```
- **Validation Middleware (`server/src/middleware/auth.ts`):**
  Extracts token from `Authorization: Bearer <token>`, verifies signature against `process.env.JWT_SECRET`, and populates `req.user`.

---

## 3. Google OAuth 2.0 Implementation

- **Initiation Endpoint:** `GET /api/auth/google` generates a cryptographic CSRF state token and redirects the browser to `https://accounts.google.com/o/oauth2/v2/auth`.
- **Callback Endpoint:** `GET /api/auth/google/callback` receives the authorization code, exchanges it at `https://oauth2.googleapis.com/token`, and retrieves user profile details from `https://www.googleapis.com/oauth2/v2/userinfo`.
- **Account Linking:** If a local account with that email already exists, DevSync links the `googleId` to that existing account. If new, it creates a `DEVELOPER` user with `passwordHash = null`.
- **Redirection:** DevSync redirects the user back to the frontend with the JWT:
  `http://localhost:5173/login?google_token=<JWT>&google_user=<JSON>`

---

## 4. GitHub OAuth 2.0 & Token Encryption

DevSync accesses user GitHub repositories on their behalf without ever exposing GitHub personal access tokens.

### A. OAuth Handshake
1. Client calls `GET /api/github/auth`.
2. Backend generates a 24-byte cryptographic random state token, records it in an in-memory Map with a 15-minute expiration timestamp, and constructs the authorization URL:
   `https://github.com/login/oauth/authorize?client_id=...&scope=repo,read:user,user:email&state=...`
3. When GitHub redirects back to `GET /api/github/callback`, the backend verifies that the received `state` exists in memory (thwarting CSRF attacks) and deletes it immediately.
4. Backend trades the temporary authorization code for a GitHub `access_token`.

### B. AES-256-GCM Token Encryption (`server/src/utils/crypto.ts`)
To protect OAuth tokens at rest in PostgreSQL, tokens are encrypted using **AES-256-GCM (Galois/Counter Mode)**, an authenticated encryption standard.

```typescript
// Format: iv:authTag:encryptedData (all hex-encoded)
export function encryptToken(token: string): string {
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}
```

- **Confidentiality:** AES-256 ensures ciphertext cannot be read without `GITHUB_TOKEN_ENCRYPTION_KEY`.
- **Integrity & Authenticity:** The 16-byte authentication tag (`authTag`) verifies that neither the ciphertext nor the IV was tampered with in the database.
- **Decryption Safeguard:** During decryption (`decryptToken`), if the authentication tag fails verification, `cipher.final()` throws an exception, preventing ciphertext forgery.

---

## 5. Webhook Cryptographic Verification (HMAC SHA-256)

GitHub sends webhooks to `POST /api/github/webhook`. To guarantee that payloads originate strictly from GitHub and have not been intercepted or forged:

1. DevSync captures the unparsed raw request body in `req.rawBody` during Express JSON parsing.
2. DevSync computes an HMAC SHA-256 digest of the raw body using `process.env.GITHUB_WEBHOOK_SECRET`:
   ```typescript
   const hmac = crypto.createHmac('sha256', GITHUB_WEBHOOK_SECRET);
   const expectedSignature = `sha256=${hmac.update(rawBody).digest('hex')}`;
   ```
3. Performs a **timing-safe comparison** to prevent side-channel timing attacks:
   ```typescript
   if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
     return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
   }
   ```

---

## 6. Security Posture Assessment

| Security Control | Implementation Status | Technical Mechanism |
|---|---|---|
| **Password Storage** | ✅ Fully Implemented | Blowfish bcrypt with 10 salt rounds |
| **Session Integrity** | ✅ Fully Implemented | Signed HS256 JWT with 7-day expiration |
| **Token-At-Rest Encryption** | ✅ Fully Implemented | AES-256-GCM with 96-bit IV and 128-bit Auth Tag |
| **CSRF Defense (OAuth)** | ✅ Fully Implemented | Cryptographic CSPRNG state validation with expiry |
| **Webhook Authenticity** | ✅ Fully Implemented | HMAC SHA-256 with timing-safe byte equality |
| **Input Validation** | ✅ Fully Implemented | Strict Zod schemas validating types, bounds, strings |
| **SQL Injection Defense** | ✅ Fully Implemented | Parameterized queries handled natively by Prisma ORM |
| **Credential Redaction** | ✅ Fully Implemented | Winston logger scrubs passwords, tokens, auth headers |
| **Rate Limiting** | ⚠️ Planned Scope | Not yet enforced on `/api/auth/login` |
| **Refresh Token Rotation** | ⚠️ Planned Scope | Single 7-day access token currently used |

