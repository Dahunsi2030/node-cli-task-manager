// readFile lets us read files asynchronously without blocking the application.
import { readFile } from 'node:fs/promises';

// path helps us build file paths correctly on every operating system.
import path from 'node:path';

// Read and convert a JSON file into a JavaScript value.
export async function readJson(fileName, directory = 'data') {
    // Use the current project folder, the selected directory, and the file name.
    // The directory defaults to "data" when the caller does not provide one.
    const filePath = path.join(process.cwd(), directory, fileName);

    try {
        // Wait for the file contents and read them as text.
        const fileContent = await readFile(filePath, 'utf-8');

        // Convert the JSON text into a JavaScript object or array.
        return JSON.parse(fileContent);
    } catch (error) {
        // Add the file path to the error so it is easier to diagnose failures.
        throw new Error(`Failed to read or parse JSON file at "${filePath}": ${error.message}`);
    }
}