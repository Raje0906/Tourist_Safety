import mongoose, { Schema, Document } from 'mongoose';

// User Schema
export interface IUser extends Document {
  email: string;
  name: string;
  role: string;
  googleId?: string;
  createdAt: Date;
}

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  role: { type: String, required: true }, // 'tourist' | 'admin'
  googleId: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Tourist Schema
export interface ITourist extends Document {
  userId: string;
  firstName: string;
  lastName: string;
  phone: string;
  documentType: string;
  documentUrl?: string;
  itinerary?: string;
  startDate?: Date;
  endDate?: Date;
  emergencyName?: string;
  emergencyPhone?: string;
  digitalIdHash?: string;
  safetyScore: number;
  currentLocation?: string;
  locationLat?: number;
  locationLng?: number;
  isActive: boolean;
  createdAt: Date;
}

const touristSchema = new Schema<ITourist>({
  userId: { type: String, required: true, ref: 'User' },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone: { type: String, required: true },
  documentType: { type: String, required: true }, // 'passport' | 'aadhaar' | 'driving_license'
  documentUrl: { type: String },
  itinerary: { type: String },
  startDate: { type: Date },
  endDate: { type: Date },
  emergencyName: { type: String },
  emergencyPhone: { type: String },
  digitalIdHash: { type: String }, // blockchain hash
  safetyScore: { type: Number, default: 85 },
  currentLocation: { type: String },
  locationLat: { type: Number },
  locationLng: { type: Number },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Alert Schema
export interface IAlert extends Document {
  touristId?: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  location?: string;
  isResolved: boolean;
  createdAt: Date;
}

const alertSchema = new Schema<IAlert>({
  touristId: { type: String, ref: 'Tourist' },
  type: { type: String, required: true }, // 'geofence' | 'emergency' | 'weather' | 'safety'
  severity: { type: String, required: true }, // 'low' | 'medium' | 'high' | 'critical'
  title: { type: String, required: true },
  message: { type: String, required: true },
  location: { type: String },
  isResolved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Emergency Incident Schema
export interface IEmergencyIncident extends Document {
  touristId: string;
  type: string;
  location: string;
  locationLat?: number;
  locationLng?: number;
  status: string;
  description?: string;
  responderNotes?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

const emergencyIncidentSchema = new Schema<IEmergencyIncident>({
  touristId: { type: String, required: true, ref: 'Tourist' },
  type: { type: String, required: true }, // 'panic_button' | 'automatic' | 'reported'
  location: { type: String, required: true },
  locationLat: { type: Number },
  locationLng: { type: Number },
  status: { type: String, required: true, default: 'active' }, // 'active' | 'resolved' | 'investigating'
  description: { type: String },
  responderNotes: { type: String },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date }
});

// AI Anomaly Schema
export interface IAIAnomaly extends Document {
  touristId: string;
  anomalyType: string;
  severity: string;
  confidence: number;
  description: string;
  locationLat?: number;
  locationLng?: number;
  behaviorData: any;
  isResolved: boolean;
  createdAt: Date;
}

const aiAnomalySchema = new Schema<IAIAnomaly>({
  touristId: { type: String, required: true, ref: 'Tourist' },
  anomalyType: { type: String, required: true }, // 'movement' | 'location' | 'communication' | 'behavior'
  severity: { type: String, required: true }, // 'low' | 'medium' | 'high' | 'critical'
  confidence: { type: Number, required: true, min: 0, max: 1 }, // 0-1 ML confidence score
  description: { type: String, required: true },
  locationLat: { type: Number },
  locationLng: { type: Number },
  behaviorData: { type: Schema.Types.Mixed }, // JSON data from ML model
  isResolved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// E-FIR Schema
export interface IEFIR extends Document {
  firNumber: string;
  touristId: string;
  incidentType: string;
  location: string;
  locationLat?: number;
  locationLng?: number;
  description: string;
  evidenceFiles: string[];
  filedBy: string; // User ID who filed
  authorityContacted: string;
  status: string;
  pdfPath?: string;
  createdAt: Date;
  updatedAt: Date;
}

const efirSchema = new Schema<IEFIR>({
  firNumber: { type: String, required: true, unique: true },
  touristId: { type: String, required: true, ref: 'Tourist' },
  incidentType: { type: String, required: true }, // 'theft' | 'assault' | 'fraud' | 'harassment' | 'other'
  location: { type: String, required: true },
  locationLat: { type: Number },
  locationLng: { type: Number },
  description: { type: String, required: true },
  evidenceFiles: [{ type: String }], // URLs to uploaded evidence
  filedBy: { type: String, required: true, ref: 'User' },
  authorityContacted: { type: String, required: true },
  status: { type: String, required: true, default: 'filed' }, // 'filed' | 'investigating' | 'resolved' | 'closed'
  pdfPath: { type: String }, // Path to generated PDF
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Authority Schema
export interface IAuthority extends Document {
  name: string;
  type: string;
  email: string;
  phone: string;
  jurisdiction: string;
  isActive: boolean;
  createdAt: Date;
}

const authoritySchema = new Schema<IAuthority>({
  name: { type: String, required: true },
  type: { type: String, required: true }, // 'police' | 'medical' | 'tourist_police' | 'embassy'
  email: { type: String, required: true },
  phone: { type: String, required: true },
  jurisdiction: { type: String, required: true }, // Geographic area or city
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Create and export models
export const UserModel = mongoose.model<IUser>('User', userSchema);
export const TouristModel = mongoose.model<ITourist>('Tourist', touristSchema);
export const AlertModel = mongoose.model<IAlert>('Alert', alertSchema);
export const EmergencyIncidentModel = mongoose.model<IEmergencyIncident>('EmergencyIncident', emergencyIncidentSchema);
export const AIAnomalyModel = mongoose.model<IAIAnomaly>('AIAnomaly', aiAnomalySchema);
export const EFIRModel = mongoose.model<IEFIR>('EFIR', efirSchema);
export const AuthorityModel = mongoose.model<IAuthority>('Authority', authoritySchema);