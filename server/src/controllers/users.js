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
