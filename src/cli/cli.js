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
        `)
        return;
    }

    // handle recognised commands
    switch (command.toLowerCase()) {
        case 'register':
            // Handle register command
            console.log('Register command selected')
            break;

        case 'login':
            // Handle login command
            console.log('Login command selected')
            break;
            
        case 'logout':
            // handle logout command
            console.log('Logout command selected')
            break;
        default:
            console.error(`Unknown command: ${command}`);
            console.log (`
                Usage: node index.js <command> [options]
                
                Available commands:
                register    Register a new user account
                login       Log into an existing account
            `)
    }
}