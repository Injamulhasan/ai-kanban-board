import pool from "../db/pool.js";

export const search = async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json({ users: [] });

    const { rows } = await pool.query(
      `SELECT id, name, email, avatar_url
       FROM users
       WHERE id != $1
         AND (name ILIKE $2 OR email ILIKE $2)
       ORDER BY name
       LIMIT 20`,
      [req.user.id, `%${q}%`]
    );

    res.json({ users: rows });
  } catch (err) {
    next(err);
  }
};

export const getNotifications = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const { rows } = await pool.query(
      `SELECT a.*, b.title AS board_title, u.name AS user_name, u.avatar_url AS user_avatar
       FROM activities a
       JOIN boards b ON b.id = a.board_id
       JOIN board_members bm ON bm.board_id = b.id
       LEFT JOIN users u ON u.id = a.user_id
       WHERE bm.user_id = $1
       ORDER BY a.created_at DESC
       LIMIT $2`,
      [req.user.id, limit]
    );
    res.json({ activities: rows });
  } catch (err) {
    next(err);
  }
};
