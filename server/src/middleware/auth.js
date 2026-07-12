import jwt from "jsonwebtoken";
import AppError from "../utils/AppError.js";

/**
 * Extracts and verifies the JWT from the Authorization header.
 * Attaches `req.user = { id, email, name }` on success.
 */
const authenticate = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new AppError("Authentication required", 401));
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, email: payload.email, name: payload.name };
    next();
  } catch {
    next(new AppError("Invalid or expired token", 401));
  }
};

export default authenticate;
