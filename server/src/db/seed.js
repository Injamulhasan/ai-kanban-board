// ----------------------------------------------------------------------------
// Kanboard — All-or-nothing transactional seed script.
// Drops all tables, recreates from schema.sql, then seeds demo data.
//
// Usage: npm run seed
// ----------------------------------------------------------------------------

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";
import bcrypt from "bcrypt";

const __dirname = dirname(fileURLToPath(import.meta.url));

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const SALT_ROUNDS = 12;
const PASSWORD = "Test@1234";

const USERS = [
  { name: "Alex Rivera",   email: "alex@kanboard.dev" },
  { name: "Maya Chen",     email: "maya@kanboard.dev" },
  { name: "Diego Santos",  email: "diego@kanboard.dev" },
  { name: "Priya Nair",    email: "priya@kanboard.dev" },
  { name: "Sam Okafor",    email: "sam@kanboard.dev" },
  { name: "Lena Fischer",  email: "lena@kanboard.dev" },
];

const BOARDS = [
  {
    title: "Product Roadmap",
    description: "Quarterly planning, OKRs and feature prioritization.",
    color: "#2f8159",
    ownerIdx: 0, // Alex
    memberIdxs: [1, 2, 3],
    tasks: [
      { title: "Define Q3 OKRs", desc: "Define Q3 OKRs — details and acceptance criteria.", priority: "high", col: 0, assigneeIdx: 0, dueDays: -9 },
      { title: "Prioritize backlog", desc: null, priority: "urgent", col: 1, assigneeIdx: 1, dueDays: 2 },
      { title: "User interview synthesis", desc: null, priority: "low", col: 1, assigneeIdx: 2, dueDays: null },
      { title: "Pricing experiment", desc: "Pricing experiment — details and acceptance criteria.", priority: "medium", col: 2, assigneeIdx: 0, dueDays: 5 },
      { title: "Competitor analysis", desc: null, priority: "high", col: 3, assigneeIdx: null, dueDays: -2 },
      { title: "Roadmap review", desc: null, priority: "urgent", col: 0, assigneeIdx: 0, dueDays: 14 },
      { title: "Define success metrics", desc: "Define success metrics — details and acceptance criteria.", priority: "low", col: 2, assigneeIdx: 1, dueDays: 1 },
      { title: "Beta feedback triage", desc: null, priority: "medium", col: 3, assigneeIdx: 2, dueDays: null },
      { title: "Planning deck", desc: null, priority: "high", col: 1, assigneeIdx: 0, dueDays: 20 },
      { title: "Stakeholder alignment", desc: "Stakeholder alignment — details and acceptance criteria.", priority: "urgent", col: 3, assigneeIdx: null, dueDays: -4 },
    ],
  },
  {
    title: "Mobile App Launch",
    description: "Ship the iOS & Android apps to the stores.",
    color: "#c26a45",
    ownerIdx: 0,
    memberIdxs: [4, 5],
    tasks: [
      { title: "App store listing", desc: "App store listing — details and acceptance criteria.", priority: "high", col: 0, assigneeIdx: 0, dueDays: 2 },
      { title: "Push notifications", desc: null, priority: "urgent", col: 1, assigneeIdx: 4, dueDays: 5 },
      { title: "Crash reporting", desc: null, priority: "medium", col: 1, assigneeIdx: 5, dueDays: null },
      { title: "Onboarding screens", desc: "Onboarding screens — details and acceptance criteria.", priority: "high", col: 2, assigneeIdx: 0, dueDays: -2 },
      { title: "TestFlight beta", desc: null, priority: "low", col: 3, assigneeIdx: null, dueDays: 14 },
      { title: "Performance profiling", desc: null, priority: "medium", col: 0, assigneeIdx: 4, dueDays: 1 },
      { title: "Deep linking", desc: "Deep linking — details and acceptance criteria.", priority: "urgent", col: 2, assigneeIdx: 5, dueDays: null },
      { title: "Release checklist", desc: null, priority: "high", col: 3, assigneeIdx: 0, dueDays: 6 },
    ],
  },
  {
    title: "Website Redesign",
    description: "Marketing site refresh with a new design language.",
    color: "#5f7da6",
    ownerIdx: 0,
    memberIdxs: [5, 2],
    tasks: [
      { title: "Wireframe homepage", desc: "Wireframe homepage — details and acceptance criteria.", priority: "medium", col: 0, assigneeIdx: 0, dueDays: 5 },
      { title: "Design hero section", desc: null, priority: "high", col: 1, assigneeIdx: 5, dueDays: -2 },
      { title: "Responsive nav", desc: null, priority: "urgent", col: 1, assigneeIdx: 2, dueDays: 14 },
      { title: "Migrate blog content", desc: "Migrate blog content — details and acceptance criteria.", priority: "low", col: 2, assigneeIdx: 0, dueDays: 1 },
      { title: "SEO audit", desc: null, priority: "medium", col: 3, assigneeIdx: null, dueDays: null },
      { title: "Accessibility pass", desc: null, priority: "high", col: 0, assigneeIdx: 5, dueDays: 20 },
      { title: "Lighthouse optimization", desc: "Lighthouse optimization — details and acceptance criteria.", priority: "urgent", col: 2, assigneeIdx: 2, dueDays: -4 },
    ],
  },
  {
    title: "Marketing Q3",
    description: "Campaigns, content and growth experiments.",
    color: "#d4a23c",
    ownerIdx: 0,
    memberIdxs: [2, 3],
    tasks: [
      { title: "Launch email sequence", desc: "Launch email sequence — details and acceptance criteria.", priority: "low", col: 0, assigneeIdx: 0, dueDays: 2 },
      { title: "Social calendar", desc: null, priority: "medium", col: 1, assigneeIdx: 2, dueDays: null },
      { title: "Webinar planning", desc: null, priority: "high", col: 1, assigneeIdx: 3, dueDays: 5 },
      { title: "Case study writeup", desc: "Case study writeup — details and acceptance criteria.", priority: "urgent", col: 2, assigneeIdx: 0, dueDays: -2 },
      { title: "Ad creative refresh", desc: null, priority: "low", col: 3, assigneeIdx: null, dueDays: 14 },
    ],
  },
  {
    title: "Design System",
    description: "Tokens, components and documentation.",
    color: "#2c9c8f",
    ownerIdx: 0,
    memberIdxs: [5, 1],
    tasks: [
      { title: "Token naming audit", desc: "Token naming audit — details and acceptance criteria.", priority: "medium", col: 0, assigneeIdx: 0, dueDays: 1 },
      { title: "Button component", desc: null, priority: "high", col: 1, assigneeIdx: 5, dueDays: null },
      { title: "Form primitives", desc: null, priority: "urgent", col: 1, assigneeIdx: 1, dueDays: 20 },
      { title: "Theme tokens", desc: "Theme tokens — details and acceptance criteria.", priority: "low", col: 2, assigneeIdx: 0, dueDays: -4 },
      { title: "Icon set cleanup", desc: null, priority: "medium", col: 3, assigneeIdx: null, dueDays: 6 },
      { title: "Documentation site", desc: null, priority: "high", col: 0, assigneeIdx: 5, dueDays: 9 },
    ],
  },
  {
    title: "Engineering Sprint",
    description: "Current two-week delivery sprint.",
    color: "#6f9b54",
    ownerIdx: 1, // Maya owns this
    memberIdxs: [0, 4, 2],
    tasks: [
      { title: "Refactor auth module", desc: "Refactor auth module — details and acceptance criteria.", priority: "urgent", col: 0, assigneeIdx: 0, dueDays: -9 },
      { title: "Fix websocket reconnect", desc: null, priority: "high", col: 1, assigneeIdx: 4, dueDays: 2 },
      { title: "Add rate limiting", desc: null, priority: "medium", col: 1, assigneeIdx: 2, dueDays: null },
      { title: "Database index tuning", desc: "Database index tuning — details and acceptance criteria.", priority: "low", col: 2, assigneeIdx: 1, dueDays: 5 },
      { title: "API pagination", desc: null, priority: "urgent", col: 3, assigneeIdx: null, dueDays: -2 },
      { title: "Integration tests", desc: null, priority: "high", col: 0, assigneeIdx: 0, dueDays: 14 },
      { title: "Upgrade Node 22", desc: "Upgrade Node 22 — details and acceptance criteria.", priority: "medium", col: 2, assigneeIdx: 4, dueDays: 1 },
      { title: "Cache layer", desc: null, priority: "low", col: 3, assigneeIdx: 2, dueDays: null },
    ],
  },
  {
    title: "Content Calendar",
    description: "Editorial pipeline for blog & newsletter.",
    color: "#4f9d82",
    ownerIdx: 2, // Diego owns this
    memberIdxs: [0, 3],
    tasks: [
      { title: "Blog: AI in PM", desc: "Blog: AI in PM — details and acceptance criteria.", priority: "high", col: 0, assigneeIdx: 0, dueDays: 2 },
      { title: "Newsletter #14", desc: null, priority: "medium", col: 1, assigneeIdx: 3, dueDays: 5 },
      { title: "Customer spotlight", desc: null, priority: "low", col: 2, assigneeIdx: 2, dueDays: null },
    ],
  },
];

const COL_TITLES = ["Todo", "In Progress", "Review", "Done"];
const DAY_MS = 86_400_000;

async function seed() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    console.log("🗑️  Dropping existing tables...");

    await client.query(`
      DROP TABLE IF EXISTS activities CASCADE;
      DROP TABLE IF EXISTS tasks CASCADE;
      DROP TABLE IF EXISTS columns CASCADE;
      DROP TABLE IF EXISTS board_members CASCADE;
      DROP TABLE IF EXISTS boards CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);

    console.log("📐 Creating schema...");
    const schema = readFileSync(join(__dirname, "schema.sql"), "utf8");
    await client.query(schema);

    console.log("👤 Creating users...");
    const hash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);
    const userIds = [];
    for (const u of USERS) {
      const { rows } = await client.query(
        `INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id`,
        [u.name, u.email, hash]
      );
      userIds.push(rows[0].id);
    }

    console.log("📋 Creating boards, columns, tasks, memberships...");
    for (const boardDef of BOARDS) {
      const ownerId = userIds[boardDef.ownerIdx];

      // Create board
      const { rows: boardRows } = await client.query(
        `INSERT INTO boards (title, description, color, owner_id, updated_at)
         VALUES ($1, $2, $3, $4, now() - interval '1 day' * $5)
         RETURNING id`,
        [boardDef.title, boardDef.description, boardDef.color, ownerId, Math.random() * 10]
      );
      const boardId = boardRows[0].id;

      // Owner membership
      await client.query(
        `INSERT INTO board_members (board_id, user_id, role) VALUES ($1, $2, 'owner')`,
        [boardId, ownerId]
      );

      // Other members
      for (let i = 0; i < boardDef.memberIdxs.length; i++) {
        const memberId = userIds[boardDef.memberIdxs[i]];
        const role = i === 0 ? "admin" : "member";
        await client.query(
          `INSERT INTO board_members (board_id, user_id, role) VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [boardId, memberId, role]
        );
      }

      // Create columns
      const colIds = [];
      for (let i = 0; i < COL_TITLES.length; i++) {
        const { rows } = await client.query(
          `INSERT INTO columns (board_id, title, position) VALUES ($1, $2, $3) RETURNING id`,
          [boardId, COL_TITLES[i], (i + 1) * 1000]
        );
        colIds.push(rows[0].id);
      }

      // Create tasks
      for (let i = 0; i < boardDef.tasks.length; i++) {
        const t = boardDef.tasks[i];
        const colId = colIds[t.col];
        const assigneeId = t.assigneeIdx != null ? userIds[t.assigneeIdx] : null;
        const dueDate = t.dueDays != null
          ? new Date(Date.now() + t.dueDays * DAY_MS).toISOString().slice(0, 10)
          : null;

        await client.query(
          `INSERT INTO tasks (board_id, column_id, title, description, priority, due_date, position, assignee_id, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [boardId, colId, t.title, t.desc, t.priority, dueDate, (i + 1) * 1000, assigneeId, ownerId]
        );
      }

      // Sample activities
      const allMemberIds = [ownerId, ...boardDef.memberIdxs.map((i) => userIds[i])];
      const sampleActions = [
        { action: "task.created", msg: `created "${boardDef.tasks[0]?.title || "a task"}"` },
        { action: "task.moved", msg: `moved "${boardDef.tasks[1]?.title || "a task"}" to Done` },
        { action: "member.added", msg: `added a new member to the board` },
        { action: "task.updated", msg: `updated a task's priority` },
      ];
      for (let i = 0; i < sampleActions.length; i++) {
        const actorId = allMemberIds[i % allMemberIds.length];
        await client.query(
          `INSERT INTO activities (board_id, user_id, action, message, created_at)
           VALUES ($1, $2, $3, $4, now() - interval '1 hour' * $5)`,
          [boardId, actorId, sampleActions[i].action, sampleActions[i].msg, (i + 1) * 6]
        );
      }
    }

    await client.query("COMMIT");

    console.log("\n✅ Seed complete!");
    console.log(`   ${USERS.length} users created (password: ${PASSWORD})`);
    console.log(`   ${BOARDS.length} boards with columns, tasks, and activities`);
    console.log(`\n   Demo login: alex@kanboard.dev / ${PASSWORD}\n`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Seed failed — rolled back:", err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(() => process.exit(1));
