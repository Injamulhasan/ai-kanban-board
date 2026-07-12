import { Router } from "express";
import * as ctrl from "../controllers/boards.js";
import authenticate from "../middleware/auth.js";
import { requireBoardMember, requireBoardAdmin } from "../middleware/boardAccess.js";
import columnRoutes from "./columns.js";
import taskRoutes from "./tasks.js";
import aiRoutes from "./ai.js";

const router = Router();

// All board routes require authentication
router.use(authenticate);

// Board list & create (no board-specific access check needed)
router.get("/", ctrl.list);
router.post("/", ctrl.create);

// Board-specific routes — all require membership
router.get("/:id", requireBoardMember, ctrl.get);
router.patch("/:id", requireBoardMember, requireBoardAdmin, ctrl.update);
router.delete("/:id", requireBoardMember, ctrl.remove);

// Activity
router.get("/:id/activity", requireBoardMember, ctrl.getActivity);

// Members
router.post("/:id/members", requireBoardMember, requireBoardAdmin, ctrl.addMember);
router.delete("/:id/members/:userId", requireBoardMember, requireBoardAdmin, ctrl.removeMember);

// Nested routes — columns, tasks, AI
// Re-map :id → :boardId for nested routers
router.use("/:id/columns", (req, _res, next) => {
  req.params.boardId = req.params.id;
  next();
}, requireBoardMember, columnRoutes);

router.use("/:id/tasks", (req, _res, next) => {
  req.params.boardId = req.params.id;
  next();
}, requireBoardMember, taskRoutes);

router.use("/:id/ai", (req, _res, next) => {
  req.params.boardId = req.params.id;
  next();
}, requireBoardMember, aiRoutes);

export default router;
