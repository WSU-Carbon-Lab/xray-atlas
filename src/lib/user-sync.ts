import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../amplify/data/resource";
import { fetchORCIDProfile, type ORCIDProfile } from "./orcid-api";
import { getCurrentUserAttributes, type UserAttributes } from "./auth";

const client = generateClient<Schema>();

export const syncUserWithORCID = async (): Promise<void> => {
  try {
    const userAttributes = await getCurrentUserAttributes();
    if (!userAttributes) {
      throw new Error("No authenticated user found");
    }

    // Check if user already exists in DataStore
    const existingUsers = await client.models.User.list({
      filter: { orcid_id: { eq: userAttributes.orcid_id } },
    });

    if (existingUsers.data.length > 0) {
      console.log("User already exists in DataStore");
      return;
    }

    // Fetch ORCID profile data
    const orcidProfile = await fetchORCIDProfile(userAttributes.orcid_id);

    // Create user record in DataStore
    const userData = {
      orcid_id: userAttributes.orcid_id,
      email: userAttributes.email,
      name: orcidProfile?.name || userAttributes.name,
      auxiliary_emails: orcidProfile?.emails || [],
      contact_info: orcidProfile?.biography || "",
      profile_picture_url: `https://orcid.org/sites/default/files/images/orcid_128x128.png`, // Default ORCID avatar
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await client.models.User.create(userData);
    console.log("User synced with ORCID data successfully");
  } catch (error) {
    console.error("Error syncing user with ORCID:", error);
    throw error;
  }
};

export const updateUserProfile = async (updates: {
  auxiliary_emails?: string[];
  contact_info?: string;
  profile_picture_url?: string;
}): Promise<void> => {
  try {
    const userAttributes = await getCurrentUserAttributes();
    if (!userAttributes) {
      throw new Error("No authenticated user found");
    }

    // Find the user record
    const existingUsers = await client.models.User.list({
      filter: { orcid_id: { eq: userAttributes.orcid_id } },
    });

    if (existingUsers.data.length === 0) {
      throw new Error("User not found in DataStore");
    }

    const user = existingUsers.data[0];
    if (!user) {
      throw new Error("User not found");
    }

    // Update the user record
    await client.models.User.update({
      id: user.id,
      ...updates,
      updated_at: new Date().toISOString(),
    });

    console.log("User profile updated successfully");
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};
