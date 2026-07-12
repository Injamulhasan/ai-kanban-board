import { Router } from "express";
import * as ctrl from "../controllers/users.js";
import authenticate from "../middleware/auth.js";

const router = Router();

router.get("/search", authenticate, ctrl.search);

export default router;
