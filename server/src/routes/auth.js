import { Router } from "express";
import * as ctrl from "../controllers/auth.js";
import authenticate from "../middleware/auth.js";
import pool from "../db/pool.js";

import bcrypt from "bcrypt";

const router = Router();

router.get("/diagnostic", async (req, res) => {
  const result = {
    env: {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL_SET: !!process.env.DATABASE_URL,
      JWT_SECRET_SET: !!process.env.JWT_SECRET,
      GEMINI_API_KEY_SET: !!process.env.GEMINI_API_KEY,
    },
    db: {
      connected: false,
      error: null,
      tables: [],
      usersCount: 0
    },
    bcrypt: {
      working: false,
      error: null
    }
  };

  try {
    const { rows } = await pool.query("SELECT now()");
    result.db.connected = true;
    
    const { rows: tableRows } = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
    );
    result.db.tables = tableRows.map(r => r.table_name);

    if (result.db.tables.includes("users")) {
      const { rows: userRows } = await pool.query("SELECT count(*) FROM users");
      result.db.usersCount = parseInt(userRows[0].count);
    }
  } catch (err) {
    result.db.error = err.message;
  }

  try {
    const testHash = await bcrypt.hash("test_pass", 10);
    const testMatch = await bcrypt.compare("test_pass", testHash);
    result.bcrypt.working = testMatch;
  } catch (bcryptErr) {
    result.bcrypt.error = bcryptErr.message;
  }

  res.json(result);
});

router.post("/register", ctrl.register);
router.post("/login", ctrl.login);
router.get("/me", authenticate, ctrl.me);

export default router;
