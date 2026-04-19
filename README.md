# Mnemosyne Project

## Structure
- `client`: React + Vite frontend
- `server`: Node.js + Express backend

## Run Locally
1. Install dependencies:
   - `cd client && npm install`
   - `cd ../server && npm install`
2. Configure env in `server/.env`.
3. Start backend: `cd server && npm run dev`
4. Start frontend: `cd client && npm run dev`

## Production Readiness Features Implemented
- JWT-ready authentication (`AUTH_MODE=jwt`) with OIDC/JWKS verification and role-based access control.
- Structured request and audit logging with request IDs.
- Strict request validation via schema checks.
- PII redaction for transcript content before LLM prompt construction.
- API hardening: security headers, CORS allowlist, payload limits, and rate limiting.
- Liveness/readiness health checks:
   - `GET /api/health/live`
   - `GET /api/health/ready`
   - `GET /api/health`
- Versioned routing support at `/api/v1`.
- Automated server tests and CI workflow.
- Dockerfiles for client and server.

## Required Production Configuration
Set these in your secret manager (not source control):
- `GEMINI_API_KEY`
- `AUTH_MODE=jwt`
- `OIDC_ISSUER`
- `OIDC_AUDIENCE`
- `OIDC_JWKS_URI`
- `CORS_ALLOWLIST` (real frontend domains)
- `USE_MOCK_PATIENT_DATA=false`
- `PATIENT_PROFILE_SERVICE_URL`
- `PATIENT_PROFILE_SERVICE_TOKEN`

Client runtime settings for real OIDC login:
- `VITE_OIDC_ISSUER`
- `VITE_OIDC_CLIENT_ID`
- `VITE_OIDC_AUDIENCE`
- `VITE_OIDC_SCOPE` (for example `openid profile email`)
- `VITE_OIDC_REDIRECT_URI`
- `VITE_ENABLE_MANUAL_TOKEN=false`

Monitoring:
- `METRICS_AUTH_TOKEN` (protects `/metrics` endpoint when set)

## Quality Gates
- Server tests: `cd server && npm test`
- Client build: `cd client && npm run build`
- CI pipeline: `.github/workflows/ci.yml`

## Deployment Strategy
- Frontend: Build with `npm run build` and deploy `client/dist` to Vercel, Netlify, or Firebase Hosting.
- Backend: Deploy Express service to Render, Heroku, AWS App Runner, or Google Cloud Run.
- Database: Use Firebase Firestore with strict security rules and least-privilege access.

## Production Hardening Baseline
- Enforce API auth using `REQUIRE_AUTH=true` and a strong `API_ACCESS_TOKEN`.
- Restrict browser origins using `CORS_ALLOWLIST`.
- Keep `GEMINI_API_KEY` and Firebase credentials only in secure host secrets.
- Use rate limiting (`RATE_LIMIT_*`) and transcript size limits (`MAX_TRANSCRIPT_CHARS`).
- Use HTTPS only in production and rotate secrets regularly.

## Government/Public-Sector Readiness Next Steps
- Route logs to immutable storage with retention and legal hold.
- Integrate enterprise IdP and managed key rotation.
- Add threat modeling, SAST/DAST, dependency scanning, and incident response runbooks.
- Validate compliance requirements (FedRAMP, HIPAA, SOC 2, CJIS) with legal/security teams.
