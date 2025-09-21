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

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Tourist = typeof tourists.$inferSelect;
export type InsertTourist = z.infer<typeof insertTouristSchema>;

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;

export type EmergencyIncident = typeof emergencyIncidents.$inferSelect;
export type InsertEmergencyIncident = z.infer<typeof insertEmergencyIncidentSchema>;
