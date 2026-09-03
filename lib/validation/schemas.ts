import { z } from 'zod';

export const uuidSchema = z.string().uuid('Invalid UUID identifier.');

export const userRoleSchema = z.enum(['front_desk', 'provider']);

export const appointmentStatusSchema = z.enum([
  'requested',
  'confirmed',
  'checked_in',
  'completed',
  'no_show',
  'cancelled',
]);

export const weekdaysSchema = z
  .array(z.number().int().min(1, 'Day must be 1 (Mon) to 7 (Sun).').max(7, 'Day must be 1 (Mon) to 7 (Sun).'))
  .min(1, 'Please select at least one weekday.')
  .max(7);

export const bookSlotSchema = z.object({
  appointmentId: uuidSchema,
  patientId: uuidSchema,
});

export const cancelAppointmentSchema = z.object({
  appointmentId: uuidSchema,
  reason: z
    .string()
    .trim()
    .min(3, 'Please provide a cancellation reason (at least 3 characters).')
    .max(500, 'Cancellation reason cannot exceed 500 characters.'),
});

export const transitionStatusSchema = z.object({
  appointmentId: uuidSchema,
  toStatus: appointmentStatusSchema,
});

export const addNoteSchema = z.object({
  appointmentId: uuidSchema,
  content: z
    .string()
    .trim()
    .min(1, 'Visit note cannot be empty.')
    .max(5000, 'Visit note cannot exceed 5,000 characters.'),
});

export const editNoteSchema = z.object({
  noteId: uuidSchema,
  content: z
    .string()
    .trim()
    .min(1, 'Visit note cannot be empty.')
    .max(5000, 'Visit note cannot exceed 5,000 characters.'),
});

export const assignSupportingProviderSchema = z.object({
  appointmentId: uuidSchema,
  providerId: uuidSchema,
});

export const removeSupportingProviderSchema = z.object({
  appointmentId: uuidSchema,
  providerId: uuidSchema,
});

export const dismissAlertSchema = z.object({
  appointmentId: uuidSchema,
});

export const archiveSlotSchema = z.object({
  appointmentId: uuidSchema,
});

export const restoreSlotSchema = z.object({
  appointmentId: uuidSchema,
});

export const editSlotSchema = z
  .object({
    appointmentId: uuidSchema,
    scheduledStart: z.coerce.date(),
    durationMinutes: z
      .number()
      .int()
      .min(5, 'Duration must be at least 5 minutes.')
      .max(480, 'Duration cannot exceed 8 hours.'),
  })
  .refine((v) => v.scheduledStart.getTime() > Date.now() - 5 * 60 * 1000, {
    message: 'Slot scheduled start time cannot be in the past.',
    path: ['scheduledStart'],
  });

export const reassignProviderSchema = z.object({
  appointmentId: uuidSchema,
  newProviderId: uuidSchema,
});

export const patientSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Patient full name must be at least 2 characters.')
      .max(200, 'Patient full name cannot exceed 200 characters.'),
    email: z
      .string()
      .trim()
      .email('Please enter a valid email address.')
      .max(320)
      .nullable()
      .optional()
      .or(z.literal('')),
    phone: z.string().trim().max(50).nullable().optional(),
    dateOfBirth: z.coerce.date().nullable().optional(),
  })
  .refine((v) => !v.dateOfBirth || v.dateOfBirth <= new Date(), {
    message: 'Date of birth cannot be in the future.',
    path: ['dateOfBirth'],
  });

export const updatePatientSchema = patientSchema.and(
  z.object({
    patientId: uuidSchema,
  }),
);

export const generateAvailabilitySchema = z
  .object({
    providerId: uuidSchema,
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    weekdays: weekdaysSchema,
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM 24h time.'),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM 24h time.'),
    durationMinutes: z.number().int().min(5, 'Duration must be at least 5 minutes.').max(480),
    gapMinutes: z.number().int().min(0, 'Gap cannot be negative.').max(120).default(0),
  })
  .refine((v) => v.startDate <= v.endDate, {
    message: 'Start date must be on or before end date.',
    path: ['endDate'],
  })
  .refine((v) => v.startTime < v.endTime, {
    message: 'Start time must be before end time.',
    path: ['endTime'],
  });

export const appointmentsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().trim().max(200).optional(),
    status: z
      .union([appointmentStatusSchema, z.literal('available')])
      .optional(),
    providerId: uuidSchema.optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    sortBy: z
      .enum(['scheduled_start', 'created_at', 'status', 'provider'])
      .default('scheduled_start'),
    sortDir: z.enum(['asc', 'desc']).default('asc'),
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to, {
    message: 'From date must be on or before To date.',
    path: ['to'],
  });

export const patientsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().max(200).optional(),
});

export type BookSlotInput = z.infer<typeof bookSlotSchema>;
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;
export type TransitionStatusInput = z.infer<typeof transitionStatusSchema>;
export type AddNoteInput = z.infer<typeof addNoteSchema>;
export type EditNoteInput = z.infer<typeof editNoteSchema>;
export type AssignSupportingProviderInput = z.infer<typeof assignSupportingProviderSchema>;
export type RemoveSupportingProviderInput = z.infer<typeof removeSupportingProviderSchema>;
export type DismissAlertInput = z.infer<typeof dismissAlertSchema>;
export type ArchiveSlotInput = z.infer<typeof archiveSlotSchema>;
export type RestoreSlotInput = z.infer<typeof restoreSlotSchema>;
export type EditSlotInput = z.infer<typeof editSlotSchema>;
export type ReassignProviderInput = z.infer<typeof reassignProviderSchema>;
export type PatientInput = z.infer<typeof patientSchema>;
export type GenerateAvailabilityInput = z.infer<typeof generateAvailabilitySchema>;
export type AppointmentsQueryInput = z.infer<typeof appointmentsQuerySchema>;
export type PatientsQueryInput = z.infer<typeof patientsQuerySchema>;