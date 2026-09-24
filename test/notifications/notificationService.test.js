import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hashPassword } from '../../src/auth/password.js';
import { loginUser } from '../../src/auth/authService.js';
import {
	clearNotifications,
	createNotification,
	getNotificationCounts,
	markNotificationRead,
	markNotificationUnread,
} from '../../src/notifications/notificationService.js';
import { readJson } from '../../src/utils/readJson.js';
import { writeJson } from '../../src/utils/writeJson.js';

async function withNotificationUsers(callback) {
	const originalUsers = await readJson('users.json');
	const originalSessions = await readJson('auth.json');
	const originalNotifications = await readJson('notifications.json');
	const password = 'notification-password';

	await writeJson('users.json', [
		{ id: 'notification-user-a', email: 'notification-a@example.com', passwordHash: await hashPassword(password) },
		{ id: 'notification-user-b', email: 'notification-b@example.com', passwordHash: await hashPassword(password) },
	]);
	await writeJson('auth.json', []);
	await writeJson('notifications.json', []);

	try {
		const loginA = await loginUser('notification-a@example.com', password);
		const loginB = await loginUser('notification-b@example.com', password);
		await callback(loginA.token, loginB.token);
	} finally {
		await writeJson('users.json', originalUsers);
		await writeJson('auth.json', originalSessions);
		await writeJson('notifications.json', originalNotifications);
	}
}

test('createNotification creates and persists an unread notification', async () => {
	const originalNotifications = await readJson('notifications.json');

	try {
		const notification = await createNotification(
			' user-123 ',
			'TASK_COMPLETED ',
			' Your task is complete '
		);
		const savedNotifications = await readJson('notifications.json');

		assert.equal(typeof notification.notificationId, 'string');
		assert.equal(notification.userId, 'user-123');
		assert.equal(notification.notificationType, 'TASK_COMPLETED');
		assert.equal(notification.message, 'Your task is complete');
		assert.equal(notification.isRead, false);
		assert.ok(notification.createdAt);
		assert.deepEqual(savedNotifications, [notification]);
	} finally {
		await writeJson('notifications.json', originalNotifications);
	}
});

test('createNotification rejects invalid notification input', async () => {
	await assert.rejects(
		createNotification('user-123', 'TASK_CREATED', '   '),
		{ name: 'TypeError', message: 'A notification message is required' }
	);
});

test('notification actions update read state and counts', async () => {
	await withNotificationUsers(async (tokenA) => {
		const first = await createNotification('notification-user-a', 'TASK_CREATED', 'First task');
		const second = await createNotification('notification-user-a', 'TASK_COMPLETED', 'Second task');

		assert.deepEqual(await getNotificationCounts(tokenA), { total: 2, unread: 2, read: 0 });
		await markNotificationRead(tokenA, first.notificationId);
		assert.deepEqual(await getNotificationCounts(tokenA), { total: 2, unread: 1, read: 1 });
		await markNotificationUnread(tokenA, first.notificationId);
		assert.deepEqual(await getNotificationCounts(tokenA), { total: 2, unread: 2, read: 0 });
		assert.equal(second.isRead, false);
	});
});

test('notification actions cannot access another user notifications', async () => {
	await withNotificationUsers(async (tokenA, tokenB) => {
		const notificationA = await createNotification('notification-user-a', 'TASK_CREATED', 'User A task');
		await createNotification('notification-user-b', 'TASK_CREATED', 'User B task');

		await assert.rejects(markNotificationRead(tokenB, notificationA.notificationId), /Notification not found/);
		await assert.rejects(markNotificationUnread(tokenB, notificationA.notificationId), /Notification not found/);
		assert.deepEqual(await getNotificationCounts(tokenB), { total: 1, unread: 1, read: 0 });

		assert.equal(await clearNotifications(tokenB), 1);
		assert.deepEqual(await getNotificationCounts(tokenA), { total: 1, unread: 1, read: 0 });
	});
});