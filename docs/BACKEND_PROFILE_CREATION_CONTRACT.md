# Folio360 — First-Time Profile Creation Backend Contract

This document summarizes the backend API fields and behaviors required by the **First-Time Profile Creation** frontend flow (`/onboarding/profile`).

> **Scope note:** Mock mode (`src/services/mock/mockAdapter.ts`) simulates these fields in `sessionStorage` for frontend development. The real backend must implement persistence, uniqueness enforcement, validation, and authentication/ownership checks.

---

## 1. User Flow & Completion State

**Flow:** `Register → Email Verification → First-Time Profile Creation (/onboarding/profile) → Dashboard (/workspace)`

- **Auth user payload (`GET /auth/me`, `POST /auth/login`, `POST /auth/oauth/exchange`):**
  Add `profile_completed: boolean` to `CurrentUser`:
  ```json
  {
    "id": "uuid",
    "email": "user@example.com",
    "email_verified": true,
    "full_name": "Alex Mercer",
    "slug": "alex_mercer",
    "avatar_url": null,
    "has_password": true,
    "linked_providers": [],
    "profile_completed": true,
    "created_at": "2026-11-26T00:00:00Z"
  }
  ```
- Newly registered accounts should return `slug: ""` (or `null`) and `profile_completed: false`.
- The frontend uses `user.profile_completed && Boolean(user.slug)` to route incomplete users to `/onboarding/profile` and completed users directly to `/workspace`.

---

## 2. Endpoints Used by First-Time Profile Creation

### A. Check Username Availability
- **Endpoint:** `GET /api/v1/profile/slug-availability?slug=<value>`
- **Response (`200`):**
  ```json
  {
    "slug": "alex_mercer",
    "available": true,
    "reason": "Optional message when available is false"
  }
  ```
- **Validation rules:** `3–30` characters, lowercase letters, numbers, and underscores only (`^[a-z0-9_]{3,30}$`), excluding reserved route names (`api`, `login`, `register`, `auth`, `explore`, `settings`, `admin`, `workspace`, `onboarding`, `share`).

### B. Claim / Update Username
- **Endpoint:** `PATCH /api/v1/profile/me/slug`
- **Request:** `{ "slug": "alex_mercer" }`
- **Responses:** `200 OK` (updated `Profile`) | `409 SLUG_TAKEN` | `422 VALIDATION_ERROR`

### C. Retrieve Current Profile (Resume Partial Setup)
- **Endpoint:** `GET /api/v1/profile/me`
- **Response (`200`):** Returns existing `Profile` fields (including `date_of_birth`, `current_activities`, `interests`, `bio`, `avatar_url`, `profile_completed`) so users who leave midway can resume where they left off.

### D. Save First-Time Profile Data
- **Endpoint:** `PATCH /api/v1/profile/me`
- **Request payload sent by `profileService.completeInitialProfile()`:**
  ```json
  {
    "full_name": "Alex Mercer",
    "date_of_birth": "2004-05-14",
    "bio": "Optional short bio or null",
    "interests": ["Distributed Systems", "UI/UX Design"],
    "current_activities": [
      {
        "key": "studying",
        "description": "Pursuing B.Tech in Computer Science"
      },
      {
        "key": "other",
        "label": "Mentoring",
        "description": "Guiding first-year students"
      }
    ],
    "profile_completed": true
  }
  ```
- **New `Profile` fields to persist:**
  - `date_of_birth`: `YYYY-MM-DD` (required on completion, kept private, not exposed on public profiles).
  - `current_activities`: array of `{ key, label?, description? }` where `key` is one of:
    `studying | working | interning | freelancing | job_seeking | researching | building_project | learning_skills | other`.
    - `label` is required when `key === "other"`.
    - `description` is optional for any activity.
  - `profile_completed`: `boolean` (server-authoritative; set to `true` only when `full_name`, `slug`, and `date_of_birth` are valid).

### E. Profile Picture Upload & Removal (Existing Pattern Reused)
- **Upload:** `POST /api/v1/profile/me/avatar` (`multipart/form-data`, field `file`, JPEG/PNG/WebP, max 5 MB) → `{ "avatar_url": "https://..." }`
- **Remove:** `DELETE /api/v1/profile/me/avatar` → `204 No Content`
