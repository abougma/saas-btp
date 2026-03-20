import { z } from 'zod';
import { VehicleType, VehicleStatus, ContractStatus, AlertStatus } from '../types/index.js';

// ============================================
// Schémas simples réutilisables
// ============================================

export const geoJSONPointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number(), z.number()]),
});

export const mongoIdSchema = z.string().min(1);

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================
// Schémas Vehicle
// ============================================

export const createVehicleSchema = z.object({
  registrationNumber: z.string().min(1, 'Immatriculation requise'),
  internalCode: z.string().min(1, 'Code interne requis'),
  name: z.string().min(1, 'Nom requis'),
  type: z.nativeEnum(VehicleType),
  brand: z.string().min(1, 'Marque requise'),
  vehicleModel: z.string().min(1, 'Modèle requis'),
  year: z.number().min(1990),
  serialNumber: z.string().default(''),
  location: geoJSONPointSchema,
  trackerId: z.string().optional(),
  fuelLevel: z.number().optional(),
  engineHours: z.number().optional(),
  odometer: z.number().optional(),
  notes: z.string().optional(),
});

export const updateVehicleSchema = createVehicleSchema.partial();

export const updateVehicleLocationSchema = z.object({
  location: geoJSONPointSchema,
  speed: z.number().optional(),
  heading: z.number().optional(),
  batteryLevel: z.number().optional(),
});

export const updateVehicleStatusSchema = z.object({
  status: z.nativeEnum(VehicleStatus),
});

export const vehicleQuerySchema = paginationSchema.extend({
  status: z.nativeEnum(VehicleStatus).optional(),
  type: z.nativeEnum(VehicleType).optional(),
  search: z.string().optional(),
});

export const nearQuerySchema = z.object({
  longitude: z.coerce.number(),
  latitude: z.coerce.number(),
  radiusMeters: z.coerce.number().default(1000),
});

// ============================================
// Schémas Geofence
// ============================================

export const createGeofenceSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  description: z.string().optional(),
  area: z.object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
  }),
  isActive: z.boolean().default(true),
  allowedHours: z.object({ start: z.string(), end: z.string() }).optional(),
  allowedDays: z.array(z.number()).optional(),
  color: z.string().default('#3B82F6'),
  assignedVehicles: z.array(mongoIdSchema).optional(),
});

export const updateGeofenceSchema = createGeofenceSchema.partial();

// ============================================
// Schémas Contract
// ============================================

export const createContractSchema = z.object({
  clientId: z.string().min(1, 'Client requis'),
  vehicleId: z.string().min(1, 'Véhicule requis'),
  startDate: z.string().min(1, 'Date de début requise'),
  endDate: z.string().min(1, 'Date de fin requise'),
  dailyRate: z.number().min(0),
  deposit: z.number().optional(),
  deliveryLocation: geoJSONPointSchema,
  deliveryAddress: z.string().min(1, 'Adresse requise'),
  geofenceId: z.string().optional(),
  notes: z.string().optional(),
});

export const updateContractSchema = createContractSchema.partial().extend({
  status: z.nativeEnum(ContractStatus).optional(),
});

// ============================================
// Schémas Alert
// ============================================

export const updateAlertStatusSchema = z.object({
  status: z.enum([AlertStatus.ACKNOWLEDGED, AlertStatus.RESOLVED]),
  resolutionNotes: z.string().optional(),
});

export const alertQuerySchema = paginationSchema.extend({
  status: z.nativeEnum(AlertStatus).optional(),
  vehicleId: mongoIdSchema.optional(),
  severity: z.enum(['info', 'warning', 'critical']).optional(),
});

// ============================================
// Schémas Client
// ============================================

export const createClientSchema = z.object({
  companyName: z.string().min(1, 'Nom de l\'entreprise requis'),
  contactName: z.string().min(1, 'Nom du contact requis'),
  email: z.string().min(1, 'Email requis'),
  phone: z.string().min(1, 'Téléphone requis'),
  address: z.object({
    street: z.string().min(1, 'Rue requise'),
    city: z.string().min(1, 'Ville requise'),
    postalCode: z.string().min(1, 'Code postal requis'),
    country: z.string().default('France'),
  }),
  siret: z.string().optional(),
});

export const updateClientSchema = createClientSchema.partial();

// ============================================
// Types inférés
// ============================================

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
export type UpdateVehicleLocationInput = z.infer<typeof updateVehicleLocationSchema>;
export type VehicleQueryInput = z.infer<typeof vehicleQuerySchema>;
export type CreateGeofenceInput = z.infer<typeof createGeofenceSchema>;
export type UpdateGeofenceInput = z.infer<typeof updateGeofenceSchema>;
export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type NearQueryInput = z.infer<typeof nearQuerySchema>;
