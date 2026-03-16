# AUREOS CORPORATION
## IP Protection & Security Checklist

**Status: In Progress**
**Last Updated: March 2026**

---

### 1. TRADEMARK REGISTRATION

| Item | Status | Action Required |
|------|--------|-----------------|
| Register "Aureos Corporation" trademark | Pending | File at ipaustralia.gov.au |
| Register "Aureos AI" trademark | Pending | File at ipaustralia.gov.au |
| Register logo/brand design | Pending | Create final logo, then file |
| Domain registration (aureos.ai, aureoscorp.com) | Pending | Register at registrar |
| Social media handles (@aureosai) | Pending | Secure on all platforms |

**IP Australia:** https://www.ipaustralia.gov.au/trade-marks
**Cost estimate:** AUD $250 per class per trademark (online filing)

---

### 2. COPYRIGHT REGISTRATION

| Item | Status | Notes |
|------|--------|-------|
| Source code copyright declaration | Done | Git history serves as proof |
| Copyright notice in source files | Pending | Add headers to all files |
| Formal copyright registration | Optional | Copyright exists automatically in AU |
| Documentation copyright | Pending | Add to all docs |

**Note:** In Australia, copyright exists automatically upon creation. Registration is not required but can strengthen enforcement.

**Recommended copyright header for source files:**
```
# Copyright (c) 2026 Aureos Corporation. All rights reserved.
# This source code is proprietary and confidential.
# Unauthorized copying, modification, or distribution is strictly prohibited.
```

---

### 3. NDA EXECUTION

| Recipient | Status | Date |
|-----------|--------|------|
| Template created | Done | March 2026 |
| [Collaborator 1] | Pending | — |
| [Contractor 1] | Pending | — |
| [Partner 1] | Pending | — |

**Template location:** `/app/legal/NDA_TEMPLATE.md`

---

### 4. CODE SECURITY

| Check | Status | Details |
|-------|--------|---------|
| API keys in .env files only | PASS | All keys in /app/backend/.env |
| No hardcoded secrets in source | PASS | Verified |
| .env in .gitignore | VERIFY | Ensure .env never committed |
| Private repository | VERIFY | Ensure repo is private |
| 2FA on Git provider | VERIFY | Enable on GitHub/GitLab |
| Branch protection rules | Pending | Set up on main branch |
| Signed commits | Optional | GPG signing for proof |

---

### 5. INFRASTRUCTURE SECURITY

| Check | Status | Action |
|-------|--------|--------|
| Environment variables for all credentials | PASS | MONGO_URL, API keys, JWT_SECRET |
| No default/fallback values for secrets | PASS | Fails fast if missing |
| Database access control | PASS | MongoDB local only |
| CORS configuration | VERIFY | Review CORS_ORIGINS setting |
| HTTPS for all external API calls | PASS | All providers use HTTPS |
| Rate limiting on API endpoints | Pending | Add rate limiting middleware |
| Request logging for audit trail | Pending | Add structured logging |

---

### 6. DATA PROTECTION

| Check | Status | Notes |
|-------|--------|-------|
| User passwords hashed (bcrypt) | PASS | In server.py auth |
| JWT tokens with expiration | PASS | Configured |
| No PII in logs | VERIFY | Review logging output |
| MongoDB _id excluded from API responses | PASS | Projection {"_id": 0} |
| User data deletion capability | Pending | GDPR/Privacy compliance |

---

### 7. PATENT EVALUATION

| Algorithm / Method | Novelty Assessment | Action |
|---|---|---|
| Multi-engine probability scoring | Potentially novel | Evaluate with patent attorney |
| Manipulation detection pattern system | Potentially novel | Evaluate with patent attorney |
| Market regime classification method | Standard techniques | Low priority |
| Causality inference from technical data | Potentially novel | Evaluate with patent attorney |
| Monte Carlo calibration for assets | Standard techniques | Low priority |

**Note:** Patent evaluation requires consultation with a registered patent attorney. Provisional patents can be filed to establish priority dates while full evaluation is conducted.

---

### 8. PROOF OF AUTHORSHIP

| Evidence | Status | Location |
|----------|--------|----------|
| Git commit history | Active | Repository |
| Timestamped development logs | Active | Emergent platform |
| IP Manifesto declaration | Done | /app/legal/IP_MANIFESTO.md |
| Architecture documentation | Done | /app/memory/PRD.md |
| Test reports (dated) | Done | /app/test_reports/ |

---

### 9. IMMEDIATE ACTION ITEMS

**Priority 1 (This Week):**
- [ ] Ensure all repositories are PRIVATE
- [ ] Enable 2FA on all Git/cloud accounts
- [ ] Add copyright headers to all source files
- [ ] Verify .env is in .gitignore
- [ ] Secure domain names

**Priority 2 (This Month):**
- [ ] File trademark applications at IP Australia
- [ ] Execute NDAs with any collaborators
- [ ] Add rate limiting to API endpoints
- [ ] Set up structured audit logging

**Priority 3 (This Quarter):**
- [ ] Consult patent attorney for novel algorithms
- [ ] Implement user data deletion (privacy compliance)
- [ ] Set up automated security scanning
- [ ] Establish incident response procedure

---

*This checklist is a guide for operational IP protection. For legal filings and formal IP registration, consult with a qualified Australian IP attorney.*
