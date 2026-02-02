import * as readline from 'node:readline';

/**
 * Ask the user for confirmation
 *
 * @param message - The prompt message
 * @param defaultValue - Default value if user presses enter (default: false)
 * @returns Promise resolving to user's choice
 */
export async function confirm(
  message: string,
  defaultValue: boolean = false
): Promise<boolean> {
  const hint = defaultValue ? '[Y/n]' : '[y/N]';
  const prompt = `${message} ${hint} `;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise<boolean>((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();

      const trimmed = answer.trim().toLowerCase();

      if (trimmed === '') {
        resolve(defaultValue);
        return;
      }

      if (trimmed === 'y' || trimmed === 'yes') {
        resolve(true);
        return;
      }

      if (trimmed === 'n' || trimmed === 'no') {
        resolve(false);
        return;
      }

      // Invalid input, return default
      resolve(defaultValue);
    });
  });
}

/**
 * Ask the user to confirm a destructive action
 *
 * @param actionDescription - Description of what will happen
 * @param itemCount - Number of items affected
 * @returns Promise resolving to user's choice
 */
export async function confirmDestructiveAction(
  actionDescription: string,
  itemCount: number
): Promise<boolean> {
  const message = `This will ${actionDescription} ${itemCount} configuration(s). Continue?`;
  return confirm(message, false);
}
