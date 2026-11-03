// Password hashing shared by api/login.js and tools/hash-password.js.
// Format: pbkdf2$sha256$<iterations>$<salt base64>$<hash base64>
// The same format is produced in the browser by public/tools/hash.html.
const crypto = require("crypto");

const ITER = 210000;

function hashPassword(password, iterations = ITER) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(String(password), salt, iterations, 32, "sha256");
  return `pbkdf2$sha256$${iterations}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

function verifyPassword(password, stored) {
  const parts = String(stored || "").split("$");
  if (parts.length !== 5 || parts[0] !== "pbkdf2" || parts[1] !== "sha256") return false;
  const iterations = parseInt(parts[2], 10);
  if (!(iterations >= 10000 && iterations <= 5000000)) return false;
  const salt = Buffer.from(parts[3], "base64");
  const expected = Buffer.from(parts[4], "base64");
  const actual = crypto.pbkdf2Sync(String(password), salt, iterations, expected.length, "sha256");
  return expected.length > 0 && crypto.timingSafeEqual(actual, expected);
}

module.exports = {hashPassword, verifyPassword};
