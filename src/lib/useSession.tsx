import { authClient } from "./authClient";

// IMPORTANT: Use this hook for global state management of the user session
// This hook can be used to get the current user session with Supabase Auth
// The type looks like this:
// const useSession: () => {
//   data: {
//     user: {
//       id: string;
//       email: string;
//       name: string;
//       emailVerified: boolean;
//       image?: string | null;
//       createdAt: Date;
//       updatedAt: Date;
//     };
//     session: {
//       id: string;
//       userId: string;
//       token: string;
//       expiresAt: Date;
//       createdAt: Date;
//       updatedAt: Date;
//     };
//   } | null;
//   isPending: boolean;
//   error: AuthError | null;
//   refetch: () => void;
// }

export const useSession = () => authClient.useSession();
