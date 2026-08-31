export type UserRole = 'front_desk' | 'provider';

export type AppointmentStatus =
  | 'requested'
  | 'confirmed'
  | 'checked_in'
  | 'completed'
  | 'no_show'
  | 'cancelled';

export type AuditEventType =
  | 'STATUS_CHANGED'
  | 'SUPPORTING_PROVIDER_ADDED'
  | 'SUPPORTING_PROVIDER_REMOVED'
  | 'CANCELLED'
  | 'NOTE_ADDED'
  | 'SLOT_CREATED'
  | 'SLOT_ARCHIVED';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  provider_id: string;
  patient_id: string | null;
  scheduled_start: string;
  duration_minutes: number;
  status: AppointmentStatus | null;
  cancellation_reason: string | null;
  archived_at: string | null;
  archived_by: string | null;
  alert_dismissed_at: string | null;
  alert_dismissed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppointmentSupportingProvider {
  appointment_id: string;
  provider_id: string;
  assigned_by: string;
  assigned_at: string;
}

export interface VisitNote {
  id: string;
  appointment_id: string;
  author_provider_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface AppointmentAuditEvent {
  id: string;
  appointment_id: string;
  event_type: AuditEventType;
  actor_id: string | null;
  old_status: string | null;
  new_status: string | null;
  supporting_provider_id: string | null;
  cancellation_reason: string | null;
  note_id: string | null;
  metadata: unknown | null;
  created_at: string;
}

export interface VisitNoteWithAuthor extends VisitNote {
  author: Profile;
}

export interface AppointmentWithRelations extends Appointment {
  patient: Patient | null;
  provider: Profile;
  supporting_providers: Profile[];
  visit_notes: VisitNoteWithAuthor[];
}

export interface AuditEventWithActor extends AppointmentAuditEvent {
  actor: Profile | null;
  supporting_provider: Profile | null;
  note: VisitNote | null;
}

export interface AppointmentListItem extends Appointment {
  patient: Patient | null;
  provider: Profile;
}