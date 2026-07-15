import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../db/prisma.js";
import AppError from "../utils/AppError.js";

const SALT_ROUNDS = 12;

/** Strip password from a user row and return a clean user object. */
const sanitize = (user) => {
  if (!user) return null;
  const { password, ...clean } = user;
  return clean;
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

  const normalizedEmail = email.toLowerCase().trim();

  const exists = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (exists) throw new AppError("Email already registered", 409);

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  
  const created = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      password: hash,
    },
  });

  const user = sanitize(created);
  return { user, token: signToken(user) };
}

export async function login({ email, password }) {
  if (!email || !password) throw new AppError("Email and password are required");

  const normalizedEmail = email.toLowerCase().trim();

  const userRecord = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (!userRecord) throw new AppError("Invalid credentials", 401);

  const valid = await bcrypt.compare(password, userRecord.password);
  if (!valid) throw new AppError("Invalid credentials", 401);

  const user = sanitize(userRecord);
  return { user, token: signToken(user) };
}

export async function me(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      createdAt: true,
    },
  });
  if (!user) throw new AppError("User not found", 404);
  return user;
}
