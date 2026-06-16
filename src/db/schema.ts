import { pgTable, serial, text, timestamp, boolean, integer, index } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password"), // Nullable for OAuth, but required for local auth
  role: text("role").notNull().default('passenger'),
  profileData: text("profile_data"), // Flexible profile data
  rating: text("rating"),
  reviewCount: integer("review_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(), // Removed unique() constraint to support N vehicles
  plate: text("plate").notNull().unique(),
  brand: text("brand"),
  model: text("model"),
  color: text("color"),
  type: text("type").default('car'), // car / motorcycle
  isActive: boolean("is_active").default(true),
  availabilityStatus: text("availability_status").default('available'), // available, unavailable, maintenance
  verifiedStatus: text("verified_status").default('pending'), // pending, approved, rejected
  rejectReason: text("reject_reason"),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: integer("verified_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
}, (table) => {
  return {
    userIdIdx: index("vehicles_user_id_idx").on(table.userId),
    isActiveIdx: index("vehicles_is_active_idx").on(table.isActive),
  };
});

export const vehicleDocuments = pgTable("vehicle_documents", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id).notNull(),
  documentType: text("document_type").notNull(), // soat, property_card, tech_preventive
  fileUrl: text("file_url").notNull(),
  status: text("status").notNull().default('pending'), // pending, approved, rejected
  expirationDate: timestamp("expiration_date"),
  expirationStatus: text("expiration_status").default('valid'), // valid, expiring_soon, expired
  rejectReason: text("reject_reason"),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: integer("verified_by"),
  ocrConfidence: text("ocr_confidence"),
  ocrPlate: text("ocr_plate"),
  ocrExtractedData: text("ocr_extracted_data"), // stringified JSON
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
  documentName: text("document_name"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
}, (table) => {
  return {
    vehicleIdIdx: index("vehicle_documents_vehicle_id_idx").on(table.vehicleId),
  };
});

export const userDocuments = pgTable("user_documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  documentType: text("document_type").notNull(), // license
  fileUrl: text("file_url").notNull(),
  status: text("status").notNull().default('pending'), // pending, approved, rejected
  expirationDate: timestamp("expiration_date"),
  expirationStatus: text("expiration_status").default('valid'), // valid, expiring_soon, expired
  rejectReason: text("reject_reason"),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: integer("verified_by"),
  ocrConfidence: text("ocr_confidence"),
  ocrExtractedData: text("ocr_extracted_data"), // stringified JSON
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
  documentName: text("document_name"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
}, (table) => {
  return {
    userIdIdx: index("user_documents_user_id_idx").on(table.userId),
  };
});

export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").references(() => users.id).notNull(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id), // Nullable for compatibility
  origin: text("origin").notNull(),
  originCoords: text("origin_coords"), // JSON or stringified coords
  destination: text("destination").notNull(),
  destinationCoords: text("destination_coords"),
  polyline: text("polyline"), // For map path rendering
  departureTime: timestamp("departure_time").notNull(),
  totalSeats: integer("total_seats").notNull(),
  availableSeats: integer("available_seats").notNull(),
  price: integer("price").notNull().default(0),
  status: text("status").notNull().default('scheduled'), // scheduled, in_progress, completed, cancelled
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    vehicleIdIdx: index("routes_vehicle_id_idx").on(table.vehicleId),
  };
});

export const joinRequests = pgTable("join_requests", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").references(() => routes.id).notNull(),
  passengerId: integer("passenger_id").references(() => users.id).notNull(),
  status: text("status").notNull().default('pending'), // pending, accepted, rejected, cancelled
  createdAt: timestamp("created_at").defaultNow(),
});

export const ratings = pgTable("ratings", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").references(() => routes.id).notNull(),
  fromUserId: integer("from_user_id").references(() => users.id).notNull(),
  toUserId: integer("to_user_id").references(() => users.id).notNull(),
  score: integer("score").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // Enum: REQUEST_APPROVED, REQUEST_REJECTED, NEW_REQUEST, ROUTE_CANCELLED
  data: text("data"), // JSON text for extra info (routeId, requestId)
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index("notifications_user_id_idx").on(table.userId),
    isReadIdx: index("notifications_is_read_idx").on(table.isRead),
    userIdIsReadIdx: index("notifications_user_id_is_read_idx").on(table.userId, table.isRead),
  };
});

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id").references(() => users.id).notNull(),
  reportedUserId: integer("reported_user_id").references(() => users.id).notNull(),
  reason: text("reason").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default('pending'), // pending, reviewing, resolved, dismissed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
}, (table) => {
  return {
    reporterIdIdx: index("reports_reporter_id_idx").on(table.reporterId),
    reportedUserIdIdx: index("reports_reported_user_id_idx").on(table.reportedUserId),
  };
});

export const adminLogs = pgTable("admin_logs", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").references(() => users.id).notNull(),
  action: text("action").notNull(), // vehicle_approved, vehicle_rejected, user_suspended, user_activated, document_approved, document_rejected
  targetId: text("target_id").notNull(),
  details: text("details").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    adminIdIdx: index("admin_logs_admin_id_idx").on(table.adminId),
  };
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isUsed: boolean("is_used").default(false).notNull(),
}, (table) => {
  return {
    tokenIdx: index("password_reset_tokens_token_idx").on(table.token),
  };
});


