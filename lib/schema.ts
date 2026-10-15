import { pgTable, serial, text, timestamp, integer, numeric, date, unique } from "drizzle-orm/pg-core";

// 1. users (ユーザー)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name"),
  email: text("email").unique(),
  password: text("password").notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// 2. visited_locations (位置)
export const visitedLocations = pgTable("visited_locations", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id, { onDelete: 'cascade' }),
  latitude: numeric("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: numeric("longitude", { precision: 10, scale: 7 }).notNull(),
  name: text("name"),
  comment: text("comment"),
  updated_at: timestamp("updated_at").defaultNow().notNull(), 
  created_at: timestamp("created_at").defaultNow().notNull(), 
});

// 3. visited_places (場所)
export const visitedPlaces = pgTable("visited_places", {
  id: serial("id").primaryKey(),
  location_id: integer("location_id").references(() => visitedLocations.id, { onDelete: 'cascade' }),
  google_place_id: text("google_place_id"),
  name: text("name"),
  category: text("category"),
  address: text("address"),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// 4. visited_logs (訪問履歴)
export const visitedLogs = pgTable("visited_logs", {
  id: serial("id").primaryKey(),
  location_id: integer("location_id").references(() => visitedLocations.id, { onDelete: 'cascade' }),
  user_id: integer("user_id").references(() => users.id, { onDelete: 'cascade' }),
  place_id: integer("place_id").references(() => visitedPlaces.id, { onDelete: 'cascade' }),
  visited_at: timestamp("visited_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// 5. visited_comments (訪問コメント)
export const visitedComments = pgTable("visited_comments", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id, { onDelete: 'cascade' }),
  log_id: integer("log_id").references(() => visitedLogs.id, { onDelete: 'cascade' }),
  comment: text("comment"),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// 6. ai_usage (AI の呼び出し回数。デモユーザーの 1 日あたりの上限に使う。date は日本時間の日付)
export const aiUsage = pgTable("ai_usage", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  date: date("date").notNull(),
  count: integer("count").default(0).notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  unique("ai_usage_user_id_date_unique").on(t.user_id, t.date),
]);

