import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth/require-auth';
import { getAppointment } from '@/lib/appointments/queries';
import { getAppointmentAudit } from '@/lib/audit/queries';
import { listProviders } from '@/lib/providers/queries';
import { listPatients } from '@/lib/patients/queries';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AppointmentActions } from '@/components/appointments/AppointmentActions';
import { BookSlotForm } from '@/components/appointments/BookSlotForm';
import { AddNoteForm } from '@/components/appointments/AddNoteForm';
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

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {isSlot ? 'Available slot' : appointment.patient?.full_name ?? 'Unknown patient'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {formatDate(appointment.scheduled_start)} · {formatTime(appointment.scheduled_start)}
            {' – '}
            {formatTime(
              new Date(
                new Date(appointment.scheduled_start).getTime() +
                  appointment.duration_minutes * 60_000,
              ),
            )}
            {' · '}
            {appointment.provider.full_name}
          </p>
        </div>
        <StatusBadge status={appointment.status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isSlot ? 'Book this slot' : 'Appointment actions'}</CardTitle>
        </CardHeader>
        <CardBody>
          {isSlot ? (
            user.profile.role === 'front_desk' ? (
              <BookSlotForm appointmentId={appointment.id} patients={patientsPage.rows} />
            ) : (
              <p className="text-sm text-slate-500">
                This slot is available. Front-desk staff can book it.
              </p>
            )
          ) : (
            <AppointmentActions
              appointment={{
                id: appointment.id,
                status: appointment.status,
                provider_id: appointment.provider_id,
              }}
              currentUser={{ id: user.id, role: user.profile.role }}
            />
          )}

          {appointment.status === 'cancelled' && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              Cancellation reason: {appointment.cancellation_reason}
            </p>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          {!isSlot && appointment.patient && (
            <Card>
              <CardHeader>
                <CardTitle>Patient</CardTitle>
              </CardHeader>
              <CardBody className="space-y-1 text-sm">
                <p className="font-medium text-slate-900">{appointment.patient.full_name}</p>
                <p className="text-slate-500">
                  {[appointment.patient.email, appointment.patient.phone]
                    .filter(Boolean)
                    .join(' · ') || 'No contact details'}
                </p>
                {appointment.patient.date_of_birth && (
                  <p className="text-slate-500">
                    DOB {formatDate(appointment.patient.date_of_birth)}
                  </p>
                )}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Supporting providers</CardTitle>
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

          <Card>
            <CardHeader>
              <CardTitle>Visit notes</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {appointment.visit_notes.length === 0 && (
                  <p className="text-sm text-slate-500">No notes yet.</p>
                )}
                {appointment.visit_notes.map((note) => (
                  <div key={note.id} className="rounded-md bg-slate-50 p-3">
                    <p className="text-sm text-slate-800">{note.content}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {note.author.full_name} · {formatDate(note.created_at)}
                    </p>
                  </div>
                ))}
                {canAddNote ? (
                  <AddNoteForm appointmentId={appointment.id} />
                ) : (
                  <p className="text-xs text-slate-400">
                    Only the primary or a supporting provider can add visit notes.
                  </p>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
          </CardHeader>
          <CardBody>
            <Timeline events={events} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}