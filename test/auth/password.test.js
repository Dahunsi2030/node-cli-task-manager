import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hashPassword, verifyPassword } from '../../src/auth/password.js';

// Confirm that hashing returns a string and does not expose the original password.
test('hashPassword returns a string different from the original password', async () => {
	// Use a sample password as input to the hashing function.
	const originalPassword = 'my-password';

	// hashPassword is asynchronous, so wait for its result.
	const result = await hashPassword(originalPassword);

	// A stored password hash should be represented as text.
	assert.equal(typeof result, 'string');

	// The hash must not be the original plaintext password.
	assert.notEqual(result, originalPassword);
});

// Confirm that the original password matches its stored hash.
test('verifyPassword returns true for the correct password', async () => {
	const originalPassword = 'my-password';
	const passwordHash = await hashPassword(originalPassword);

	assert.equal(await verifyPassword(originalPassword, passwordHash), true);
});

// Confirm that a different password does not match the stored hash.
test('verifyPassword returns false for an incorrect password', async () => {
	const passwordHash = await hashPassword('my-password');

	assert.equal(await verifyPassword('wrong-password', passwordHash), false);
});
