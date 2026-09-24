import { randomUUID } from 'node:crypto';
import { getCurrentUser } from '../auth/authService.js';
import { readJson } from '../utils/readJson.js';
import { writeJson } from '../utils/writeJson.js';

const FILE_NAME = 'notifications.json';
const VALID_TYPES = ['TASK_CREATED', 'TASK_COMPLETED', 'TASK_DELETED', 'USER_REGISTERED', 'USER_DELETED'];

async function readNotifications() {
	return readJson(FILE_NAME);
}


// Create and persist an unread notification for a user.
export async function createNotification(userId, notificationType, message) {
	// Require a non-empty user ID so the notification has an owner.
	if (typeof userId !== 'string' || userId.trim() === '') {
		throw new TypeError('A valid user ID is required');
	}

	// Require a non-empty type to describe why the notification was created.
	if (typeof notificationType !== 'string' || notificationType.trim() === '') {
		throw new TypeError('A valid notification type is required');
	}

    if (!VALID_TYPES.includes(notificationType.trim().toUpperCase())) {
        throw new TypeError(`Invalid notification type. Valid types are: ${VALID_TYPES.join(', ')}`);
    }

	// Require a non-empty message for the user to read.
	if (typeof message !== 'string' || message.trim() === '') {
		throw new TypeError('A notification message is required');
	}

	const notification = {
		notificationId: randomUUID(),
		userId: userId.trim(),
		notificationType: notificationType.trim().toUpperCase(),
		message: message.trim(),
		isRead: false,
		createdAt: new Date().toISOString(),
	};

	// Load existing notifications before adding the new record.
	const notifications = await readNotifications();
	notifications.push(notification);
	await writeJson(FILE_NAME, notifications);

	return notification;
}

// Find a notification only when it belongs to the authenticated user.
async function findOwnedNotification(token, notificationId) {
	const authenticatedUser = await getCurrentUser(token);

	if (typeof notificationId !== 'string' || notificationId.trim() === '') {
		throw new TypeError('A valid notification ID is required');
	}

	const notifications = await readNotifications();
	const notification = notifications.find(
		(item) => item.notificationId === notificationId && item.userId === authenticatedUser.id
	);

	if (!notification) {
		throw new Error('Notification not found');
	}

	return { notifications, notification };
}

// Mark one of the authenticated user's notifications as read.
export async function markNotificationRead(token, notificationId) {
	const { notifications, notification } = await findOwnedNotification(token, notificationId);
	notification.isRead = true;
	await writeJson(FILE_NAME, notifications);
	return notification;
}

// Mark one of the authenticated user's notifications as unread.
export async function markNotificationUnread(token, notificationId) {
	const { notifications, notification } = await findOwnedNotification(token, notificationId);
	notification.isRead = false;
	await writeJson(FILE_NAME, notifications);
	return notification;
}

// Remove all notifications belonging to the authenticated user.
export async function clearNotifications(token) {
	const authenticatedUser = await getCurrentUser(token);
	const notifications = await readNotifications();
	const remainingNotifications = notifications.filter(
		(notification) => notification.userId !== authenticatedUser.id
	);
	const removedCount = notifications.length - remainingNotifications.length;

	await writeJson(FILE_NAME, remainingNotifications);
	return removedCount;
}

// Count all, unread, and read notifications belonging to the authenticated user.
export async function getNotificationCounts(token) {
	const authenticatedUser = await getCurrentUser(token);
	const notifications = await readNotifications();
	const userNotifications = notifications.filter(
		(notification) => notification.userId === authenticatedUser.id
	);
	const unread = userNotifications.filter((notification) => !notification.isRead).length;

	return {
		total: userNotifications.length,
		unread,
		read: userNotifications.length - unread,
	};
}
