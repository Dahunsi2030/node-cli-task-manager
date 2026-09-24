import { runCLI } from './src/cli/cli.js';

runCLI().catch((error) => {
  console.error('Fatal CLI Error:', error.message);
  process.exit(1);
});