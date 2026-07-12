import pool from "../db/pool.js";
import AppError from "../utils/AppError.js";

/**
 * Multi-tenant guard: ensures the authenticated user is a member of the board
 * identified by `req.params.boardId` (or `req.params.id`).
 * Attaches `req.boardRole` ('owner' | 'admin' | 'member') on success.
 */
const requireBoardMember = async (req, _res, next) => {
  const boardId = req.params.boardId || req.params.id;
  if (!boardId) return next(new AppError("Board ID required", 400));

  try {
    const { rows } = await pool.query(
      `SELECT role FROM board_members WHERE board_id = $1 AND user_id = $2`,
      [boardId, req.user.id]
    );

    if (rows.length === 0) {
      return next(new AppError("Board not found or access denied", 404));
    }

    req.boardRole = rows[0].role;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Requires the user to be an owner or admin of the board.
 * Must be placed AFTER requireBoardMember.
 */
const requireBoardAdmin = (req, _res, next) => {
  if (req.boardRole !== "owner" && req.boardRole !== "admin") {
    return next(new AppError("Admin or owner access required", 403));
  }
  next();
};

export { requireBoardMember, requireBoardAdmin };
