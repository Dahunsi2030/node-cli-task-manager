import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hashPassword } from '../../src/auth/password.js';
import { getCurrentUser, loginUser, logout, updateProfile } from '../../src/auth/authService.js';
import { readJson } from '../../src/utils/readJson.js';
import { writeJson } from '../../src/utils/writeJson.js';

const testUser = {
	id: 'login-test-user',
	email: 'login@example.com',
	password: 'correct-password',
	firstName: 'Old',
	lastName: 'Name',
	country: 'Old Country'
};

// Replace the real data with one known user for the duration of a test.
async function withTestUser(callback) {
	const originalUsers = await readJson('users.json');
	const originalSessions = await readJson('auth.json');
	const passwordHash = await hashPassword(testUser.password);

	await writeJson('users.json', [{
		id: testUser.id,
		email: testUser.email,
		firstName: testUser.firstName,
		lastName: testUser.lastName,
		country: testUser.country,
		updatedAt: '2026-01-01T00:00:00.000Z',
		passwordHash
	}]);
	await writeJson('auth.json', []);

	try {
		await callback();
	} finally {
		// Restore both files so the test does not leave data behind.
		await writeJson('users.json', originalUsers);
		await writeJson('auth.json', originalSessions);
	}
}

// Confirm that valid credentials return a token and safe user data.
test('loginUser succeeds with correct credentials', async () => {
	await withTestUser(async () => {
		const result = await loginUser(testUser.email, testUser.password);
		const sessions = await readJson('auth.json');

		assert.equal(typeof result.token, 'string');
		assert.equal(result.user.id, testUser.id);
		assert.equal(result.user.email, testUser.email);
		assert.equal(result.user.passwordHash, undefined);
		assert.equal(sessions.length, 1);
		assert.equal(sessions[0].type, 'session');
		assert.equal(sessions[0].token, result.token);
		assert.equal(sessions[0].userId, testUser.id);
	});
});

// Confirm that an email not belonging to a user is rejected generically.
test('loginUser rejects an unknown email', async () => {
	await withTestUser(async () => {
		await assert.rejects(
			loginUser('unknown@example.com', testUser.password),
			{ message: 'Invalid email or password' }
		);
	});
});

// Confirm that a wrong password is rejected with the same generic message.
test('loginUser rejects an incorrect password', async () => {
	await withTestUser(async () => {
		await assert.rejects(
			loginUser(testUser.email, 'wrong-password'),
			{ message: 'Invalid email or password' }
		);
	});
});

// Confirm that a second login replaces the user's previous session.
test('loginUser replaces an existing session for the user', async () => {
	await withTestUser(async () => {
		const firstLogin = await loginUser(testUser.email, testUser.password);
		const secondLogin = await loginUser(testUser.email, testUser.password);
		const sessions = await readJson('auth.json');

		assert.notEqual(secondLogin.token, firstLogin.token);
		assert.equal(sessions.filter((session) => session.userId === testUser.id).length, 1);
		assert.equal(sessions[0].token, secondLogin.token);
	});
});

// Confirm that the session expires one hour after it is created.
test('loginUser creates a session that expires in one hour', async () => {
	await withTestUser(async () => {
		const result = await loginUser(testUser.email, testUser.password);
		const duration = new Date(result.expiresAt).getTime() - new Date(result.createdAt).getTime();

		assert.ok(Math.abs(duration - 60 * 60 * 1000) < 1000);
	});
});

// Confirm that logout removes the session created during login.
test('logout removes the authenticated session', async () => {
	await withTestUser(async () => {
		const loginResult = await loginUser(testUser.email, testUser.password);
		const removed = await logout(loginResult.token);
		const sessions = await readJson('auth.json');

		assert.equal(removed, true);
		assert.equal(sessions.some((session) => session.token === loginResult.token), false);
	});
});

// Confirm that a valid session token returns the user without the password hash.
test('getCurrentUser returns the user for a valid token', async () => {
	await withTestUser(async () => {
		const loginResult = await loginUser(testUser.email, testUser.password);
		const user = await getCurrentUser(loginResult.token);

		assert.equal(user.id, testUser.id);
		assert.equal(user.email, testUser.email);
		assert.equal(user.passwordHash, undefined);
	});
});

// Confirm that a token not stored in auth.json is rejected.
test('getCurrentUser rejects an invalid token', async () => {
	await withTestUser(async () => {
		await assert.rejects(
			getCurrentUser('invalid-token'),
			{ message: 'Invalid or expired session' }
		);
	});
});

// Confirm that an expired session token is rejected.
test('getCurrentUser rejects an expired token', async () => {
	await withTestUser(async () => {
		const loginResult = await loginUser(testUser.email, testUser.password);
		const sessions = await readJson('auth.json');
		sessions[0].expiresAt = new Date(Date.now() - 1000).toISOString();
		await writeJson('auth.json', sessions);

		await assert.rejects(
			getCurrentUser(loginResult.token),
			{ message: 'Invalid or expired session' }
		);
	});
});

// Confirm that all allowed profile fields update and sensitive data is preserved.
test('updateProfile updates fields and preserves the password hash', async () => {
	await withTestUser(async () => {
		const loginResult = await loginUser(testUser.email, testUser.password);
		const before = await readJson('users.json');
		const updated = await updateProfile(loginResult.token, {
			firstName: 'New First',
			lastName: 'New Last',
			country: 'New Country',
			email: ' UPDATED@example.com '
		});
		const savedUsers = await readJson('users.json');

		assert.equal(updated.firstName, 'New First');
		assert.equal(updated.lastName, 'New Last');
		assert.equal(updated.country, 'New Country');
		assert.equal(updated.email, 'updated@example.com');
		assert.equal(updated.passwordHash, undefined);
		assert.equal(savedUsers[0].passwordHash, before[0].passwordHash);
		assert.notEqual(savedUsers[0].updatedAt, before[0].updatedAt);
	});
});

// Confirm that an email already owned by another user is rejected.
test('updateProfile rejects a duplicate email', async () => {
	await withTestUser(async () => {
		const users = await readJson('users.json');
		users.push({
			id: 'other-user',
			email: 'other@example.com',
			passwordHash: await hashPassword('other-password')
		});
		await writeJson('users.json', users);
		const loginResult = await loginUser(testUser.email, testUser.password);

		await assert.rejects(
			updateProfile(loginResult.token, { email: 'OTHER@example.com' }),
			{ message: 'A user with this email already exists' }
		);
	});
});

// Confirm that protected fields cannot be changed through profile updates.
test('updateProfile rejects protected fields', async () => {
	await withTestUser(async () => {
		const loginResult = await loginUser(testUser.email, testUser.password);

		await assert.rejects(
			updateProfile(loginResult.token, { passwordHash: 'changed' }),
			{ message: 'Cannot update profile field: passwordHash' }
		);
	});
});

// Confirm that an invalid or expired session cannot update a profile.
test('updateProfile rejects invalid and expired tokens', async () => {
	await withTestUser(async () => {
		await assert.rejects(
			updateProfile('invalid-token', { country: 'Nowhere' }),
			{ message: 'Invalid or expired session' }
		);

		const loginResult = await loginUser(testUser.email, testUser.password);
		const sessions = await readJson('auth.json');
		sessions[0].expiresAt = new Date(Date.now() - 1000).toISOString();
		await writeJson('auth.json', sessions);

		await assert.rejects(
			updateProfile(loginResult.token, { country: 'Nowhere' }),
			{ message: 'Invalid or expired session' }
		);
	});
});
