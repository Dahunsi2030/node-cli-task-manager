// Argon2 provides a password-hashing algorithm designed for securely storing passwords.
import argon2 from 'argon2';

// Hash a password before it is stored or compared with a saved hash.
async function hashPassword(password) {
	// Argon2 returns a salted encoded hash, so the original password is not stored.
	return argon2.hash(password);
}

// Compare a plain password with a stored Argon2 hash during login.
function verifyPassword(password, passwordHash) {
	return argon2.verify(passwordHash, password);
}

// Export both functions so other authentication code can use them.
export { hashPassword, verifyPassword };
