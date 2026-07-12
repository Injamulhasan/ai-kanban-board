import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db/pool.js";
import AppError from "../utils/AppError.js";

const SALT_ROUNDS = 12;

/** Strip password from a user row and return a clean user object. */
const sanitize = (row) => {
  if (!row) return null;
  const { password, ...user } = row;
  return user;
};

const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

export async function register({ name, email, password }) {
  if (!name?.trim()) throw new AppError("Name is required");
  if (!email?.trim()) throw new AppError("Email is required");
  if (!password || password.length < 6)
    throw new AppError("Password must be at least 6 characters");

  const exists = await pool.query("SELECT 1 FROM users WHERE email = $1", [
    email.toLowerCase(),
  ]);
  if (exists.rows.length) throw new AppError("Email already registered", 409);

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password)
     VALUES ($1, $2, $3) RETURNING *`,
    [name.trim(), email.toLowerCase().trim(), hash]
  );

  const user = sanitize(rows[0]);
  return { user, token: signToken(user) };
}

export async function login({ email, password }) {
  if (!email || !password) throw new AppError("Email and password are required");

  const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [
    email.toLowerCase(),
  ]);
  if (!rows.length) throw new AppError("Invalid credentials", 401);

  const valid = await bcrypt.compare(password, rows[0].password);
  if (!valid) throw new AppError("Invalid credentials", 401);

  const user = sanitize(rows[0]);
  return { user, token: signToken(user) };
}

export async function me(userId) {
  const { rows } = await pool.query(
    "SELECT id, name, email, avatar_url, created_at FROM users WHERE id = $1",
    [userId]
  );
  if (!rows.length) throw new AppError("User not found", 404);
  return rows[0];
}
