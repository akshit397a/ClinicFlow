# ClinicFlow — Comprehensive Manual Test Cases & QA Manual

**Document Version:** 1.0.0  
**Target Application:** Clinic Appointment Scheduling System  
**Specification Baseline:** `README.md` (10 Core Goals)  
**Execution Environment:** `http://localhost:3000` (or deployed staging URL)

---

## Standard Test Users & Credentials

| Role | Email | Password | Display Name / Specialization |
|---|---|---|---|
| **Front Desk** | `front_desk.one@clinic.test` | `password123` | Front Desk Receptionist |
| **Front Desk 2** | `front_desk.two@clinic.test` | `password123` | Secondary Receptionist |
| **Provider A** | `provider.alice@clinic.test` | `password123` | Dr. Alice Smith (Physical Therapy) |
| **Provider B** | `provider.bob@clinic.test` | `password123` | Dr. Bob Jones (General Practice) |
| **Provider C** | `provider.carol@clinic.test` | `password123` | Dr. Carol White (Orthopedics) |

---

## Summary Matrix

| Feature Area | Core Goal | Total Cases | Positive Cases | Negative / Boundary Cases |
|---|---|:---:|:---:|:---:|
| **1. Accounts & Roles** | Goal 1 | 6 | 3 | 3 |
| **2. Appointment Slots** | Goal 2 | 6 | 4 | 2 |
| **3. Visit Notes** | Goal 3 | 5 | 3 | 2 |
| **4. Appointment Status** | Goal 4 | 7 | 3 | 4 |
| **5. Care Team** | Goal 5 | 5 | 3 | 2 |
| **6. Finding Appointments** | Goal 6 | 7 | 5 | 2 |
| **7. Bulk Availability & CSV** | Goal 7 | 6 | 4 | 2 |
| **8. Dashboard** | Goal 8 | 6 | 5 | 1 |
| **9. Audit History (Immutable)** | Goal 9 | 5 | 3 | 2 |
| **10. Unconfirmed Alerts** | Goal 10 | 7 | 4 | 3 |
| **Total** | | **60** | **37** | **23** |

---

# Feature 1: Accounts and Roles (Goal 1)

> **Specification Rule:** People sign in with email/password. Front-desk staff can create availability slots for any provider, confirm/cancel any appointment, and reassign appointments between providers. Providers can only see and act on their own schedule, and cannot create slots for another provider or reassign an appointment away from themselves. Enforced on the server.

### TC-01: Front Desk Sign In & Unrestricted Dashboard
* **Type:** Positive
* **Preconditions:** Logged out.
* **Steps:**
  1. Navigate to `/login`.
  2. Enter `front_desk.one@clinic.test` / `password123` and submit.
* **Expected Result:**
  * Successfully redirected to `/`.
  * Header shows "Clinic Operations & Front Desk" with "Front Desk Roster" badge.
  * Role switcher allows toggling between "Front Desk View" and "Provider View".
  * Navigation bar shows links to Dashboard, Appointments, Schedule, Patients, and Alerts.

### TC-02: Provider Sign In & Scoped View
* **Type:** Positive
* **Preconditions:** Logged out.
* **Steps:**
  1. Navigate to `/login`.
  2. Enter `provider.alice@clinic.test` / `password123` and submit.
* **Expected Result:**
  * Successfully redirected to `/`.
  * Header shows "Dr. Alice Smith — Clinical Dashboard" with "Provider Practice" badge.
  * Metrics, patient intake, and queues are strictly scoped to Dr. Alice Smith.

### TC-03: Front Desk Reassigns Appointment to Another Provider
* **Type:** Positive
* **Preconditions:** Logged in as `front_desk.one@clinic.test`. An appointment exists assigned to Dr. Alice Smith.
* **Steps:**
  1. Navigate to `/appointments/[appointment-id]`.
  2. In the "Actions" card, click "Reassign provider".
  3. Select "Dr. Bob Jones" from the dropdown.
  4. Click "Transfer appointment".
* **Expected Result:**
  * Server action `reassignProviderAction` succeeds.
  * Page refreshes; primary provider updates to "Dr. Bob Jones".
  * Audit history timeline appends an immutable `PROVIDER_REASSIGNED` event recording old provider, new provider, and the receptionist actor.

### TC-04: Provider Blocked from Reassigning Appointment (Server Check)
* **Type:** Negative / Security
* **Preconditions:** Logged in as `provider.alice@clinic.test`.
* **Steps:**
  1. Navigate to an appointment where Dr. Alice is the provider: `/appointments/[id]`.
  2. Inspect UI: "Reassign provider" button is NOT rendered.
  3. Attempt to invoke `reassignProviderAction` via console or API request.
* **Expected Result:**
  * Server responds with error: `"Only front-desk staff can reassign appointments between providers."`
  * Appointment remains assigned to Dr. Alice.

### TC-05: Provider Cannot View Other Providers' Schedules (Tamper Test)
* **Type:** Negative / Boundary
* **Preconditions:** Logged in as `provider.alice@clinic.test`.
* **Steps:**
  1. Navigate to `/schedule`.
  2. Manually alter query string to request Bob's schedule: `/schedule?provider_id=<bob-uuid>`.
* **Expected Result:**
  * Server-side guard locks `providerId` to Alice's profile ID (`user.profile.id`).
  * The rendered day schedule continues to display Alice's schedule only; Bob's schedule is not revealed.

### TC-06: Provider Blocked from Generating Availability for Another Doctor
* **Type:** Negative / Security
* **Preconditions:** Logged in as `provider.alice@clinic.test`.
* **Steps:**
  1. Navigate to `/schedule`.
  2. Verify dropdown only displays Dr. Alice Smith.
  3. If manipulated to send `providerId: <bob-uuid>` to `generateAvailabilityAction`.
* **Expected Result:**
  * Server rejects execution with: `"Providers can only generate availability for themselves."`

---

# Feature 2: Appointment Slots (Goal 2)

> **Specification Rule:** Slots created with provider, date, start time, duration. Editable while unbooked. Once requested by a patient, record becomes an appointment. Slots can be archived and restored without destroying history.

### TC-07: Create Single Availability Slot
* **Type:** Positive
* **Preconditions:** Logged in as Front Desk or Provider Alice.
* **Steps:**
  1. Navigate to `/schedule`.
  2. In "Generate availability slots", select a single date, weekdays matching that date, 09:00 to 09:30, duration 30 min.
  3. Click "Generate availability".
* **Expected Result:**
  * Success message: "Successfully created 1 slot(s)."
  * Day schedule shows a green/neutral "Available" slot block from 09:00 to 09:30.

### TC-08: Edit Timing of an Unbooked Slot
* **Type:** Positive
* **Preconditions:** Unbooked slot exists at 09:00 (30 mins).
* **Steps:**
  1. Click on the slot to open `/appointments/[slot-id]`.
  2. Verify status is "Available slot" (`patient_id: null, status: null`).
  3. Under "Slot Management", click "Edit slot".
  4. Change start time from 09:00 to 10:00, duration to 45 mins.
  5. Click "Save changes".
* **Expected Result:**
  * Server action `editSlotAction` succeeds.
  * Page updates; slot now reflects 10:00–10:45 (45 min duration).
  * Audit trail appends `SLOT_EDITED` event.

### TC-09: Archive an Unbooked Slot
* **Type:** Positive
* **Preconditions:** Unbooked slot exists.
* **Steps:**
  1. Navigate to `/appointments/[slot-id]`.
  2. Under "Slot Management", click "Archive slot".
* **Expected Result:**
  * `archiveSlotAction` executes; sets `archived_at = now()`.
  * Page refreshes: Slot status updates to "Archived", and "Restore slot" button appears.
  * Navigating to `/schedule` confirms the slot is removed from the active schedule grid.

### TC-10: Restore an Archived Slot
* **Type:** Positive
* **Preconditions:** Slot is currently archived.
* **Steps:**
  1. Navigate to `/appointments/[archived-slot-id]`.
  2. Click "Restore slot".
* **Expected Result:**
  * `restoreSlotAction` clears `archived_at` and `archived_by`.
  * Audit event `SLOT_RESTORED` is recorded.
  * Slot reappears on the `/schedule` day grid.

### TC-11: Block Editing Once Slot Has Become an Appointment
* **Type:** Negative / Integrity
* **Preconditions:** Slot has been booked by a patient (`status: requested` or `confirmed`).
* **Steps:**
  1. Open the appointment at `/appointments/[id]`.
  2. Verify "Slot Management" (edit/archive controls) is NOT rendered for booked appointments.
  3. Attempt to invoke `editSlotAction` on this booked appointment ID.
* **Expected Result:**
  * Server returns error: `"Only unbooked availability slots can be edited."`

### TC-12: Block Archiving of Booked Appointments
* **Type:** Negative
* **Preconditions:** Active appointment with assigned patient.
* **Steps:**
  1. Attempt to execute `archiveSlotAction` on the booked appointment.
* **Expected Result:**
  * Server validator `validateSlotArchive` rejects the request with: `"Only available slots can be archived."`

---

# Feature 3: Visit Notes (Goal 3)

> **Specification Rule:** Every visit note belongs to exactly one appointment, recording observations as free text. Notes can be added and edited by the provider who wrote them. Notes displayed in chronological order.

### TC-13: Assigned Provider Adds Visit Note
* **Type:** Positive
* **Preconditions:** Logged in as `provider.alice@clinic.test`. Appointment is assigned to Dr. Alice.
* **Steps:**
  1. Open `/appointments/[id]`.
  2. In the "Visit notes" card, enter text: `"Patient reports improved mobility. Recommended home exercises 3x daily."`
  3. Click "Add visit note".
* **Expected Result:**
  * Note is saved in database.
  * Note renders immediately in the list with Dr. Alice Smith's name and current timestamp.
  * Audit event `NOTE_ADDED` is created.

### TC-14: Author Provider Edits Their Own Note
* **Type:** Positive
* **Preconditions:** Dr. Alice has written a note on `/appointments/[id]`. Logged in as Dr. Alice.
* **Steps:**
  1. Next to Dr. Alice's note, click the "Edit" button.
  2. Modify content to: `"Patient reports improved mobility and zero knee pain. Recommended home exercises 3x daily."`
  3. Click "Save note".
* **Expected Result:**
  * `editNoteAction` executes and updates note content.
  * Note renders updated content with an `(edited)` indicator.
  * Audit trail appends `NOTE_EDITED`.

### TC-15: Provider Blocked from Editing Another Doctor's Note
* **Type:** Negative / Permissions
* **Preconditions:** Logged in as `provider.bob@clinic.test`. An existing note was written by Dr. Alice.
* **Steps:**
  1. Bob opens the appointment.
  2. Check Bob's UI on Alice's note: No "Edit" button is rendered.
  3. Attempt to invoke `editNoteAction` passing Alice's note ID.
* **Expected Result:**
  * Server check `canEditNote` rejects the action with: `"Only the provider who wrote this visit note can edit it."`

### TC-16: Front Desk Staff Blocked from Adding Visit Notes
* **Type:** Negative / Role Guard
* **Preconditions:** Logged in as `front_desk.one@clinic.test`.
* **Steps:**
  1. Open `/appointments/[id]`.
  2. Inspect the "Visit notes" card.
* **Expected Result:**
  * Note input form is hidden.
  * UI displays: `"Only the primary or a supporting provider can add visit notes."`

### TC-17: Chronological Ordering of Multiple Notes
* **Type:** Positive
* **Preconditions:** Appointment has 3 notes written at different times (T1 = 09:00, T2 = 09:15, T3 = 09:30).
* **Steps:**
  1. Open `/appointments/[id]`.
  2. Observe list order.
* **Expected Result:**
  * Notes are strictly sorted chronologically (`orderBy: { createdAt: 'asc' }`), showing the progression of care.

---

# Feature 4: Appointment Status Lifecycle (Goal 4)

> **Specification Rule:** Flow: Requested $\rightarrow$ Confirmed $\rightarrow$ Checked In $\rightarrow$ Completed. No Show only from Confirmed, and only after scheduled time has passed. Cancellation permitted only before check-in and must include a reason. Illegal moves rejected by server with explanation.

### TC-18: Standard Lifecycle Progression (Happy Path)
* **Type:** Positive
* **Preconditions:** Logged in as Front Desk. An unbooked slot exists.
* **Steps:**
  1. Book slot for Patient $\rightarrow$ Status becomes **Requested**.
  2. Click "Confirm" button $\rightarrow$ Status becomes **Confirmed**.
  3. Click "Check in" button $\rightarrow$ Status becomes **Checked In**.
  4. Click "Complete" button $\rightarrow$ Status becomes **Completed**.
* **Expected Result:**
  * Each status badge updates in real time.
  * At "Completed", terminal state is reached: no further transition buttons appear.
  * Audit timeline logs each transition with actor attribution.

### TC-19: Mark No-Show After Scheduled Time Has Passed
* **Type:** Positive
* **Preconditions:** Confirmed appointment whose `scheduled_start` is in the past (e.g. 2 hours ago).
* **Steps:**
  1. Open `/appointments/[id]`.
  2. Click "Mark no show" button.
* **Expected Result:**
  * `transitionStatusAction` succeeds.
  * Status updates to **No Show**.
  * Audit event `STATUS_CHANGED` records `oldStatus: 'confirmed'`, `newStatus: 'no_show'`.

### TC-20: Block Marking No-Show Before Scheduled Time Has Passed
* **Type:** Negative / Exact Rule
* **Preconditions:** Confirmed appointment whose `scheduled_start` is in the future (e.g. tomorrow at 14:00).
* **Steps:**
  1. Open `/appointments/[id]`.
  2. Attempt to mark as No Show.
* **Expected Result:**
  * Server validator `validateTransition` rejects the action.
  * Error message displayed: `"Cannot mark an appointment as No Show before its scheduled time has passed."`
  * Status remains **Confirmed**.

### TC-21: Block Marking No-Show from Requested (Invalid Origin)
* **Type:** Negative
* **Preconditions:** Appointment is currently in **Requested** status.
* **Steps:**
  1. Attempt to transition directly to `no_show`.
* **Expected Result:**
  * Server rejects: `"Cannot move an appointment from "requested" to "no_show"."`

### TC-22: Cancel Appointment Before Check-In with Reason
* **Type:** Positive
* **Preconditions:** Appointment is in **Requested** or **Confirmed** status.
* **Steps:**
  1. Click "Cancel appointment".
  2. Enter cancellation reason: `"Patient requested reschedule due to illness."`
  3. Click "Confirm cancellation".
* **Expected Result:**
  * Status changes to **Cancelled**.
  * Cancellation banner appears showing reason: `"Patient requested reschedule due to illness."`
  * Audit timeline displays cancellation reason and who cancelled it.

### TC-23: Block Cancellation with Empty Reason
* **Type:** Negative
* **Preconditions:** Appointment in **Confirmed** status.
* **Steps:**
  1. Click "Cancel appointment".
  2. Leave reason empty or enter fewer than 3 characters (e.g. `"no"`).
  3. Click "Confirm cancellation".
* **Expected Result:**
  * Client/server validation triggers: `"Please provide a cancellation reason (at least 3 characters)."`
  * Appointment is NOT cancelled.

### TC-24: Block Cancellation After Patient Has Checked In
* **Type:** Negative / Strict Lifecycle
* **Preconditions:** Appointment is in **Checked In** status.
* **Steps:**
  1. View `/appointments/[id]`.
  2. Observe action buttons: "Cancel appointment" button is removed.
  3. Attempt to submit `cancelAppointmentAction` directly.
* **Expected Result:**
  * Server rejects with: `"Only requested or confirmed appointments can be cancelled."`
  * Appointment remains **Checked In**.

---

# Feature 5: Care Team & Supporting Providers (Goal 5)

> **Specification Rule:** One scheduling provider. Any number of supporting providers. A provider can be added to any number of appointments. Every provider can see one list of every appointment where they are scheduling or supporting.

### TC-25: Front Desk Adds Supporting Provider
* **Type:** Positive
* **Preconditions:** Logged in as `front_desk.one@clinic.test`. Appointment scheduled with Dr. Alice.
* **Steps:**
  1. Open `/appointments/[id]`.
  2. In "Care team", select "Dr. Bob Jones" and click "Add".
* **Expected Result:**
  * `assignSupportingProviderAction` succeeds.
  * Dr. Bob Jones appears in the care team pill list.
  * Audit timeline logs `SUPPORTING_PROVIDER_ADDED`.

### TC-26: Block Adding Primary Provider as Supporting Provider
* **Type:** Negative / Duplicate Prevention
* **Preconditions:** Primary provider is Dr. Alice.
* **Steps:**
  1. Attempt to add Dr. Alice as supporting provider on her own appointment.
* **Expected Result:**
  * Server responds: `"Provider is already the primary on this appointment."`

### TC-27: Front Desk Removes Supporting Provider
* **Type:** Positive
* **Preconditions:** Dr. Bob is a supporting provider on the appointment.
* **Steps:**
  1. Next to Dr. Bob's badge, click the remove (`×`) button.
* **Expected Result:**
  * Dr. Bob is removed from supporting providers.
  * Audit timeline logs `SUPPORTING_PROVIDER_REMOVED`.

### TC-28: Supporting Provider Sees Appointment in Their Appointments List
* **Type:** Positive / Scoping
* **Preconditions:** Dr. Bob was added as supporting provider on Dr. Alice's appointment.
* **Steps:**
  1. Log in as `provider.bob@clinic.test`.
  2. Navigate to `/appointments`.
* **Expected Result:**
  * Dr. Alice's appointment appears in Dr. Bob's appointments table because Bob is on the care team.

### TC-29: Provider Cannot Add Supporting Providers (Front Desk Only)
* **Type:** Negative
* **Preconditions:** Logged in as `provider.alice@clinic.test`.
* **Steps:**
  1. Open `/appointments/[id]`.
  2. Check "Care team" card: Dropdown to add providers is hidden (`canManage = false`).
  3. If invoked directly via server action.
* **Expected Result:**
  * Server rejects: `"Not authorized to assign supporting providers."`

---

# Feature 6: Finding Appointments (Goal 6)

> **Specification Rule:** Server-side search over patient name, filters for provider, status, date range (`from`/`to`), sorting by time, status, provider, and server-side pagination with total matches count.

### TC-30: Text Search Over Patient Name
* **Type:** Positive
* **Preconditions:** Patients "John Doe" and "Sarah Connor" exist.
* **Steps:**
  1. Navigate to `/appointments`.
  2. In Search box, type `"Sarah"` and click "Apply filters".
* **Expected Result:**
  * URL updates to `/appointments?search=Sarah`.
  * Table only displays appointments for Sarah Connor.
  * Subtitle shows matching count (e.g. "1 appointment found").

### TC-31: Filter by Status
* **Type:** Positive
* **Steps:**
  1. On `/appointments`, select Status: "Confirmed".
  2. Click "Apply filters".
* **Expected Result:**
  * Table only lists appointments with "Confirmed" status badge.

### TC-32: Filter by Date Range (`from` and `to`)
* **Type:** Positive
* **Steps:**
  1. Set `From date`: `2026-09-01`.
  2. Set `To date`: `2026-09-07`.
  3. Click "Apply filters".
* **Expected Result:**
  * Server queries `scheduledStart: { gte: 2026-09-01, lte: 2026-09-07 }`.
  * Only appointments falling within that week are returned.

### TC-33: Sort by Provider Name
* **Type:** Positive
* **Steps:**
  1. Select `Sort`: "Provider", `Order`: "Asc".
  2. Click "Apply filters".
* **Expected Result:**
  * Appointments are sorted alphabetically by doctor name (Alice $\rightarrow$ Bob $\rightarrow$ Carol).

### TC-34: Sort by Scheduled Time
* **Type:** Positive
* **Steps:**
  1. Select `Sort`: "Time", `Order`: "Desc".
* **Expected Result:**
  * Appointments sorted latest start time first.

### TC-35: Server Pagination Navigation
* **Type:** Positive
* **Preconditions:** Over 20 appointments match the filter.
* **Steps:**
  1. Scroll to bottom of table.
  2. Observe "Showing 1–20 of X".
  3. Click page "2".
* **Expected Result:**
  * URL updates to `/appointments?page=2`.
  * Page 2 results load with "Showing 21–...".

### TC-36: Filter Reset
* **Type:** Positive
* **Steps:**
  1. From a filtered search view, click "Reset".
* **Expected Result:**
  * Returns to `/appointments` with all default filters restored.

---

# Feature 7: Bulk Availability & CSV Export (Goal 7)

> **Specification Rule:** Generate recurring weekly patterns across date ranges. Report created count and skipped count due to collisions with existing bookings. Export single day schedule as CSV.

### TC-37: Generate Clean Bulk Availability
* **Type:** Positive
* **Preconditions:** Dr. Alice has no appointments next Monday.
* **Steps:**
  1. Navigate to `/schedule`.
  2. Select Provider: Dr. Alice Smith.
  3. Date range: Next Monday to Next Monday.
  4. Weekdays: Mon checked.
  5. Time: 09:00 to 11:00, duration: 30m, gap: 0.
  6. Click "Generate availability".
* **Expected Result:**
  * 4 slots created (09:00, 09:30, 10:00, 10:30).
  * Banner displays: `"Successfully created 4 slot(s)."`

### TC-38: Collision Detection & Skipped Count Reporting
* **Type:** Positive / Collision
* **Preconditions:** An existing booked appointment exists next Monday at 09:30–10:00.
* **Steps:**
  1. Run bulk availability for the same Monday from 09:00 to 11:00 (4 requested slots).
  2. Click "Generate availability".
* **Expected Result:**
  * Slot 09:30 collides with the booked appointment.
  * Server skips the 09:30 slot and creates the other 3 (09:00, 10:00, 10:30).
  * Result message explicitly reports:  
    `"Successfully created 3 slot(s), skipped 1 slot(s) colliding with existing bookings."`

### TC-39: Cross-Midnight or Inverted Time Rejection
* **Type:** Negative / Validation
* **Steps:**
  1. Set Start Time: `17:00`, End Time: `09:00`.
  2. Click "Generate availability".
* **Expected Result:**
  * Validation fails with: `"Start time must be before end time."`

### TC-40: Inverted Date Range Rejection
* **Type:** Negative / Validation
* **Steps:**
  1. Set Start Date: `2026-09-10`, End Date: `2026-09-01`.
* **Expected Result:**
  * Validation fails with: `"Start date must be on or before end date."`

### TC-41: Export Single Day Schedule as CSV
* **Type:** Positive
* **Steps:**
  1. On `/schedule`, select Dr. Alice and date `2026-09-02`.
  2. Click "Export day CSV" button.
* **Expected Result:**
  * Browser downloads file: `schedule-<alice-uuid>-2026-09-02.csv`.
  * Response header: `Content-Type: text/csv; charset=utf-8`.
  * File header: `date,start,end,duration_minutes,provider,patient,status`.
  * Rows correspond exactly to appointments on that date.

### TC-42: CSV RFC-4180 Escaping (Commas/Quotes in Names)
* **Type:** Boundary
* **Preconditions:** Patient named `Doe, Jr., "Johnny"`.
* **Steps:**
  1. Export schedule containing this patient.
  2. Inspect CSV content in a text editor.
* **Expected Result:**
  * Patient field is correctly escaped with surrounding double-quotes: `"Doe, Jr., ""Johnny"""`.

---

# Feature 8: Dashboard (Goal 8)

> **Specification Rule:** Headline numbers (appointments today, checked-in right now, no-shows this week, confirmed upcoming). Breakdown by provider and status. 8-week weekly no-show rate chart.

### TC-43: Headline Numbers Display
* **Type:** Positive
* **Steps:**
  1. Open `/` as Front Desk.
  2. Inspect the 4 Hero KPI Cards.
* **Expected Result:**
  * Today's Intake: Total scheduled today with progress bar against capacity.
  * Show-Up Adherence: Percentage with positive/negative trend indicator.
  * Patient Roster: Registered patient count and active providers count.
  * Escalation Alerts: Urgent unconfirmed appointment count.

### TC-44: Dense Status Breakdown Strip
* **Type:** Positive
* **Steps:**
  1. Observe status pills below KPI cards.
* **Expected Result:**
  * Shows chips for Requested, Confirmed, Checked In, Completed, No Show, Available with accurate live counts.

### TC-45: EvilCharts 8-Week Analytics (Bar vs Wave Toggle)
* **Type:** Positive / UI
* **Steps:**
  1. Locate the main analytics chart.
  2. Click "Grouped Bars".
  3. Click "Smooth Wave".
* **Expected Result:**
  * Seamlessly toggles between grouped rounded bars and smooth gradient area wave.
  * Hovering any data point displays glassmorphic card with Completed count, No-Shows, and show-up percentage.

### TC-46: Series Filter (All, Completed, No-Shows)
* **Type:** Positive
* **Steps:**
  1. Click "Completed" pill above chart.
  2. Click "No-Shows" pill.
* **Expected Result:**
  * Chart dynamically isolates the selected series without reloading the page.

### TC-47: Attendance Donut Ring & Sparkline
* **Type:** Positive
* **Steps:**
  1. Inspect the right-hand column of Row 1.
* **Expected Result:**
  * Donut chart displays circular completion ring with centered visit count and growth badge.
  * Monthly volume sparkline shows curved spline with month-over-month trend.

### TC-48: Provider Mode Switcher
* **Type:** Positive
* **Steps:**
  1. From Front Desk view, click "Provider View".
  2. Select "Dr. Alice Smith" from the doctor dropdown.
* **Expected Result:**
  * Dashboard re-aggregates metrics specifically for Dr. Alice.
  * Patient queue table switches to provider mode with direct "Document Notes" actions.

---

# Feature 9: Immutable Audit History (Goal 9)

> **Specification Rule:** Timeline showing every status change (old/new status, actor), every supporting provider assignment/unassignment, every cancellation with reason, every note added/edited with author and timestamp. Cannot be edited or deleted by anyone.

### TC-49: Audit Event Append on Status Transition
* **Type:** Positive
* **Steps:**
  1. Transition an appointment from Requested $\rightarrow$ Confirmed.
  2. Check "Audit history" timeline on `/appointments/[id]`.
* **Expected Result:**
  * Timeline shows new entry: "Status changed from requested to confirmed" with actor name and exact time.

### TC-50: Cancellation Event with Preserved Reason
* **Type:** Positive
* **Steps:**
  1. Cancel an appointment with reason: `"Provider emergency leave."`
  2. Check timeline.
* **Expected Result:**
  * Entry displayed with red indicator: `"Appointment cancelled by [Actor]"` and `"Reason: Provider emergency leave."`

### TC-51: Care Team Event Logs
* **Type:** Positive
* **Steps:**
  1. Add Dr. Bob as supporting provider, then remove him.
  2. Check timeline.
* **Expected Result:**
  * Two sequential events logged:
    1. `"Supporting provider added: Dr. Bob Jones by [Actor]"`
    2. `"Supporting provider removed: Dr. Bob Jones by [Actor]"`

### TC-52: Audit Immutability Test (No Update/Delete Endpoints)
* **Type:** Negative / Security
* **Steps:**
  1. Inspect database schema and application actions for any `delete` or `update` on `AppointmentAuditEvent`.
* **Expected Result:**
  * No mutation or deletion API or server action exists for audit logs.
  * Audit records remain permanently stored in PostgreSQL.

### TC-53: Front Desk Cannot Delete or Alter Audit Trail
* **Type:** Security
* **Preconditions:** Logged in as `front_desk.one@clinic.test`.
* **Steps:**
  1. Inspect the Timeline UI.
* **Expected Result:**
  * No edit, delete, or hide buttons exist on timeline events for any role.

---

# Feature 10: Unconfirmed Alerts (Goal 10)

> **Specification Rule:** Appointments in Requested status within 24 hours appear in alerts with count badge visible to front desk. Front desk can dismiss. If still unconfirmed 1 hour before scheduled time, the alert reappears regardless of dismissal.

### TC-54: Alert Appears Within 24-Hour Window
* **Type:** Positive
* **Preconditions:** Appointment in **Requested** status scheduled 18 hours from now.
* **Steps:**
  1. Log in as Front Desk.
  2. Check dashboard and navbar.
* **Expected Result:**
  * Amber alert badge displays active count.
  * Navigating to `/alerts` lists the appointment with patient name, provider, and start time.

### TC-55: Alert Does NOT Appear Outside 24-Hour Window
* **Type:** Boundary
* **Preconditions:** Appointment in **Requested** status scheduled 36 hours from now.
* **Steps:**
  1. Check `/alerts`.
* **Expected Result:**
  * Appointment is NOT listed (outside the 24-hour alert threshold).

### TC-56: Front Desk Dismisses an Alert
* **Type:** Positive
* **Preconditions:** Appointment in alerts queue (e.g. 10 hours before start).
* **Steps:**
  1. On `/alerts`, click "Dismiss" next to the appointment.
* **Expected Result:**
  * `dismissAlertAction` records dismissal timestamp and user ID.
  * Appointment disappears from the active alerts list.
  * Alert counter badge decrements by 1.

### TC-57: Reappearance Rule at 1-Hour Threshold
* **Type:** Positive / Exact Rule
* **Preconditions:** Appointment was previously dismissed by front desk at 10 hours before start time.
* **Steps:**
  1. Advance clock or test appointment where `scheduled_start` is 45 minutes from now.
  2. Appointment is still in **Requested** status.
  3. Check `/alerts`.
* **Expected Result:**
  * In accordance with the 1-hour reappearance rule (`minutesUntil <= 60`), the appointment **reappears** in the alerts queue, overriding the previous dismissal.

### TC-58: Alert Clears Once Appointment is Confirmed
* **Type:** Positive
* **Preconditions:** Appointment is currently in `/alerts`.
* **Steps:**
  1. Front desk opens appointment and clicks "Confirm".
  2. Return to `/alerts`.
* **Expected Result:**
  * Because status is now `confirmed` (no longer `requested`), it is permanently removed from the alerts list.

### TC-59: Providers Cannot Dismiss Alerts
* **Type:** Negative / Role Guard
* **Preconditions:** Logged in as `provider.alice@clinic.test`.
* **Steps:**
  1. Navigate to `/alerts`.
* **Expected Result:**
  * "Dismiss" action buttons are not rendered (`canDismiss = false`).
  * Attempting to call `dismissAlertAction` fails with `"Not authorized to dismiss alerts."`

### TC-60: Past Appointments Do Not Appear in Alerts
* **Type:** Boundary
* **Preconditions:** Appointment in `requested` status whose scheduled time was 1 hour ago.
* **Steps:**
  1. Check `/alerts`.
* **Expected Result:**
  * Not displayed (`minutesUntil <= 0` check in `isUnconfirmedAlert` excludes past appointments).
