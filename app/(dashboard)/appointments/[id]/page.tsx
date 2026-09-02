import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireAuth } from '@/lib/auth/require-auth';
import { getAppointment } from '@/lib/appointments/queries';
import { getAppointmentAudit } from '@/lib/audit/queries';
import { listProviders } from '@/lib/providers/queries';
import { listPatients } from '@/lib/patients/queries';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AppointmentActions } from '@/components/appointments/AppointmentActions';
import { BookSlotForm } from '@/components/appointments/BookSlotForm';
import { SlotControls } from '@/components/appointments/SlotControls';
import { AddNoteForm } from '@/components/appointments/AddNoteForm';
import { VisitNoteItem } from '@/components/appointments/VisitNoteItem';
import { SupportingProvidersForm } from '@/components/appointments/SupportingProvidersForm';
import { Timeline } from '@/components/appointments/Timeline';
import { formatDate, formatTime } from '@/lib/utils/dates';

type Props = { params: Promise<{ id: string }> };

export default async function AppointmentDetailPage({ params }: Props) {
  const user = await requireAuth();
  const { id } = await params;

  const [appointment, events, providers, patientsPage] = await Promise.all([
    getAppointment(id),
    getAppointmentAudit(id),
    listProviders(),
    listPatients({ page: 1, pageSize: 100 }),
  ]);

  if (!appointment) notFound();

  const isSlot = appointment.patient_id === null && appointment.status === null;
  const canAssignSupporting = user.profile.role === 'front_desk';
  const canAddNote =
    user.profile.role === 'provider' &&
    (appointment.provider_id === user.id ||
      appointment.supporting_providers.some((p) => p.id === user.id));

  const endTime = new Date(
    new Date(appointment.scheduled_start).getTime() + appointment.duration_minutes * 60_000,
  );

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-[#9ca3af]">
        <Link href="/appointments" className="hover:text-[#374151] transition-colors">Appointments</Link>
        <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-[#374151] font-medium">
          {isSlot ? 'Available slot' : appointment.patient?.full_name ?? 'Appointment'}
        </span>
      </nav>

      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111111] tracking-tight">
            {isSlot ? 'Available slot' : appointment.patient?.full_name ?? 'Unknown patient'}
          </h1>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-[#6b7280]">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatDate(appointment.scheduled_start)} · {formatTime(appointment.scheduled_start)}–{formatTime(endTime)}
            <span className="mx-1">·</span>
            {appointment.provider.full_name}
          </p>
        </div>
        <StatusBadge status={appointment.status} />
      </div>

      {/* Actions card */}
      <Card>
        <CardHeader>
          <CardTitle>{isSlot ? 'Book this slot' : 'Actions'}</CardTitle>
        </CardHeader>
        <CardBody>
          {isSlot ? (
            <div className="space-y-4">
              {user.profile.role === 'front_desk' ? (
                <BookSlotForm appointmentId={appointment.id} patients={patientsPage.rows} />
              ) : (
                <p className="text-sm text-[#6b7280]">
                  This slot is available. Front-desk staff can book it.
                </p>
              )}
              <SlotControls
                appointment={{
                  id: appointment.id,
                  scheduled_start: appointment.scheduled_start,
                  duration_minutes: appointment.duration_minutes,
                  provider_id: appointment.provider_id,
                  archived_at: appointment.archived_at,
                }}
                currentUser={{ id: user.id, role: user.profile.role }}
              />
            </div>
          ) : (
            <AppointmentActions
              appointment={{
                id: appointment.id,
                status: appointment.status,
                provider_id: appointment.provider_id,
              }}
              currentUser={{ id: user.id, role: user.profile.role }}
              providers={providers}
            />
          )}

          {appointment.status === 'cancelled' && appointment.cancellation_reason && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Cancellation reason</p>
                <p className="mt-0.5 text-sm text-red-700">{appointment.cancellation_reason}</p>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Details grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {/* Patient card */}
          {!isSlot && appointment.patient && (
            <Card>
              <CardHeader>
                <CardTitle>Patient</CardTitle>
                <Link href={`/patients/${appointment.patient_id}`} className="text-xs font-medium text-[#6b7280] hover:text-[#111111] transition-colors">
                  View profile →
                </Link>
              </CardHeader>
              <CardBody>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700">
                    {appointment.patient.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-[#111111]">{appointment.patient.full_name}</p>
                    <p className="text-xs text-[#6b7280] mt-0.5">
                      {[appointment.patient.email, appointment.patient.phone].filter(Boolean).join(' · ') || 'No contact details'}
                    </p>
                    {appointment.patient.date_of_birth && (
                      <p className="text-xs text-[#9ca3af] mt-0.5">
                        DOB {formatDate(appointment.patient.date_of_birth)}
                      </p>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Supporting providers */}
          <Card>
            <CardHeader>
              <CardTitle>Care team</CardTitle>
            </CardHeader>
            <CardBody>
              <SupportingProvidersForm
                appointmentId={appointment.id}
                primaryProviderId={appointment.provider_id}
                currentProviderIds={appointment.supporting_providers.map((p) => p.id)}
                providers={providers}
                canManage={canAssignSupporting}
              />
            </CardBody>
          </Card>

          {/* Visit notes */}
          {!isSlot && (
            <Card>
              <CardHeader>
                <CardTitle>Visit notes</CardTitle>
                <span className="text-xs text-[#9ca3af]">{appointment.visit_notes.length} note{appointment.visit_notes.length === 1 ? '' : 's'}</span>
              </CardHeader>
              <CardBody className="space-y-3">
                {appointment.visit_notes.length === 0 && (
                  <p className="text-sm text-[#9ca3af]">No notes yet.</p>
                )}
                {appointment.visit_notes.map((note) => (
                  <VisitNoteItem
                    key={note.id}
                    note={note}
                    currentUserId={user.id}
                  />
                ))}
                {canAddNote ? (
                  <AddNoteForm appointmentId={appointment.id} />
                ) : (
                  <p className="text-xs text-[#9ca3af]">
                    Only the primary or a supporting provider can add visit notes.
                  </p>
                )}
              </CardBody>
            </Card>
          )}
        </div>

        {/* Audit timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Audit history</CardTitle>
          </CardHeader>
          <CardBody>
            <Timeline events={events} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}