import {
  getCurrentUser,
  signOut as amplifySignOut,
  fetchAuthSession,
} from "aws-amplify/auth";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { useEffect, useState } from "react";

export interface UserAttributes {
  orcid_id: string;
  email: string;
  name?: string;
  sub: string;
}

export const useCurrentUser = () => {
  const { user, signOut } = useAuthenticator();
  const [userAttributes, setUserAttributes] = useState<UserAttributes | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserAttributes = async () => {
      if (user) {
        try {
          await getCurrentUser();
          const session = await fetchAuthSession();
          const tokens = session.tokens;

          if (tokens?.idToken) {
            const payload = tokens.idToken.payload;
            setUserAttributes({
              orcid_id:
                (payload["custom:orcid_id"] as string) ??
                (payload.sub as string),
              email: payload.email as string,
              name: payload.name as string,
              sub: payload.sub as string,
            });
          }
        } catch (error) {
          console.error("Error fetching user attributes:", error);
        }
      } else {
        setUserAttributes(null);
      }
      setLoading(false);
    };

    void fetchUserAttributes();
  }, [user]);

  return {
    user,
    userAttributes,
    loading,
    signOut,
  };
};

export const signInWithORCID = async () => {
  try {
    // For federated sign-in, we'll redirect to the Cognito hosted UI
    // This should be handled by the Authenticator component
    window.location.href = "/sign-in";
  } catch (error) {
    console.error("Error signing in with ORCID:", error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    await amplifySignOut();
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

export const getCurrentUserAttributes =
  async (): Promise<UserAttributes | null> => {
    try {
      await getCurrentUser();
      const session = await fetchAuthSession();
      const tokens = session.tokens;

      if (tokens?.idToken) {
        const payload = tokens.idToken.payload;
        return {
          orcid_id:
            (payload["custom:orcid_id"] as string) ?? (payload.sub as string),
          email: payload.email as string,
          name: payload.name as string,
          sub: payload.sub as string,
        };
      }
      return null;
    } catch (error) {
      console.error("Error getting current user attributes:", error);
      return null;
    }
  };
