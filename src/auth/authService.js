import { randomUUID } from 'node:crypto';
import { readJson } from '../utils/readJson.js';
import { writeJson } from '../utils/writeJson.js';
import { hashPassword, verifyPassword } from './password.js';

// Validate the email supplied during an authentication request.
export function validateEmail(email) {
	// Require a string with at least one non-whitespace character.
	if (typeof email !== 'string' || email.trim() === '') {
		throw new TypeError('A valid email is required');
	}

	// Return the cleaned value for the next authentication step.
	return email.trim();
}

// Validate the password supplied during an authentication request.
export function validatePassword(password) {
	// Require a string with at least one non-whitespace character.
	if (typeof password !== 'string' || password.trim() === '') {
		throw new TypeError('A password is required');
	}
	
	// Return the original value so valid surrounding spaces are not changed.
	return password;
}

// Authenticate a user with an email address and password.
export async function loginUser(email, password) {
	// Validate the login inputs before reading user data.
	const normalizedEmail = validateEmail(email).toLowerCase();
	const validatedPassword = validatePassword(password);

	// Read the saved users so the submitted credentials can be checked.
	const users = await readJson('users.json');
	// Find the user object whose email matches the normalized login email.
	const user = users.find((savedUser) => savedUser.email === normalizedEmail);

	// Use one generic error so login does not reveal whether an email exists.
	if (!user || !user.passwordHash) {
		throw new Error('Invalid email or password');
	}

	// Compare the submitted password with the stored password hash.
	const passwordMatches = await verifyPassword(validatedPassword, user.passwordHash);

	// Reject the login when the password does not match the stored hash.
	if (!passwordMatches) {
		throw new Error('Invalid email or password');
	}

	// Create a one-hour session for the authenticated user.
	const token = randomUUID();
	const createdAt = new Date();
	const expiresAt = new Date(createdAt.getTime() + 60 * 60 * 1000);

	// Load existing sessions and keep only sessions for other users.
	const sessions = await readJson('auth.json');
	const updatedSessions = sessions.filter((session) => session.userId !== user.id);

	// Store the new session with ISO timestamps for JSON persistence.
	const session = {
		token,
		userId: user.id,
		createdAt: createdAt.toISOString(),
		expiresAt: expiresAt.toISOString(),
	};
	updatedSessions.push(session);
	await writeJson('auth.json', updatedSessions);

	// Do not expose the stored password hash to the caller after login.
	const { passwordHash, ...safeUser } = user;
	return {
		user: safeUser,
		token: session.token,
		createdAt: session.createdAt,
		expiresAt: session.expiresAt,
	};
}

// Remove an authenticated user's session from auth.json.
export async function logout(token) {
	// A token is required to identify the session being removed.
	if (typeof token !== 'string' || token.trim() === '') {
		throw new TypeError('A valid token is required');
	}

	// Read all sessions and remove only the one matching this token.
	const sessions = await readJson('auth.json');
	const remainingSessions = sessions.filter((session) => session.token !== token);

	// Persist the remaining sessions and report whether one was removed.
	await writeJson('auth.json', remainingSessions);
	return remainingSessions.length !== sessions.length;
}

// Create a temporary password-reset token for a registered email address.
export async function requestPasswordReset(email) {
	// Validate and normalize the email before looking up the user.
	const normalizedEmail = validateEmail(email).toLowerCase();
	const users = await readJson('users.json');
	const user = users.find((savedUser) => savedUser.email === normalizedEmail);
	const message = 'If an account exists for this email, a reset token has been created';

	// Return the same response for unknown emails to avoid revealing account existence.
	if (!user) {
		return { message };
	}

	// Create a reset token that expires fifteen minutes after it is issued.
	const token = randomUUID();
	const createdAt = new Date();
	const expiresAt = new Date(createdAt.getTime() + 15 * 60 * 1000);
	const resetToken = {
		type: 'password-reset',
		token,
		userId: user.id,
		createdAt: createdAt.toISOString(),
		expiresAt: expiresAt.toISOString(),
	};

	// Keep only other sessions and reset tokens for this user.
	const authRecords = await readJson('auth.json');
	const remainingRecords = authRecords.filter(
		(record) => !(record.type === 'password-reset' && record.userId === user.id)
	);
	remainingRecords.push(resetToken);
	await writeJson('auth.json', remainingRecords);

	return { message, ...resetToken };
}

// Replace a user's password using a valid temporary reset token.
export async function resetPassword(resetToken, newPassword) {
	// A reset token is required to identify the pending password reset.
	if (typeof resetToken !== 'string' || resetToken.trim() === '') {
		throw new TypeError('A valid reset token is required');
	}

	// Read auth records and find only password-reset tokens.
	const authRecords = await readJson('auth.json');
	const resetRecord = authRecords.find(
		(record) => record.type === 'password-reset' && record.token === resetToken
	);

	// Do not reveal whether a reset token is missing or expired.
	if (!resetRecord || new Date(resetRecord.expiresAt).getTime() <= Date.now()) {
		throw new Error('Invalid or expired reset token');
	}

	// Find the user connected to the reset token before changing users.json.
	const users = await readJson('users.json');
	const user = users.find((savedUser) => savedUser.id === resetRecord.userId);

	if (!user) {
		throw new Error('Invalid or expired reset token');
	}

	// Validate and hash the replacement password before storing it.
	const validatedPassword = validatePassword(newPassword);
	const passwordHash = await hashPassword(validatedPassword);
	user.passwordHash = passwordHash;
	user.updatedAt = new Date().toISOString();

	// Save the updated password before consuming the reset token.
	await writeJson('users.json', users);

	// Remove the used reset token so it cannot be reused.
	const remainingAuthRecords = authRecords.filter(
		(record) => record !== resetRecord
	);
	await writeJson('auth.json', remainingAuthRecords);

	return { success: true };
}
