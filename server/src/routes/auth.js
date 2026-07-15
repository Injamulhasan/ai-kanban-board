import { Router } from "express";
import * as ctrl from "../controllers/auth.js";
import authenticate from "../middleware/auth.js";

const router = Router();

router.post("/register", ctrl.register);
router.post("/login", ctrl.login);
router.get("/me", authenticate, ctrl.me);

export default router;
