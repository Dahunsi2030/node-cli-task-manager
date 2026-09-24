import userService from '../../services/userService.js';
import { stdin as input, stdout as output } from 'node:process';
import readline from 'node:readline';
import { registerUser } from '../../users/userService.js';


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
        if (result && result.userId) {
            console.log(`User ID: ${result.userId}`);
        }
    } finally {
            rl.close();
    }
} 