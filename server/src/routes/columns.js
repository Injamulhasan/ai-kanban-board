import { Router } from "express";
import * as ctrl from "../controllers/columns.js";

const router = Router({ mergeParams: true });

router.post("/", ctrl.create);
router.patch("/:columnId", ctrl.update);
router.delete("/:columnId", ctrl.remove);

export default router;
