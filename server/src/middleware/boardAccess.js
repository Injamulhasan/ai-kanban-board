import prisma from "../db/prisma.js";
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
    const member = await prisma.boardMember.findUnique({
      where: {
        boardId_userId: {
          boardId,
          userId: req.user.id
        }
      },
      select: { role: true }
    });

    if (!member) {
      return next(new AppError("Board not found or access denied", 404));
    }

    req.boardRole = member.role;
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
