/**
 * Clipboard Utilities
 * Secure clipboard operations with auto-clear functionality
 */

/**
 * Copy text to clipboard with auto-clear after specified duration
 * @param text - Text to copy to clipboard
 * @param clearAfterMs - Duration in milliseconds before clearing clipboard (default: 30000ms = 30s)
 * @returns Promise that resolves to true if successful, false otherwise
 */
export async function copyToClipboard(
  text: string,
  clearAfterMs: number = 30000
): Promise<boolean> {
  try {
    // Try modern Clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);

      // Schedule clipboard clear
      if (clearAfterMs > 0) {
        setTimeout(async () => {
          try {
            // Only clear if the clipboard still contains our text
            const currentClipboard = await navigator.clipboard.readText();
            if (currentClipboard === text) {
              await navigator.clipboard.writeText('');
            }
          } catch (error) {
            // Ignore errors when clearing (user might have denied permission)
            console.debug('Could not auto-clear clipboard:', error);
          }
        }, clearAfterMs);
      }

      return true;
    }

    // Fallback for older browsers
    return fallbackCopyToClipboard(text);
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    // Try fallback method
    return fallbackCopyToClipboard(text);
  }
}

/**
 * Fallback clipboard copy method for older browsers
 * Creates a temporary textarea element to copy text
 */
function fallbackCopyToClipboard(text: string): boolean {
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;

    // Make the textarea invisible and position it off-screen
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    textArea.style.opacity = '0';
    textArea.setAttribute('readonly', '');

    document.body.appendChild(textArea);

    // Select and copy
    textArea.select();
    textArea.setSelectionRange(0, text.length);

    const successful = document.execCommand('copy');

    // Clean up
    document.body.removeChild(textArea);

    return successful;
  } catch (error) {
    console.error('Fallback copy failed:', error);
    return false;
  }
}

/**
 * Copy password to clipboard with security features
 * - Auto-clears after 30 seconds (configurable)
 * - Returns success status
 * @param password - Password to copy
 * @param clearAfterSeconds - Duration in seconds before clearing (default: 30)
 */
export async function copyPassword(
  password: string,
  clearAfterSeconds: number = 30
): Promise<boolean> {
  return copyToClipboard(password, clearAfterSeconds * 1000);
}

/**
 * Copy username to clipboard
 * - Does not auto-clear (usernames are less sensitive)
 * @param username - Username to copy
 */
export async function copyUsername(username: string): Promise<boolean> {
  return copyToClipboard(username, 0); // No auto-clear for usernames
}

/**
 * Check if clipboard API is available
 */
export function isClipboardSupported(): boolean {
  return !!(navigator.clipboard && navigator.clipboard.writeText);
}

/**
 * Get remaining time before clipboard auto-clear
 * This is a helper for showing countdown timers
 * @param copiedAt - Timestamp when text was copied
 * @param clearAfterSeconds - Duration before clearing
 * @returns Remaining seconds, or 0 if already cleared
 */
export function getRemainingClearTime(
  copiedAt: number,
  clearAfterSeconds: number
): number {
  const elapsed = (Date.now() - copiedAt) / 1000;
  const remaining = Math.max(0, clearAfterSeconds - elapsed);
  return Math.ceil(remaining);
}

/**
 * Format remaining time as human-readable string
 * @param seconds - Remaining seconds
 * @returns Formatted string like "29s" or "1m 30s"
 */
export function formatRemainingTime(seconds: number): string {
  if (seconds <= 0) return '0s';

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}
