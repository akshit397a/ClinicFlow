import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth/require-auth';
import type { AppointmentListItem } from '@/lib/db/types';
import { getPatient } from '@/lib/patients/queries';
import { getAppointmentsForPatient } from '@/lib/appointments/queries';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PatientForm } from '@/components/patients/PatientForm';
import { formatDate, formatDateTime } from '@/lib/utils/dates';

type Props = { params: Promise<{ id: string }> };

export default async function PatientDetailPage({ params }: Props) {
  const user = await requireAuth();
  const { id } = await params;

  const [patient, appointments] = await Promise.all([
    getPatient(id),
    getAppointmentsForPatient(id),
  ]);

  if (!patient) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-xl font-semibold">{patient.full_name}</h1>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardBody className="space-y-1 text-sm">
            <p className="text-slate-600">{patient.email ?? 'No email'}</p>
            <p className="text-slate-600">{patient.phone ?? 'No phone'}</p>
            <p className="text-slate-600">
              {patient.date_of_birth ? `DOB ${formatDate(patient.date_of_birth)}` : 'No date of birth'}
            </p>
          </CardBody>
        </Card>

        {user.profile.role === 'front_desk' && (
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Edit</CardTitle>
            </CardHeader>
            <CardBody>
              <PatientForm
                mode="edit"
                patientId={patient.id}
                initial={{
                  fullName: patient.full_name,
                  email: patient.email ?? '',
                  phone: patient.phone ?? '',
                  dateOfBirth: patient.date_of_birth ?? '',
                }}
              />
            </CardBody>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appointment history</CardTitle>
        </CardHeader>
        <CardBody>
          {appointments.length === 0 ? (
            <p className="text-sm text-slate-500">No appointments on record.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {appointments.map((appointment: AppointmentListItem) => (
                <li key={appointment.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <Link
                      href={`/appointments/${appointment.id}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      {formatDateTime(appointment.scheduled_start)}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {appointment.provider.full_name}
                      {appointment.cancellation_reason && ` · ${appointment.cancellation_reason}`}
                    </p>
                  </div>
                  <StatusBadge status={appointment.status} />
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}