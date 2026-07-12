import pool from "../db/pool.js";
import AppError from "../utils/AppError.js";

const DEFAULT_COLUMNS = ["Todo", "In Progress", "Review", "Done"];

/* ---------- Board CRUD ---------- */

export async function listBoards(userId) {
  const { rows } = await pool.query(
    `SELECT b.*,
            b.owner_id = $1 AS is_owner,
            (SELECT COUNT(*)::int FROM tasks t WHERE t.board_id = b.id)  AS task_count,
            (SELECT COUNT(*)::int FROM board_members bm WHERE bm.board_id = b.id) AS member_count
     FROM boards b
     JOIN board_members m ON m.board_id = b.id
     WHERE m.user_id = $1
     ORDER BY b.updated_at DESC`,
    [userId]
  );
  return rows;
}

export async function createBoard(userId, { title, description, color }) {
  if (!title?.trim()) throw new AppError("Board title is required");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Create board
    const { rows: boardRows } = await client.query(
      `INSERT INTO boards (title, description, color, owner_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [title.trim(), description || null, color || "#2f8159", userId]
    );
    const board = boardRows[0];

    // Add owner as member
    await client.query(
      `INSERT INTO board_members (board_id, user_id, role) VALUES ($1, $2, 'owner')`,
      [board.id, userId]
    );

    // Create default columns
    for (let i = 0; i < DEFAULT_COLUMNS.length; i++) {
      await client.query(
        `INSERT INTO columns (board_id, title, position) VALUES ($1, $2, $3)`,
        [board.id, DEFAULT_COLUMNS[i], (i + 1) * 1000]
      );
    }

    await client.query("COMMIT");

    return { ...board, is_owner: true, task_count: 0, member_count: 1 };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getBoard(boardId, userId) {
  // Board
  const { rows: boardRows } = await pool.query(
    "SELECT * FROM boards WHERE id = $1",
    [boardId]
  );
  if (!boardRows.length) throw new AppError("Board not found", 404);
  const board = boardRows[0];

  // Columns
  const { rows: columns } = await pool.query(
    "SELECT * FROM columns WHERE board_id = $1 ORDER BY position",
    [boardId]
  );

  // Tasks with assignee info
  const { rows: tasks } = await pool.query(
    `SELECT t.*,
            u.name  AS assignee_name,
            u.email AS assignee_email,
            u.avatar_url AS assignee_avatar
     FROM tasks t
     LEFT JOIN users u ON u.id = t.assignee_id
     WHERE t.board_id = $1
     ORDER BY t.position`,
    [boardId]
  );

  // Members
  const { rows: members } = await pool.query(
    `SELECT u.id, u.name, u.email, u.avatar_url, bm.role, bm.joined_at
     FROM board_members bm
     JOIN users u ON u.id = bm.user_id
     WHERE bm.board_id = $1
     ORDER BY bm.joined_at`,
    [boardId]
  );

  // Current user's role
  const me = members.find((m) => m.id === userId);
  const role = me?.role || "member";

  return { board, columns, tasks, members, role };
}

export async function updateBoard(boardId, data) {
  const fields = [];
  const values = [];
  let idx = 1;

  if (data.title !== undefined) {
    fields.push(`title = $${idx++}`);
    values.push(data.title.trim());
  }
  if (data.description !== undefined) {
    fields.push(`description = $${idx++}`);
    values.push(data.description);
  }
  if (data.color !== undefined) {
    fields.push(`color = $${idx++}`);
    values.push(data.color);
  }
  if (!fields.length) throw new AppError("Nothing to update");

  fields.push(`updated_at = now()`);
  values.push(boardId);

  const { rows } = await pool.query(
    `UPDATE boards SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0];
}

export async function deleteBoard(boardId, userId) {
  const { rows } = await pool.query(
    "SELECT owner_id FROM boards WHERE id = $1",
    [boardId]
  );
  if (!rows.length) throw new AppError("Board not found", 404);
  if (rows[0].owner_id !== userId)
    throw new AppError("Only the owner can delete this board", 403);

  await pool.query("DELETE FROM boards WHERE id = $1", [boardId]);
  return { success: true };
}

/* ---------- Activity ---------- */

export async function logActivity(boardId, userId, action, message, meta = {}) {
  const { rows } = await pool.query(
    `INSERT INTO activities (board_id, user_id, action, message, meta)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [boardId, userId, action, message, JSON.stringify(meta)]
  );

  // Attach user info for the response
  const { rows: userRows } = await pool.query(
    "SELECT name, avatar_url FROM users WHERE id = $1",
    [userId]
  );
  return {
    ...rows[0],
    user_name: userRows[0]?.name || "System",
    user_avatar: userRows[0]?.avatar_url || null,
  };
}

export async function getActivities(boardId, limit = 30) {
  const { rows } = await pool.query(
    `SELECT a.*, u.name AS user_name, u.avatar_url AS user_avatar
     FROM activities a
     LEFT JOIN users u ON u.id = a.user_id
     WHERE a.board_id = $1
     ORDER BY a.created_at DESC
     LIMIT $2`,
    [boardId, limit]
  );
  return rows;
}

/* ---------- Members ---------- */

export async function addMember(boardId, email, role = "member") {
  if (!email?.trim()) throw new AppError("Email is required");

  const { rows: userRows } = await pool.query(
    "SELECT id, name, email, avatar_url FROM users WHERE email = $1",
    [email.toLowerCase().trim()]
  );
  if (!userRows.length) throw new AppError("User not found with that email", 404);

  const user = userRows[0];

  // Check if already a member
  const { rows: existing } = await pool.query(
    "SELECT 1 FROM board_members WHERE board_id = $1 AND user_id = $2",
    [boardId, user.id]
  );
  if (existing.length) throw new AppError("User is already a member", 409);

  const memberRole = role === "admin" ? "admin" : "member";
  await pool.query(
    `INSERT INTO board_members (board_id, user_id, role) VALUES ($1, $2, $3)`,
    [boardId, user.id, memberRole]
  );

  // Update board timestamp
  await pool.query("UPDATE boards SET updated_at = now() WHERE id = $1", [boardId]);

  return { ...user, role: memberRole, joined_at: new Date().toISOString() };
}

export async function removeMember(boardId, userId) {
  // Can't remove the owner
  const { rows: boardRows } = await pool.query(
    "SELECT owner_id FROM boards WHERE id = $1",
    [boardId]
  );
  if (boardRows[0]?.owner_id === userId)
    throw new AppError("Cannot remove the board owner", 400);

  await pool.query(
    "DELETE FROM board_members WHERE board_id = $1 AND user_id = $2",
    [boardId, userId]
  );

  return { success: true };
}
