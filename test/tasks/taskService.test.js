import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hashPassword } from '../../src/auth/password.js';
import { loginUser } from '../../src/auth/authService.js';
import {
	completeTask,
	createTask,
	deleteTask,
	getCompletedTasks,
	getTasks,
	updateTask,
} from '../../src/tasks/taskService.js';
import { readJson } from '../../src/utils/readJson.js';
import { writeJson } from '../../src/utils/writeJson.js';

async function withEmptyTasks(callback) {
	const originalTasks = await readJson('tasks.json');
	const originalUsers = await readJson('users.json');
	const originalSessions = await readJson('auth.json');
	const originalNotifications = await readJson('notifications.json');
	const password = 'task-test-password';

	await writeJson('tasks.json', []);
	await writeJson('users.json', [{
		id: 'task-test-user',
		email: 'task@example.com',
		passwordHash: await hashPassword(password)
	}]);
	await writeJson('auth.json', []);
	await writeJson('notifications.json', []);

	try {
		const loginResult = await loginUser('task@example.com', password);
		await callback(loginResult.token);
	} finally {
		await writeJson('tasks.json', originalTasks);
		await writeJson('users.json', originalUsers);
		await writeJson('auth.json', originalSessions);
		await writeJson('notifications.json', originalNotifications);
	}
}

test('task lifecycle creates, lists, updates, completes, paginates, and deletes', async () => {
	await withEmptyTasks(async (token) => {
		const task = await createTask(token, { title: ' First task ', description: 'Initial work' });
		const createdNotifications = await readJson('notifications.json');
		assert.equal(task.userId, 'task-test-user');
		assert.equal(task.title, 'First task');
		assert.equal(task.completed, false);
		assert.equal(task.completedAt, null);
		assert.equal(createdNotifications.length, 1);
		assert.equal(createdNotifications[0].userId, 'task-test-user');
		assert.equal(createdNotifications[0].notificationType, 'TASK_CREATED');
		assert.equal(createdNotifications[0].message, 'Task created successfully');

		assert.equal((await getTasks(token)).length, 1);

		const updatedTask = await updateTask(token, task.id, { title: 'Updated task', description: 'Changed work' });
		assert.equal(updatedTask.title, 'Updated task');

		const completedTask = await completeTask(token, task.id);
		const completedNotifications = await readJson('notifications.json');
		assert.equal(completedTask.completed, true);
		assert.ok(completedTask.completedAt);
		assert.equal(completedNotifications.length, 2);
		assert.equal(completedNotifications[1].userId, 'task-test-user');
		assert.equal(completedNotifications[1].notificationType, 'TASK_COMPLETED');
		assert.equal(completedNotifications[1].message, 'Task completed successfully');

		const page = await getCompletedTasks(token, 1, 1);
		assert.deepEqual(page.tasks.map((item) => item.id), [task.id]);
		assert.equal(page.total, 1);
		assert.equal(page.totalPages, 1);

		assert.equal(await deleteTask(token, task.id), true);
		assert.equal((await getTasks(token)).length, 0);
	});
});

test('task operations enforce ownership', async () => {
	await withEmptyTasks(async (tokenA) => {
		const users = await readJson('users.json');
		const passwordB = 'task-test-password-b';
		users.push({
			id: 'task-test-user-b',
			email: 'task-b@example.com',
			passwordHash: await hashPassword(passwordB)
		});
		await writeJson('users.json', users);

		const loginB = await loginUser('task-b@example.com', passwordB);
		const taskA = await createTask(tokenA, { title: 'User A task' });

		assert.deepEqual(await getTasks(loginB.token), []);
		await assert.rejects(updateTask(loginB.token, taskA.id, { title: 'Stolen task' }), /Task not found/);
		await assert.rejects(deleteTask(loginB.token, taskA.id), /Task not found/);
		await assert.rejects(completeTask(loginB.token, taskA.id), /Task not found/);
	});
});