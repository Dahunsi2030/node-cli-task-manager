import { readJson } from '../../src/utils/readJson.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { verifyPassword } from '../../src/auth/password.js';
import { registerUser } from '../../src/users/userService.js';
import { writeJson } from '../../src/utils/writeJson.js';

// Confirm that registration creates a user and saves it to users.json.
test('registerUser creates and persists a user', async () => {
	// Save the current data so the test can restore it after running.
	const originalUsers = await readJson('users.json', 'data');

	// Provide the information that a new user submits during registration.
	const userData = {
		name: 'Registered Test User',
		email: 'REGISTERED@example.com',
		password: 'test-password'
	};

	try {
		// Register the user and read the file again to check persistence.
		const createdUser = await registerUser(userData);
		const savedUsers = await readJson('users.json', 'data');

		// The service should create a UUID-style string ID.
		assert.equal(typeof createdUser.id, 'string');
		assert.equal(createdUser.id.length, 36);

		// Email casing should be normalized before the user is stored.
		assert.equal(createdUser.email, 'registered@example.com');

		// A newly registered user should have both timestamp fields.
		assert.ok(createdUser.createdAt);
		assert.ok(createdUser.updatedAt);

		// Creation and last-modified times should initially be identical.
		assert.equal(createdUser.createdAt, createdUser.updatedAt);

		// The plaintext password must not be included in the created user.
		assert.equal(createdUser.password, undefined);

		// Confirm that the stored password hash matches the original password.
		assert.equal(
			await verifyPassword(userData.password, createdUser.passwordHash),
			true
		);

		// The newly created user should appear in the saved users array.
		assert.equal(savedUsers.some((user) => user.id === createdUser.id), true);
	} finally {
		// Restore the original fixture so this test does not leave data behind.
		await writeJson('users.json', originalUsers, 'data');
	}
});

// Confirm that registration rejects when no user data is provided.
test('registerUser rejects missing user data', async () => {
	await assert.rejects(
		// Calling registerUser without an argument should reject its Promise.
		registerUser(),
		// Check both the error type and its exact message.
		{
			name: 'TypeError',
			message: 'User data is required'
		}
	);
});

// Confirm that registration rejects user data without an email.
test('registerUser rejects a missing email', async () => {
	await assert.rejects(
		// A password is provided, but the required email is missing.
		registerUser({ password: 'test-password' }),
		// Check both the error type and its exact message.
		{
			name: 'TypeError',
			message: 'A valid email is required'
		}
	);
});

// Confirm that registration rejects an email containing only whitespace.
test('registerUser rejects a whitespace-only email', async () => {
	await assert.rejects(
		// The email has no usable characters after trimming whitespace.
		registerUser({
			email: '   ',
			password: 'test-password'
		}),
		// Check both the error type and its exact message.
		{
			name: 'TypeError',
			message: 'A valid email is required'
		}
	);
});

// Confirm that registration rejects a password containing only whitespace.
test('registerUser rejects a whitespace-only password', async () => {
	await assert.rejects(
		// The email is valid, but the password has no usable characters.
		registerUser({
			email: 'test@example.com',
			password: '   '
		}),
		// Check both the error type and its exact message.
		{
			name: 'TypeError',
			message: 'A password is required'
		}
	);
});

// Confirm that registration rejects passwords shorter than eight characters.
test('registerUser rejects a seven-character password', async () => {
	await assert.rejects(
		// This password has seven characters, so it should fail validation.
		registerUser({
			email: 'short-password@example.com',
			password: '1234567'
		}),
		// Check both the error type and its exact message.
		{
			name: 'TypeError',
			message: 'A password must be at least 8 characters'
		}
	);
});

