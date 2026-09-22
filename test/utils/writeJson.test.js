import assert from 'node:assert/strict';
import { unlink } from 'node:fs/promises';
import { test } from 'node:test';
import { readJson } from '../../src/utils/readJson.js';
import { writeJson } from '../../src/utils/writeJson.js';

test('writeJson writes users read from the test data directory', async () => {
	const directory = 'test/data';
	const sourceFile = 'users.json';
	const outputFile = 'users.write.test.json';

	// Read the existing users fixture from test/data.
	const users = await readJson(sourceFile, directory);

	try {
		// Write the users to a temporary file in the same directory.
		const result = await writeJson(outputFile, users, directory);

		// writeJson should report that the file was written successfully.
		assert.equal(result, true);

		// Read the temporary file and confirm its contents match the fixture.
		const writtenUsers = await readJson(outputFile, directory);
		assert.deepEqual(writtenUsers, users);
	} finally {
		// Remove the temporary file so the test leaves the fixture directory unchanged.
		await unlink(`${directory}/${outputFile}`);
	}
});
