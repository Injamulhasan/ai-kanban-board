import AppError from "../utils/AppError.js";

/**
 * Central error handler — placed at the end of the Express middleware chain.
 * Sends a clean { error } JSON for known AppErrors, and a generic 500 for unexpected ones.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Postgres unique violation (e.g. duplicate email)
  if (err.code === "23505") {
    return res.status(409).json({ error: "A record with that value already exists" });
  }

  // Postgres foreign key violation
  if (err.code === "23503") {
    return res.status(400).json({ error: "Referenced record not found" });
  }

  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
};

export default errorHandler;
