import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { getCurrentUser, updateProfile } from '../../auth/authService.js';  // Prompts for auth token and displays current user details.


export async function meCommand() {
  const rl = readline.createInterface({ input, output });

  try {
    console.log('\n--- Current User Profile ---\n');

    const token = await rl.question('Auth Token: ');

    const user = await getCurrentUser(token);

    console.log('\n✅ User Profile Found:');
    console.log(`  User ID: ${user.id}`);
    if (user.firstName) console.log(`  First Name: ${user.firstName}`);
    if (user.lastName)  console.log(`  Last Name: ${user.lastName}`);
    if (user.email)     console.log(`  Email: ${user.email}`);
    if (user.country)   console.log(`  Country: ${user.country}`);
  } finally {
    rl.close();
  }
}


// Prompts user for auth token, displays current values, collects modified fields, and calls updateProfile(token, updates).
export async function updateProfileCommand() {
  const rl = readline.createInterface({ input, output });

  try {
    console.log('\n--- Update Profile ---\n');

    const token = await rl.question('Auth Token: ');

    // Get current user to show existing values
    const currentUser = await getCurrentUser(token);
    console.log('\nLeave field blank to keep current value.\n');

    const firstNameInput = await rl.question(`First name (${currentUser.firstName || 'N/A'}): `);
    const lastNameInput  = await rl.question(`Last name (${currentUser.lastName || 'N/A'}): `);
    const emailInput     = await rl.question(`Email (${currentUser.email || 'N/A'}): `);
    const countryInput   = await rl.question(`Country (${currentUser.country || 'N/A'}): `);

    // Build updates object containing only modified fields
    const updates = {};
    if (firstNameInput.trim()) updates.firstName = firstNameInput.trim();
    if (lastNameInput.trim())  updates.lastName  = lastNameInput.trim();
    if (emailInput.trim())     updates.email     = emailInput.trim();
    if (countryInput.trim())   updates.country   = countryInput.trim();

    if (Object.keys(updates).length === 0) {
      console.log('\nℹ️ No changes made.');
      return;
    }

    const updatedUser = await updateProfile(token, updates);

    console.log('\n✅ Profile updated successfully!');
    console.log(`  User ID: ${updatedUser.id}`);
    if (updatedUser.firstName) console.log(`  First Name: ${updatedUser.firstName}`);
    if (updatedUser.lastName)  console.log(`  Last Name: ${updatedUser.lastName}`);
    if (updatedUser.email)     console.log(`  Email: ${updatedUser.email}`);
    if (updatedUser.country)   console.log(`  Country: ${updatedUser.country}`);
  } finally {
    rl.close();
  }
}