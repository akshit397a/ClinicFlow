import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

const USERS = [
  {
    id: '44444444-4444-4444-4444-444444444444',
    email: 'front_desk.one@clinic.test',
    fullName: 'Front Desk One',
    role: 'front_desk',
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    email: 'front_desk.two@clinic.test',
    fullName: 'Front Desk Two',
    role: 'front_desk',
  },
  {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'provider.alice@clinic.test',
    fullName: 'Alice Smith',
    role: 'provider',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'provider.bob@clinic.test',
    fullName: 'Bob Nguyen',
    role: 'provider',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'provider.carol@clinic.test',
    fullName: 'Carol Gomez',
    role: 'provider',
  },
];

const PATIENTS = [
  { id: '10000000-0000-0000-0000-000000000001', fullName: 'Maya Rodriguez', email: 'maya.rodriguez@example.com', phone: '+1 555-0101', dateOfBirth: new Date('1988-04-12') },
  { id: '10000000-0000-0000-0000-000000000002', fullName: 'James Chen', email: 'james.chen@example.com', phone: '+1 555-0102', dateOfBirth: new Date('1992-11-03') },
  { id: '10000000-0000-0000-0000-000000000003', fullName: 'Priya Patel', email: 'priya.patel@example.com', phone: '+1 555-0103', dateOfBirth: new Date('1975-02-27') },
  { id: '10000000-0000-0000-0000-000000000004', fullName: "Liam O'Connor", email: 'liam.oconnor@example.com', phone: '+1 555-0104', dateOfBirth: new Date('2001-07-19') },
  { id: '10000000-0000-0000-0000-000000000005', fullName: 'Sofia Martinez', email: 'sofia.martinez@example.com', phone: '+1 555-0105', dateOfBirth: new Date('1984-09-30') },
  { id: '10000000-0000-0000-0000-000000000006', fullName: 'Ethan Brooks', email: 'ethan.brooks@example.com', phone: '+1 555-0106', dateOfBirth: new Date('1997-01-22') },
  { id: '10000000-0000-0000-0000-000000000007', fullName: 'Amelia Foster', email: 'amelia.foster@example.com', phone: '+1 555-0107', dateOfBirth: new Date('1969-12-08') },
  { id: '10000000-0000-0000-0000-000000000008', fullName: 'Noah Kim', email: 'noah.kim@example.com', phone: '+1 555-0108', dateOfBirth: new Date('1990-06-15') },
];

async function main() {
  console.log('🌱 Starting database seed with Prisma & Supabase Auth...');

  // 1. Auth Users in Supabase
  if (supabaseAdmin) {
    console.log('Ensuring auth users in Supabase Auth...');
    for (const u of USERS) {
      try {
        await supabaseAdmin.auth.admin.createUser({
          id: u.id,
          email: u.email,
          password: 'password123',
          email_confirm: true,
          user_metadata: { full_name: u.fullName, role: u.role },
        });
      } catch {
        // user already exists
      }
    }
  }

  // 2. Profiles in Prisma
  console.log('Upserting profiles...');
  for (const u of USERS) {
    await prisma.profile.upsert({
      where: { id: u.id },
      update: { email: u.email, fullName: u.fullName, role: u.role },
      create: { id: u.id, email: u.email, fullName: u.fullName, role: u.role },
    });
  }

  // 3. Patients
  console.log('Upserting patients...');
  for (const p of PATIENTS) {
    await prisma.patient.upsert({
      where: { id: p.id },
      update: { fullName: p.fullName, email: p.email, phone: p.phone, dateOfBirth: p.dateOfBirth },
      create: { id: p.id, fullName: p.fullName, email: p.email, phone: p.phone, dateOfBirth: p.dateOfBirth },
    });
  }

  // Clean existing dependent data for clean seed
  console.log('Clearing old appointments & notes...');
  await prisma.appointmentAuditEvent.deleteMany();
  await prisma.visitNote.deleteMany();
  await prisma.appointmentSupportingProvider.deleteMany();
  await prisma.appointment.deleteMany();

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const appointmentsToCreate: any[] = [];
  const auditEventsToCreate: any[] = [];

  // 4. Historical 8 weeks appointments
  console.log('Generating 8 weeks history...');
  const providers = USERS.filter((u) => u.role === 'provider');

  for (const provider of providers) {
    for (let w = 1; w <= 8; w++) {
      for (let d = 0; d < 2; d++) {
        for (let s = 0; s < 3; s++) {
          const patientIndex = ((w * 6) + (d * 3) + s) % PATIENTS.length;
          const patient = PATIENTS[patientIndex];
          const isNoShow = ((w * 6) + (d * 3) + s) % 4 === 0;

          const date = new Date(startOfDay.getTime() - (8 - w + 1) * 7 * 86400000 + d * 2 * 86400000 + (9 + s) * 3600000);
          const apptId = randomUUID();

          appointmentsToCreate.push({
            id: apptId,
            providerId: provider.id,
            patientId: patient.id,
            scheduledStart: date,
            durationMinutes: 30,
            status: isNoShow ? 'no_show' : 'completed',
            createdAt: new Date(date.getTime() - 2 * 86400000),
          });

          auditEventsToCreate.push({
            id: randomUUID(),
            appointmentId: apptId,
            eventType: 'STATUS_CHANGED',
            actorId: '44444444-4444-4444-4444-444444444444',
            oldStatus: null,
            newStatus: isNoShow ? 'no_show' : 'completed',
            createdAt: new Date(date.getTime() - 2 * 86400000),
          });
        }
      }
    }
  }

  // 5. Today's schedules
  console.log("Generating today's schedules...");
  const aliceId = '11111111-1111-1111-1111-111111111111';
  const bobId = '22222222-2222-2222-2222-222222222222';
  const carolId = '33333333-3333-3333-3333-333333333333';

  const alice8amId = randomUUID();
  const alice830amId = randomUUID();
  const alice930amId = randomUUID();
  const bobConfirmedId = randomUUID();
  const carolRequestedId = randomUUID();

  const specificAppts = [
    { id: alice8amId, providerId: aliceId, patientId: PATIENTS[0].id, hour: 8, min: 0, status: 'completed' },
    { id: alice830amId, providerId: aliceId, patientId: PATIENTS[1].id, hour: 8, min: 30, status: 'completed' },
    { id: randomUUID(), providerId: aliceId, patientId: PATIENTS[2].id, hour: 9, min: 0, status: 'completed' },
    { id: alice930amId, providerId: aliceId, patientId: PATIENTS[3].id, hour: 9, min: 30, status: 'checked_in' },
    { id: randomUUID(), providerId: aliceId, patientId: PATIENTS[4].id, hour: 10, min: 0, status: 'confirmed' },
    { id: randomUUID(), providerId: aliceId, patientId: PATIENTS[5].id, hour: 11, min: 0, status: 'confirmed' },
    { id: randomUUID(), providerId: aliceId, patientId: PATIENTS[6].id, hour: 12, min: 0, status: 'requested' },
    {
      id: randomUUID(),
      providerId: aliceId,
      patientId: PATIENTS[7].id,
      hour: 13,
      min: 0,
      status: 'requested',
      alertDismissedAt: new Date(now.getTime() - 5 * 3600000),
      alertDismissedById: '44444444-4444-4444-4444-444444444444',
    },
    { id: randomUUID(), providerId: aliceId, patientId: null, hour: 15, min: 0, status: null },
    { id: randomUUID(), providerId: aliceId, patientId: null, hour: 16, min: 0, status: null },

    // Bob
    { id: randomUUID(), providerId: bobId, patientId: PATIENTS[0].id, scheduledStart: new Date(now.getTime() - 3 * 3600000), status: 'completed' },
    { id: bobConfirmedId, providerId: bobId, patientId: PATIENTS[2].id, scheduledStart: new Date(now.getTime() + 2 * 3600000), status: 'confirmed' },
    { id: randomUUID(), providerId: bobId, patientId: PATIENTS[3].id, scheduledStart: new Date(now.getTime() + 4 * 3600000), status: 'requested', alertDismissedAt: new Date(now.getTime() - 6 * 3600000), alertDismissedById: '44444444-4444-4444-4444-444444444444' },
    { id: randomUUID(), providerId: bobId, patientId: null, scheduledStart: new Date(now.getTime() + 5 * 3600000), status: null },

    // Carol
    { id: carolRequestedId, providerId: carolId, patientId: PATIENTS[4].id, scheduledStart: new Date(now.getTime() + 40 * 60000), status: 'requested', alertDismissedAt: new Date(now.getTime() - 2 * 3600000), alertDismissedById: '44444444-4444-4444-4444-444444444444' },
    { id: randomUUID(), providerId: carolId, patientId: null, scheduledStart: new Date(now.getTime() + 3 * 3600000), status: null },
  ];

  for (const s of specificAppts) {
    const time = s.scheduledStart || new Date(startOfDay.getTime() + (s.hour || 0) * 3600000 + (s.min || 0) * 60000);
    appointmentsToCreate.push({
      id: s.id,
      providerId: s.providerId,
      patientId: s.patientId,
      scheduledStart: time,
      durationMinutes: 30,
      status: s.status,
      alertDismissedAt: s.alertDismissedAt || null,
      alertDismissedById: s.alertDismissedById || null,
      createdAt: new Date(now.getTime() - 24 * 3600000),
    });

    auditEventsToCreate.push({
      id: randomUUID(),
      appointmentId: s.id,
      eventType: s.patientId ? 'STATUS_CHANGED' : 'SLOT_CREATED',
      actorId: s.patientId ? '44444444-4444-4444-4444-444444444444' : s.providerId,
      oldStatus: null,
      newStatus: s.status,
      createdAt: new Date(now.getTime() - 24 * 3600000),
    });
  }

  // 6. Future slots
  console.log('Generating future slots for 5 days...');
  for (const provider of providers) {
    for (let dayOffset = 1; dayOffset <= 5; dayOffset++) {
      const slotDay = new Date(startOfDay.getTime() + dayOffset * 86400000);
      const hours = [9, 10, 11, 13, 14, 15, 16];
      for (const hour of hours) {
        const slotTime = new Date(slotDay.getTime() + hour * 3600000);
        const slotId = randomUUID();
        appointmentsToCreate.push({
          id: slotId,
          providerId: provider.id,
          patientId: null,
          scheduledStart: slotTime,
          durationMinutes: 30,
          status: null,
          createdAt: now,
        });
        auditEventsToCreate.push({
          id: randomUUID(),
          appointmentId: slotId,
          eventType: 'SLOT_CREATED',
          actorId: provider.id,
          oldStatus: null,
          newStatus: null,
          createdAt: now,
        });
      }
    }
  }

  console.log(`Inserting ${appointmentsToCreate.length} appointments in batch...`);
  await prisma.appointment.createMany({ data: appointmentsToCreate });

  console.log(`Inserting ${auditEventsToCreate.length} audit events in batch...`);
  await prisma.appointmentAuditEvent.createMany({ data: auditEventsToCreate });

  // 7. Supporting Providers
  console.log('Adding supporting provider assignments...');
  await prisma.appointmentSupportingProvider.createMany({
    data: [
      { appointmentId: alice930amId, providerId: bobId, assignedById: '44444444-4444-4444-4444-444444444444', assignedAt: now },
      { appointmentId: bobConfirmedId, providerId: carolId, assignedById: '44444444-4444-4444-4444-444444444444', assignedAt: now },
    ],
  });

  // 8. Visit notes
  console.log('Adding clinical visit notes...');
  const note1 = await prisma.visitNote.create({
    data: {
      appointmentId: alice8amId,
      authorProviderId: aliceId,
      content: 'Routine check-up. Blood pressure normal (120/80), all vitals within range.',
    },
  });
  const note2 = await prisma.visitNote.create({
    data: {
      appointmentId: alice830amId,
      authorProviderId: aliceId,
      content: 'Follow-up for lab results. Medication dosage adjusted for cholesterol management.',
    },
  });
  const note3 = await prisma.visitNote.create({
    data: {
      appointmentId: alice930amId,
      authorProviderId: bobId,
      content: 'Supporting provider present. Coordinated joint care plan with primary provider.',
    },
  });

  await prisma.appointmentAuditEvent.createMany({
    data: [
      { id: randomUUID(), appointmentId: alice8amId, eventType: 'NOTE_ADDED', actorId: aliceId, noteId: note1.id, createdAt: now },
      { id: randomUUID(), appointmentId: alice830amId, eventType: 'NOTE_ADDED', actorId: aliceId, noteId: note2.id, createdAt: now },
      { id: randomUUID(), appointmentId: alice930amId, eventType: 'NOTE_ADDED', actorId: bobId, noteId: note3.id, createdAt: now },
    ],
  });

  console.log('🎉 Database seeded successfully with demo users, patients, schedules, notes, and audits!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
