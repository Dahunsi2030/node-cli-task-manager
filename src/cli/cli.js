import { registerCommand, loginCommand, logoutCommand } from './commands/authCommands.js';
import {meCommand, updateProfileCommand } from './commands/userCommands.js';

/**
 * Entry point for the CLI interface.
*/


export async function runCLI() {
    const command = process.argv[2]

    // handle case: node index.js (no command passed)
    if (!command) {
        console.log (`
            Usage: node index.js <command> [options]
            
            Available commands:
            register    Register a new user account
            login       Log into an existing account
            logout      Log out of the current account
        `)
        return;
    }

    // handle recognised commands
    switch (command.toLowerCase()) {
        case 'register':
            // Handle register command
            await registerCommand();
            break;

        case 'login':
            // Handle login command
            await loginCommand();
            break;

        case 'logout':
            // handle logout command
            await logoutCommand();
            break;

        case 'me':
            await meCommand();
            break;

        case 'update-profile':
            await updateProfileCommand();
            break;

        default:
            console.error(`Unknown command: ${command}`);
            console.log (`
                Usage: node index.js <command> [options]
                
                Available commands:
                register    Register a new user account
                login       Log into an existing account
                logout      Log out of the current account
                me          Display current user profile
            `)
    }
}