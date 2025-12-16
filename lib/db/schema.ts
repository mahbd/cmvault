import { pgTable, text, timestamp, boolean, integer, primaryKey, unique } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name"),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified"),
    image: text("image"),
    role: text("role").default("USER").notNull(),
    apiToken: text("api_token").unique(),
    tempCode: text("temp_code"),
    tempAuthCodeCreatedAt: timestamp("temp_auth_code_created_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const sessions = pgTable("sessions", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const accounts = pgTable("accounts", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    idToken: text("id_token"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const verifications = pgTable("verifications", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const commands = pgTable("commands", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    title: text("title"),
    text: text("text").notNull(),
    description: text("description"),
    platform: text("platform").notNull(),
    visibility: text("visibility").default("PRIVATE").notNull(),
    favorite: boolean("favorite").default(false).notNull(),
    usageCount: integer("usage_count").default(0).notNull(),
    userId: text("user_id").notNull().references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const tags = pgTable("tags", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    userId: text("user_id").notNull().references(() => users.id),
});

export const commandTags = pgTable("command_tags", {
    commandId: text("command_id").notNull().references(() => commands.id),
    tagId: text("tag_id").notNull().references(() => tags.id),
}, (t) => ({
    pk: primaryKey({ columns: [t.commandId, t.tagId] }),
}));

export const commandUsages = pgTable("command_usages", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    command: text("command").notNull(),
    os: text("os"),
    context: text("context"),
    userId: text("user_id").notNull().references(() => users.id),
    usageCount: integer("usage_count").default(1).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => ({
    unq: unique().on(t.userId, t.command),
}));

import { relations } from "drizzle-orm";

export const usersRelations = relations(users, ({ many }) => ({
    sessions: many(sessions),
    accounts: many(accounts),
    commands: many(commands),
    tags: many(tags),
    maxUsages: many(commandUsages),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
    user: one(users, {
        fields: [sessions.userId],
        references: [users.id],
    }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
    user: one(users, {
        fields: [accounts.userId],
        references: [users.id],
    }),
}));

export const commandsRelations = relations(commands, ({ one, many }) => ({
    user: one(users, {
        fields: [commands.userId],
        references: [users.id],
    }),
    tags: many(commandTags),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
    user: one(users, {
        fields: [tags.userId],
        references: [users.id],
    }),
    commands: many(commandTags),
}));

export const commandTagsRelations = relations(commandTags, ({ one }) => ({
    command: one(commands, {
        fields: [commandTags.commandId],
        references: [commands.id],
    }),
    tag: one(tags, {
        fields: [commandTags.tagId],
        references: [tags.id],
    }),
}));

export const commandUsagesRelations = relations(commandUsages, ({ one }) => ({
    user: one(users, {
        fields: [commandUsages.userId],
        references: [users.id],
    }),
}));
