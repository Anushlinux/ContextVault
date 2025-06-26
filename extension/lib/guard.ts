// extension/lib/guard.ts
import { requireAuth } from "./auth";
import { saveUserContext, UserContext } from "./contextManager";

/**
 * A guarded version of saveUserContext that requires wallet authentication.
 * @param context The user context to save.
 * @returns The CID of the saved context.
 */
export async function guardedSave(context: UserContext): Promise<string> {
  // This line ensures the user is authenticated before proceeding.
  // It will throw an error if the user cancels, which will be caught in the UI.
  await requireAuth();

  // If authentication is successful, call the original save function.
  return saveUserContext(context);
}
