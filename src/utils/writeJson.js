// writeFile lets us save files asynchronously without blocking the application.
import { writeFile } from 'node:fs/promises';

// path helps us build file paths correctly on every operating system.
import path from 'node:path';

// Convert a JavaScript value to JSON and save it to a file.
export async function writeJson(fileName, data, directory = 'data') {
    // Use the current project folder, the selected directory, and the file name.
    // The directory defaults to "data" when the caller does not provide one.
    const filePath = path.join(process.cwd(), directory, fileName);

    try {
        // Convert the JavaScript value to formatted JSON text.
        const fileContent = JSON.stringify(data, null, 2);

        // Save the JSON text to the selected file.
        await writeFile(filePath, fileContent, 'utf-8');

        return true;

    } catch (error) {
        // Add the file path to the error so it is easier to diagnose failures.
        throw new Error(`Failed to write JSON file at "${filePath}": ${error.message}`);
    }
}
