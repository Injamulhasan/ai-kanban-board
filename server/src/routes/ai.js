import { Router } from "express";
import * as ctrl from "../controllers/ai.js";

const router = Router({ mergeParams: true });

router.post("/generate-tasks", ctrl.generateTasks);
router.post("/breakdown", ctrl.breakdown);
router.post("/summary", ctrl.summary);

export default router;
