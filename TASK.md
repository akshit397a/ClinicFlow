# Implementation Tasks: Full Specification Compliance

Status: **IN PROGRESS**
Reference: `README.md` & `SUBMISSION.md`

---

## Task Checklist

### [x] Task 1: Enforce Scheduled Start Time Check for No-Show (Goal 4)
- **Spec**: *"It can be marked No Show only from Confirmed, and only after the slot's scheduled time has passed."*
- **Action Items**:
  - [x] Update `lib/appointments/validators.ts`: `validateTransition` accepts scheduledStart and rejects `no_show` if `scheduledStart > now`.
  - [x] Update `lib/appointments/actions.ts` to pass `scheduledStart`.
  - [x] Add unit tests in `tests/unit/validators.test.ts` (passing).

### [x] Task 2: Reassign Appointments Between Providers (Goal 1)
- **Spec**: *"Front-desk staff can ... reassign appointments between providers. Providers can only see and act on their own schedule, and cannot ... reassign an appointment away from themselves."*
- **Action Items**:
  - [x] Add `reassignProviderSchema` in `lib/validation/schemas.ts`.
  - [x] Add `canReassignProvider` permission check in `lib/appointments/permissions.ts` (enforces front_desk only).
  - [x] Add `reassignProviderAction` in `lib/appointments/actions.ts`.
  - [x] Record immutable audit trail event (`PROVIDER_REASSIGNED`) for reassignment.
  - [x] Add Reassign Provider UI and form in `AppointmentActions.tsx`.

### [x] Task 3: Strict Server-Side Scoping for Providers (Goal 1 & Goal 5)
- **Spec**: *"Providers can only see and act on their own schedule ... Every provider can see one list of every appointment where they are the scheduling provider or added as a supporting provider."*
- **Action Items**:
  - [x] Update `lib/appointments/queries.ts` (`listAppointments`): if `currentUser.role === 'provider'`, queries are strictly restricted to primary or supporting appointments.
  - [x] Update `app/(dashboard)/appointments/page.tsx` to pass `user.profile` into `listAppointments`.
  - [x] Update `app/(dashboard)/schedule/page.tsx` to strictly lock `providerId` to `user.profile.id` on server when user is a provider.
  - [x] Enable providers to generate availability for their own schedule directly.

### [x] Task 4: Restore Slots & Edit Unbooked Slots (Goal 2)
- **Spec**: *"Front-desk staff and providers create appointment slots ... and can edit them while unbooked ... Slots can be archived and restored."*
- **Action Items**:
  - [x] Add `editSlotSchema` and `restoreSlotSchema` in `lib/validation/schemas.ts`.
  - [x] Add `editSlotAction` and `restoreSlotAction` in `lib/appointments/actions.ts`.
  - [x] Record immutable audit events for slot edits (`SLOT_EDITED`) and restorations (`SLOT_RESTORED`).
  - [x] Add `SlotControls.tsx` component with edit time modal, archive button, and restore button.
  - [x] Integrate `SlotControls` into `app/(dashboard)/appointments/[id]/page.tsx`.

### [x] Task 5: Edit Visit Notes by the Provider Who Wrote Them (Goal 3)
- **Spec**: *"Visit notes can be added and edited by the provider who wrote them."*
- **Action Items**:
  - [x] Add `editNoteSchema` in `lib/validation/schemas.ts`.
  - [x] Add `editNoteAction` in `lib/appointments/actions.ts` with strict author verification (`note.authorProviderId === user.id`).
  - [x] Add unit tests for `canEditNote` in `tests/unit/permissions.test.ts`.
  - [x] Create `VisitNoteItem.tsx` with inline editing form and edited timestamp indicator.
  - [x] Integrate `VisitNoteItem` into `app/(dashboard)/appointments/[id]/page.tsx`.

### [x] Task 6: Date Range & Provider Sorting on Appointments List (Goal 6)
- **Spec**: *"filters for provider, status and date range, sorting by date and time, status or provider"*
- **Action Items**:
  - [x] Add `from` and `to` date pickers in `components/appointments/AppointmentFilters.tsx`.
  - [x] Add `sortBy=provider` option in `AppointmentFilters.tsx` and `lib/validation/schemas.ts`.
  - [x] Support `orderBy: { provider: { fullName: sortDir } }` in `lib/appointments/queries.ts`.
  - [x] Parse `from` and `to` query parameters in `app/(dashboard)/appointments/page.tsx`.

### [x] Task 7: Bulk Availability Collision Detection & Skipped Reporting (Goal 7)
- **Spec**: *"The result must report which slots were created and which were skipped because they collided with an existing booking."*
- **Action Items**:
  - [x] Add pure `hasCollision` function and `ExistingTimeWindow` type in `lib/availability/generation.ts`.
  - [x] Update `generateAvailabilityAction` in `lib/availability/actions.ts` to check overlap against existing bookings/slots for the provider.
  - [x] Increment and report both `created` and `skipped` counts (`{ ok: true, created, skipped }`).
  - [x] Update `components/schedule/BulkAvailabilityForm.tsx` to display skipped count clearly.
  - [x] Add unit tests for collision detection in `tests/unit/generation.test.ts` (passing).

---

## Log of Completed Tasks
- **Task 1 (Status: COMPLETED)**: Enforce scheduled start time check for No-Show. Tests added and passing.
- **Task 2 (Status: COMPLETED)**: Reassign appointments between providers with front-desk permission guard, server action, audit trail (`PROVIDER_REASSIGNED`), and UI form.
- **Task 3 (Status: COMPLETED)**: Strict server-side scoping for providers across appointment queries and day schedule views; self-generation of open slots.
- **Task 4 (Status: COMPLETED)**: Restore slot action and edit unbooked slot action with audit trails (`SLOT_RESTORED`, `SLOT_EDITED`) and `SlotControls.tsx` UI.
- **Task 5 (Status: COMPLETED)**: Edit visit notes with strict author provider verification, audit trail (`NOTE_EDITED`), and `VisitNoteItem.tsx` inline edit UI.
- **Task 6 (Status: COMPLETED)**: Finding appointments with date range filters (`from`/`to`) and provider sorting support across query and UI.
- **Task 7 (Status: COMPLETED)**: Collision detection for recurring availability with accurate reporting of created and skipped counts. Unit tests passing.

---

## Goal 1 QA & Automated Verification Audit
- **TC-01 (Front Desk Authentication & Operations)**: Verified front desk user authentication (`front_desk.one@clinic.test`), full unrestricted permissions (`canReassignProvider: true`, `canManageAvailability: true`), and access to clinic-wide schedules and alerts.
- **TC-02 (Provider Scoping & Hardened Dashboard)**: Locked dashboard view on server to `role: 'provider'` and `selectedProviderId: user.profile.id` when signed in as a provider. Removed unauthorized role switcher and cross-provider dropdowns.
- **TC-03 (Front Desk Reassignment)**: End-to-end verified transferring appointment from Alice to Bob, appending immutable `PROVIDER_REASSIGNED` audit event with actor attribution and supporting provider population.
- **TC-04 (Provider Reassignment Block)**: Verified server check blocks providers (`canReassignProvider` returns `false`), rejecting unauthorized calls with: `"Only front-desk staff can reassign appointments between providers."`
- **TC-05 (Server-Side Query & Calendar Scoping)**: Tested query isolation where Doctor Bob's private appointments are completely hidden from Doctor Alice.
- **TC-06 (Provider Self-Generation Guard)**: Validated server check prevents providers from generating slots for any other doctor ID.
- **Verification Score**: 14 automated assertion checks PASSED (0 failures). Unit tests: 41 passed. TypeScript check: 0 errors.
