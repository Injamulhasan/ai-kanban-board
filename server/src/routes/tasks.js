import { Router } from "express";
import * as ctrl from "../controllers/tasks.js";

const router = Router({ mergeParams: true });

router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.patch("/:taskId", ctrl.update);
router.patch("/:taskId/move", ctrl.move);
router.delete("/:taskId", ctrl.remove);

export default router;
