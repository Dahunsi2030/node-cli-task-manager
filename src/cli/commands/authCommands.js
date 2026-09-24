import { stdin as input, stdout as output } from 'node:process';
import readline from 'node:readline/promises';
import { registerUser } from '../../users/userService.js';
import { loginUser, logoutUser } from '../../auth/authService.js';


// Prompt the user for input in the command line interface.
export async function registerCommand() {
    const rl = readline.createInterface({ input, output });

    try {
        console.log ('\n---Register a new user account---\n');

        const firstName = await rl.question('First Name: ');
        const lastName = await rl.question('Last Name: ');
        const email = await rl.question('Email: ');
        const password = await rl.question('Password: ');
        const country = await rl.question('Country: ');

        const result = await registerUser({
            firstName,
            lastName,
            email,
            password,
            country
        });

        console.log('\n✅User registered successfully!');
        if (result && result.id) {
            console.log(`User ID: ${result.id}`);
        }
    } finally {
            rl.close();
    }
} 

// Prompts user for email and password, then logs them in using the loginUser service.
export async function loginCommand() {
    const rl = readline.createInterface({ input, output });

    try {
        console.log ('\n---Account Login---\n');

        const email = await rl.question('Email: ');
        const password = await rl.question('Password: ');

        const result = await loginUser(email, password);

        console.log('\n✅Login successful!');
        if (result && result.token) {
            console.log(`Auth Token: ${result.token}`);
        }
    } catch (error) {
        console.error(`\n❌Login failed: ${error.message}`);
    } finally {
        rl.close();
    }

}

// Prompts for the session token and invalidates the user session using logoutUser service.
export async function logoutCommand() {
  const rl = readline.createInterface({ input, output });

  try {
    console.log('\n--- Account Logout ---');

    const token = await rl.question('Auth Token: ');

    const result = await logoutUser(token);

    if (result) {
            console.log('\n✅ Logged out successfully!');
    } else {
          console.log('\n❌ Logout failed: Invalid or expired token.');
    }


  } finally {
    rl.close();
  }
}