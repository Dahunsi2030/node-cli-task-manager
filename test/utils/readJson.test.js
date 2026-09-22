import assert from 'node:assert/strict';                     // Provides strict assertion methods such as ok and rejects.
import { test } from 'node:test';                            // Provides Node's built-in test function.
import { readJson } from '../../src/utils/readJson.js';      // Import the function under test from the source directory.

// Confirm that readJson successfully parses an existing JSON file.
test('readJson reads the users JSON file', async () => {
	// Await the Promise returned by readJson before checking its result.
	const users = await readJson('users.json');

	// The users JSON file should contain an array.
	assert.ok(Array.isArray(users));
});

// Confirm that readJson can read from a caller-provided directory.
test('readJson reads users from the test data directory', async () => {
	// Pass the test data directory as the second argument.
	const users = await readJson('users.json', 'test/data');

	// The test fixture should contain an array of users.
	assert.ok(Array.isArray(users));

	// Confirm that the fixture contains the fake user created for this test.
	assert.ok(users.some((user) => user.name === 'Test User'));
});

// Confirm that readJson rejects when the requested file cannot be read.
test('readJson rejects when the JSON file does not exist', async () => {
	
	// assert.rejects waits for the Promise and verifies that it fails.
	await assert.rejects(
		// This file does not exist, so readJson should reject its Promise.
		
		readJson('missing-users.json'),
		// Check that the message contains the expected phrase without requiring an exact match.
		(error) => {
			return error.message.includes('Failed to read or parse JSON file');
		}
	);
});





