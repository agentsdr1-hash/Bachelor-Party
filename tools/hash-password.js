#!/usr/bin/env node
// Usage: node tools/hash-password.js "the password"
// Prints a passwordHash value to paste into crew.json.
// (No computer? Open https://<your-site>/tools/hash.html on your phone instead.)
const {hashPassword} = require("../api/_password");
const pw = process.argv[2];
if (!pw) { console.error('Usage: node tools/hash-password.js "the password"'); process.exit(1); }
console.log(hashPassword(pw));
