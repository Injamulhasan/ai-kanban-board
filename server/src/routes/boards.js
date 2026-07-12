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
router.use("/:boardId/columns", requireBoardMember, columnRoutes);
router.use("/:boardId/tasks", requireBoardMember, taskRoutes);
router.use("/:boardId/ai", requireBoardMember, aiRoutes);

export default router;
