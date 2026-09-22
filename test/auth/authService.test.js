import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hashPassword } from '../../src/auth/password.js';
import { loginUser, logout } from '../../src/auth/authService.js';
import { readJson } from '../../src/utils/readJson.js';
import { writeJson } from '../../src/utils/writeJson.js';

const testUser = {
	id: 'login-test-user',
	email: 'login@example.com',
	password: 'correct-password'
};

// Replace the real data with one known user for the duration of a test.
async function withTestUser(callback) {
	const originalUsers = await readJson('users.json');
	const originalSessions = await readJson('auth.json');
	const passwordHash = await hashPassword(testUser.password);

	await writeJson('users.json', [{
		id: testUser.id,
		email: testUser.email,
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
