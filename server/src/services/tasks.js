import pool from "../db/pool.js";
import AppError from "../utils/AppError.js";

/** Build task with flattened assignee fields — matches the frontend's expected shape. */
const taskWithAssignee = (row) => ({
  id: row.id,
  board_id: row.board_id,
  column_id: row.column_id,
  title: row.title,
  description: row.description,
  priority: row.priority,
  due_date: row.due_date,
  position: row.position,
  assignee_id: row.assignee_id,
  assignee_name: row.assignee_name || null,
  assignee_email: row.assignee_email || null,
  assignee_avatar: row.assignee_avatar || null,
  created_by: row.created_by,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const TASK_SELECT = `
  SELECT t.*,
         u.name       AS assignee_name,
         u.email      AS assignee_email,
         u.avatar_url AS assignee_avatar
  FROM tasks t
  LEFT JOIN users u ON u.id = t.assignee_id
`;

export async function listTasks(boardId) {
  const { rows } = await pool.query(
    `${TASK_SELECT} WHERE t.board_id = $1 ORDER BY t.position`,
    [boardId]
  );
  return rows.map(taskWithAssignee);
}

export async function createTask(boardId, userId, data) {
  if (!data.title?.trim()) throw new AppError("Task title is required");
  if (!data.column_id) throw new AppError("Column ID is required");

  // Get next position in the target column
  const { rows: posRows } = await pool.query(
    `SELECT COALESCE(MAX(position), 0) + 1000 AS next_pos
     FROM tasks WHERE column_id = $1`,
    [data.column_id]
  );

  const { rows } = await pool.query(
    `INSERT INTO tasks (board_id, column_id, title, description, priority, due_date, position, assignee_id, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      boardId,
      data.column_id,
      data.title.trim(),
      data.description || null,
      data.priority || "medium",
      data.due_date || null,
      posRows[0].next_pos,
      data.assignee_id || null,
      userId,
    ]
  );

  // Update board timestamp
  await pool.query("UPDATE boards SET updated_at = now() WHERE id = $1", [boardId]);

  // Fetch with assignee info
  const { rows: full } = await pool.query(
    `${TASK_SELECT} WHERE t.id = $1`,
    [rows[0].id]
  );
  return taskWithAssignee(full[0]);
}

export async function updateTask(boardId, taskId, data) {
  const fields = [];
  const values = [];
  let idx = 1;

  if (data.title !== undefined) { fields.push(`title = $${idx++}`); values.push(data.title.trim()); }
  if (data.description !== undefined) { fields.push(`description = $${idx++}`); values.push(data.description); }
  if (data.priority !== undefined) { fields.push(`priority = $${idx++}`); values.push(data.priority); }
  if (data.due_date !== undefined) { fields.push(`due_date = $${idx++}`); values.push(data.due_date || null); }
  if (data.assignee_id !== undefined) { fields.push(`assignee_id = $${idx++}`); values.push(data.assignee_id || null); }
  if (!fields.length) throw new AppError("Nothing to update");

  fields.push(`updated_at = now()`);
  values.push(taskId);
  values.push(boardId);

  const { rows } = await pool.query(
    `UPDATE tasks SET ${fields.join(", ")} WHERE id = $${idx} AND board_id = $${idx + 1} RETURNING *`,
    values
  );
  if (!rows.length) throw new AppError("Task not found", 404);

  await pool.query("UPDATE boards SET updated_at = now() WHERE id = $1", [boardId]);

  const { rows: full } = await pool.query(
    `${TASK_SELECT} WHERE t.id = $1`,
    [rows[0].id]
  );
  return taskWithAssignee(full[0]);
}

export async function moveTask(boardId, taskId, { column_id, position }) {
  if (!column_id) throw new AppError("column_id is required");
  if (position === undefined) throw new AppError("position is required");

  const { rows } = await pool.query(
    `UPDATE tasks SET column_id = $1, position = $2, updated_at = now()
     WHERE id = $3 AND board_id = $4 RETURNING *`,
    [column_id, position, taskId, boardId]
  );
  if (!rows.length) throw new AppError("Task not found", 404);

  const { rows: full } = await pool.query(
    `${TASK_SELECT} WHERE t.id = $1`,
    [rows[0].id]
  );
  return taskWithAssignee(full[0]);
}

export async function deleteTask(boardId, taskId) {
  const { rowCount } = await pool.query(
    "DELETE FROM tasks WHERE id = $1 AND board_id = $2",
    [taskId, boardId]
  );
  if (!rowCount) throw new AppError("Task not found", 404);

  await pool.query("UPDATE boards SET updated_at = now() WHERE id = $1", [boardId]);
  return { success: true };
}

/* ---------- Columns ---------- */

export async function createColumn(boardId, { title }) {
  if (!title?.trim()) throw new AppError("Column title is required");

  const { rows: posRows } = await pool.query(
    `SELECT COALESCE(MAX(position), 0) + 1000 AS next_pos
     FROM columns WHERE board_id = $1`,
    [boardId]
  );

  const { rows } = await pool.query(
    `INSERT INTO columns (board_id, title, position)
     VALUES ($1, $2, $3) RETURNING *`,
    [boardId, title.trim(), posRows[0].next_pos]
  );

  return rows[0];
}

export async function updateColumn(boardId, columnId, data) {
  const fields = [];
  const values = [];
  let idx = 1;

  if (data.title !== undefined) { fields.push(`title = $${idx++}`); values.push(data.title.trim()); }
  if (data.position !== undefined) { fields.push(`position = $${idx++}`); values.push(data.position); }
  if (!fields.length) throw new AppError("Nothing to update");

  values.push(columnId);
  values.push(boardId);

  const { rows } = await pool.query(
    `UPDATE columns SET ${fields.join(", ")} WHERE id = $${idx} AND board_id = $${idx + 1} RETURNING *`,
    values
  );
  if (!rows.length) throw new AppError("Column not found", 404);
  return rows[0];
}

export async function deleteColumn(boardId, columnId) {
  // Delete tasks in the column first, then the column
  await pool.query("DELETE FROM tasks WHERE column_id = $1 AND board_id = $2", [columnId, boardId]);
  const { rowCount } = await pool.query(
    "DELETE FROM columns WHERE id = $1 AND board_id = $2",
    [columnId, boardId]
  );
  if (!rowCount) throw new AppError("Column not found", 404);
  return { success: true };
}
