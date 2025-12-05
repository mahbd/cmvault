Framework: Next.js (App Router only)
DB: PostgreSQL
ORM: Prisma
Auth: Better Auth (Google + Passkey only)
UI: ShadCN UI or another AI-friendly modern UI component library

1. Project Overview
Commands Vault is a personal and public repository for saving frequently used commands. It supports public and private commands, fast search, tags, categories, intelligent suggestion, and admin moderation.

Primary goals:
Instant access to commands
Organized, searchable platform
Secure auth (Google + Passkey only)
Public sharing with moderation
Scalable Next.js architecture

2. Authentication Requirements
2.1 Providers
Google OAuth
Passkeys (WebAuthn)
Not allowed:
Password authentication
Email/OTP

2.2 Sessions
Managed by Better Auth
HTTP-only cookies
Refresh token rotation
Logout across devices

2.3 Permissions
Roles:
user (can not edit other users public commands, limit 1000 commands)
moderator (can edit, mark other user blocked but not any moderator)
admin(can do everything)
blocked (cannot publish public commands, limit 200 commands)

Blocked users still can:
Log in
Create private commands
Use private commands

Blocked users cannot:
Create public commands
Edit existing public commands

3. Command Management
3.1 Command Structure
Each command has:
id
title (optional)
commandText (required, supports multi-line)
description (optional)
platform (Linux, macOS, Windows, Android, IOS, Debian, Arch, Fedora, Alpine, Others)
category (Git, Docker, systemd, and suggest few more)
visibility: "public" or "private"
tags (list)
favorite (boolean)
usageCount
createdAt
updatedAt
userId

3.2 Command Actions
Create command
Edit command
Delete command
Duplicate command
Copy with one click
Add to favorites
Change visibility
Move between categories

3.3 Public Command Rules
Public commands are visible to all logged-in users or anonymous users 

3.4 Suggestion Feature
When the user types in the “command” field:
System suggests existing commands matching keywords
Suggestions appear instantly (server-powered or local cache)
Suggestions include:
Command text snippet
Platform

4. Advanced Search Requirements
Search must support:
Keyword search
Fuzzy search
Platform filters
Category filters
Visibility filter (public/private)
Tag-based filtering
Sorting:

Recently added
Recently used
Most copied
Alphabetically

Search must be fast:
Use PostgreSQL full-text search
Vector search (pgvector) for AI semantic matches
Highlight matched text in results

5. Organization Features
5.1 Categories
Add custom categories
Delete categories
Reorder categories (drag-and-drop)
Sidebar display

5.2 Tags
Autocomplete tags
Click tag to filter
Unlimited tags per command

6. Admin Panel Requirements
6.1 Overview
Accessible only by users with admin role.

6.2 Admin Features
User Management
View all users
View registration method (Google/Passkey)
Promote/demote to admin
Block/unblock users
See list of commands posted by a user

Command Moderation
View all public commands
Delete inappropriate commands
Flag suspicious commands
Mark commands as “featured” (optional future feature)
Suspicious User Blocking Logic
Admin can set rule-based flags:
Excessive posting frequency

Repeated reports

Suspicious content patterns

When blocked:

User’s role becomes blocked

User can only create private commands

7. User Interface Requirements
7.1 Dashboard
Sidebar: Categories, Favorites, Public Commands
Global search bar at top
Light/Dark mode toggle
“Add Command” floating button

7.2 Command View
Each command card shows:
Title (or fallback: first 10 chars of command text)
Platform icon
Visibility icon (public/private)
Copy button
Edit/delete buttons (if owner)
Favorite star
Tags

7.3 Editor UI
Fields:
Title (optional)
Command text (required) with syntax highlighting
Description
Platform (dropdown)
Category (Searchable dropdown)

Tags (chips)
Visibility toggle: Public / Private
Live suggestions appear below the command text any time user types.

7.4 AI-Friendly UI Library
Allowed:
ShadCN UI
Tailwind CSS animations
Radix UI components

8. Backend & API Specification
There will be API. use nextjs actions which is more secure than API.

9. Database Schema (Prisma)
User
model User {
  id        String   @id @default(cuid())
  name      String?
  email     String   @unique
  image     String?
  role      Role     @default(USER)
  commands  Command[]
  categories Category[]

  createdAt DateTime @default(now())
}

enum Role {
  USER
  MODERATOR
  ADMIN
  BLOCKED
}

Command
model Command {
  id          String    @id @default(cuid())
  title       String?
  text        String
  description String?
  platform    String
  visibility  Visibility @default(PRIVATE)
  favorite    Boolean   @default(false)

  categoryId  String?
  userId      String

  tags        CommandTag[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id])
  category    Category? @relation(fields: [categoryId], references: [id])
}

enum Visibility {
  PUBLIC
  PRIVATE
}

Category
model Category {
  id       String    @id @default(cuid())
  name     String
  userId   String
  commands Command[]
}

Tag + CommandTag
model Tag {
  id       String       @id @default(cuid())
  name     String
  userId   String
  commands CommandTag[]
}

model CommandTag {
  commandId String
  tagId     String

  command   Command @relation(fields: [commandId], references: [id])
  tag       Tag     @relation(fields: [tagId], references: [id])

  @@id([commandId, tagId])
}

10. Security Requirements
No password login
Only Google + Passkey
CSRF protection
Server-side rate limiting
Prisma input validation
Zod-based payload validation
Public commands are still authenticated
Audit log for admin actions (optional future)

11. Deployment Requirements
Next.js on Local Debian Machine
PostgreSQL on Local Machine
Prisma migrations via prisma migrate deploy
Environment variables securely stored

12. User Stories (Updated)
Visibility
As a user, I want to mark commands as private so only I can see them.
As a user, I want to share some commands publicly.

Suggestions
As a user, I want real-time suggestions while typing commands.

Admin
As an admin, I want to block suspicious users from posting public commands.
As an admin, I want to delete any harmful public command.

Search
As a user, I want a powerful search that finds commands even with partial text.
