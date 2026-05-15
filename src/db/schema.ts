import { pgTable, serial, text, timestamp, boolean, integer, index } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password"), // Nullable for OAuth, but required for local auth
  role: text("role").notNull().default('passenger'),
  profileData: text("profile_data"), // Flexible profile data
  rating: text("rating").default('5.0'),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  plate: text("plate").notNull().unique(),
  brand: text("brand"),
  model: text("model"),
  color: text("color"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").references(() => users.id).notNull(),
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
