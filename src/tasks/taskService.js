import { randomUUID } from 'node:crypto';
import { getCurrentUser } from '../auth/authService.js';
import { createNotification } from '../notifications/notificationService.js';
import { readJson } from '../utils/readJson.js';
import { writeJson } from '../utils/writeJson.js';

const taskFile = 'tasks.json';

// Read the current task list from persistent storage.
async function readTasks() {
	return readJson(taskFile);
}

// Save the complete task list to persistent storage.
async function saveTasks(tasks) {
	await writeJson(taskFile, tasks);
}

// Create and persist a new incomplete task for the authenticated user.
export async function createTask(token, taskData) {
	// Authenticate the owner before creating the task.
	const authenticatedUser = await getCurrentUser(token);

	if (!taskData || typeof taskData !== 'object' || Array.isArray(taskData)) {
		throw new TypeError('Task data must be an object');
	}

	if (typeof taskData.title !== 'string' || taskData.title.trim() === '') {
		throw new TypeError('A task title is required');
	}

	const timestamp = new Date().toISOString();
	const task = {
		id: randomUUID(),
		userId: authenticatedUser.id,
		title: taskData.title.trim(),
		description: typeof taskData.description === 'string' ? taskData.description : '',
		completed: false,
		completedAt: null,
		createdAt: timestamp,
		updatedAt: timestamp,
	};

	const tasks = await readTasks();
	tasks.push(task);
	await saveTasks(tasks);
	await createNotification(authenticatedUser.id, 'TASK_CREATED', 'Task created successfully');

	return task;
}

// Return only tasks owned by the authenticated user.
export async function getTasks(token) {
	const authenticatedUser = await getCurrentUser(token);
	const tasks = await readTasks();

	return tasks.filter((task) => task.userId === authenticatedUser.id);
}

// Update an editable field on a task owned by the authenticated user.
export async function updateTask(token, taskId, updates) {
	const authenticatedUser = await getCurrentUser(token);

	if (typeof taskId !== 'string' || taskId.trim() === '') {
		throw new TypeError('A valid task ID is required');
	}

	if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
		throw new TypeError('Task updates must be an object');
	}

	const allowedFields = new Set(['title', 'description']);
	for (const field of Object.keys(updates)) {
		if (!allowedFields.has(field)) {
			throw new Error(`Cannot update task field: ${field}`);
		}
	}

	if (Object.hasOwn(updates, 'title') &&
		(typeof updates.title !== 'string' || updates.title.trim() === '')) {
		throw new TypeError('A task title is required');
	}

	const tasks = await readTasks();
	const task = tasks.find(
		(savedTask) => savedTask.id === taskId && savedTask.userId === authenticatedUser.id
	);

	if (!task) {
		throw new Error('Task not found');
	}

	if (Object.hasOwn(updates, 'title')) task.title = updates.title.trim();
	if (Object.hasOwn(updates, 'description')) task.description = updates.description;
	task.updatedAt = new Date().toISOString();

	await saveTasks(tasks);
	return task;
}

// Remove a task owned by the authenticated user.
export async function deleteTask(token, taskId) {
	const authenticatedUser = await getCurrentUser(token);
	const tasks = await readTasks();
	const task = tasks.find(
		(savedTask) => savedTask.id === taskId && savedTask.userId === authenticatedUser.id
	);

	if (!task) {
		throw new Error('Task not found');
	}

	const remainingTasks = tasks.filter((savedTask) => savedTask !== task);
	await saveTasks(remainingTasks);
	return true;
}

// Mark a task owned by the authenticated user as completed.
export async function completeTask(token, taskId) {
	const authenticatedUser = await getCurrentUser(token);
	const tasks = await readTasks();
	const task = tasks.find(
		(savedTask) => savedTask.id === taskId && savedTask.userId === authenticatedUser.id
	);

	if (!task) {
		throw new Error('Task not found');
	}

	task.completed = true;
	task.completedAt = new Date().toISOString();
	task.updatedAt = new Date().toISOString();
	await saveTasks(tasks);
	await createNotification(authenticatedUser.id, 'TASK_COMPLETED', 'Task completed successfully');

	return task;
}

// Return completed tasks in pages, with page numbers starting at one.
export async function getCompletedTasks(token, page = 1, limit = 10) {
	const authenticatedUser = await getCurrentUser(token);

	if (!Number.isInteger(page) || page < 1) {
		throw new TypeError('Page must be a positive integer');
	}

	if (!Number.isInteger(limit) || limit < 1) {
		throw new TypeError('Limit must be a positive integer');
	}

	const tasks = await readTasks();
	const completedTasks = tasks.filter(
		(task) => task.userId === authenticatedUser.id && task.completed === true
	);
	const start = (page - 1) * limit;

	return {
		tasks: completedTasks.slice(start, start + limit),
		page,
		limit,
		total: completedTasks.length,
		totalPages: Math.ceil(completedTasks.length / limit),
	};
}