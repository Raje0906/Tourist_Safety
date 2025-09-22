import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, decimal, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull(), // 'tourist' | 'admin'
  googleId: text("google_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tourists = pgTable("tourists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  documentType: text("document_type").notNull(), // 'passport' | 'aadhaar' | 'driving_license'
  documentUrl: text("document_url"),
  itinerary: text("itinerary"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  emergencyName: text("emergency_name"),
  emergencyPhone: text("emergency_phone"),
  digitalIdHash: text("digital_id_hash"), // blockchain hash
  safetyScore: integer("safety_score").default(85),
  currentLocation: text("current_location"),
  locationLat: decimal("location_lat"),
  locationLng: decimal("location_lng"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  touristId: varchar("tourist_id").references(() => tourists.id),
  type: text("type").notNull(), // 'geofence' | 'emergency' | 'weather' | 'safety'
  severity: text("severity").notNull(), // 'low' | 'medium' | 'high' | 'critical'
  title: text("title").notNull(),
  message: text("message").notNull(),
  location: text("location"),
  isResolved: boolean("is_resolved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const emergencyIncidents = pgTable("emergency_incidents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  touristId: varchar("tourist_id").references(() => tourists.id).notNull(),
  type: text("type").notNull(), // 'panic_button' | 'automatic' | 'reported'
  location: text("location").notNull(),
  locationLat: decimal("location_lat"),
  locationLng: decimal("location_lng"),
  status: text("status").notNull().default('active'), // 'active' | 'resolved' | 'investigating'
  description: text("description"),
  responderNotes: text("responder_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const authorities = pgTable("authorities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'police' | 'medical' | 'tourist_police' | 'embassy'
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  jurisdiction: text("jurisdiction").notNull(), // Geographic area or city
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const aiAnomalies = pgTable("ai_anomalies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  touristId: varchar("tourist_id").references(() => tourists.id).notNull(),
  anomalyType: text("anomaly_type").notNull(), // 'movement' | 'location' | 'communication' | 'behavior'
  severity: text("severity").notNull(), // 'low' | 'medium' | 'high' | 'critical'
  confidence: decimal("confidence").notNull(), // 0-1 ML confidence score
  description: text("description").notNull(),
  locationLat: decimal("location_lat"),
  locationLng: decimal("location_lng"),
  behaviorData: json("behavior_data"), // JSON data from ML model
  isResolved: boolean("is_resolved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const efirs = pgTable("efirs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firNumber: text("fir_number").notNull().unique(),
  touristId: varchar("tourist_id").references(() => tourists.id).notNull(),
  incidentType: text("incident_type").notNull(), // 'theft' | 'assault' | 'fraud' | 'harassment' | 'other'
  location: text("location").notNull(),
  locationLat: decimal("location_lat"),
  locationLng: decimal("location_lng"),
  description: text("description").notNull(),
  evidenceFiles: json("evidence_files").default([]), // URLs to uploaded evidence
  filedBy: varchar("filed_by").references(() => users.id).notNull(),
  authorityContacted: varchar("authority_contacted").references(() => authorities.id).notNull(),
  status: text("status").notNull().default('filed'), // 'filed' | 'investigating' | 'resolved' | 'closed'
  pdfPath: text("pdf_path"), // Path to generated PDF
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertTouristSchema = createInsertSchema(tourists).omit({
  id: true,
  createdAt: true,
  digitalIdHash: true,
  safetyScore: true,
  isActive: true,
}).extend({
  startDate: z.union([z.string(), z.date(), z.null()]).optional().transform((val) => {
    if (!val || val === null) return null;
    if (typeof val === 'string') return new Date(val);
    return val;
  }),
  endDate: z.union([z.string(), z.date(), z.null()]).optional().transform((val) => {
    if (!val || val === null) return null;
    if (typeof val === 'string') return new Date(val);
    return val;
  }),
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
  isResolved: true,
});

export const insertEmergencyIncidentSchema = createInsertSchema(emergencyIncidents).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});

export const insertAuthoritySchema = createInsertSchema(authorities).omit({
  id: true,
  createdAt: true,
  isActive: true,
});

export const insertAIAnomalySchema = createInsertSchema(aiAnomalies).omit({
  id: true,
  createdAt: true,
  isResolved: true,
});

export const insertEFIRSchema = createInsertSchema(efirs).omit({
  id: true,
  firNumber: true,
  createdAt: true,
  updatedAt: true,
  pdfPath: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Tourist = typeof tourists.$inferSelect;
export type InsertTourist = z.infer<typeof insertTouristSchema>;

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;

export type EmergencyIncident = typeof emergencyIncidents.$inferSelect;
export type InsertEmergencyIncident = z.infer<typeof insertEmergencyIncidentSchema>;

export type Authority = typeof authorities.$inferSelect;
export type InsertAuthority = z.infer<typeof insertAuthoritySchema>;

export type AIAnomaly = typeof aiAnomalies.$inferSelect;
export type InsertAIAnomaly = z.infer<typeof insertAIAnomalySchema>;

export type EFIR = typeof efirs.$inferSelect;
export type InsertEFIR = z.infer<typeof insertEFIRSchema>;
