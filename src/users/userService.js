import { randomUUID } from 'node:crypto';
import { readJson } from '../utils/readJson.js';
import { writeJson } from '../utils/writeJson.js';
import { hashPassword } from '../auth/password.js';

export async function registerUser(userData) {
    // Stop early when the caller does not provide an object to register.
    if (!userData || typeof userData !== 'object') {
        throw new TypeError('User data is required');
    }

    // Keep the password separate so only its hash is written to users.json.
    const { email, password, ...profile } = userData;

    // Email is required because it is used to identify duplicate accounts.
    if (typeof email !== 'string' || email.trim() === '') {
        throw new TypeError('A valid email is required');
    }

    // Validate the password before hashing it for secure storage.
    if (typeof password !== 'string' || password.trim() === '') {
        throw new TypeError('A password is required');
    }

    // Check the original length so surrounding spaces do not invalidate a real password.
    if (password.length < 8) {
        throw new TypeError('A password must be at least 8 characters');
    }

    // Load the existing users before checking uniqueness and creating the new ID.
    const users = await readJson('users.json');
    // Treat email casing and surrounding whitespace consistently.
    const normalizedEmail = email.trim().toLowerCase();

    // Prevent two accounts from being registered with the same email address.
    if (users.some((user) => user.email?.toLowerCase() === normalizedEmail)) {
        throw new Error('A user with this email already exists');
    }

    // Generate a globally unique UUID instead of relying on sequential numbers.
    const id = randomUUID();
    // Hash the validated password before storing anything about it.
    const passwordHash = await hashPassword(password);
    // Use one timestamp for both creation and last-modified times at registration.
    const timestamp = new Date().toISOString();

    // Build the stored record with the hash, never the plaintext password.
    const user = {
        id,
        ...profile,
        email: normalizedEmail,
        passwordHash,
        createdAt: timestamp,
        updatedAt: timestamp,
    };

    // Persist the new record before returning it to the caller.
    users.push(user);
    await writeJson('users.json', users);

    return user;
}