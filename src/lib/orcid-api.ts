export interface ORCIDProfile {
  orcid_id: string;
  name?: string;
  emails?: string[];
  affiliations?: Array<{
    organization: string;
    department?: string;
    title?: string;
    start_date?: string;
    end_date?: string;
  }>;
  employment?: Array<{
    organization: string;
    department?: string;
    title?: string;
    start_date?: string;
    end_date?: string;
  }>;
  biography?: string;
  country?: string;
  keywords?: string[];
}

export const fetchORCIDProfile = async (
  orcidId: string,
): Promise<ORCIDProfile | null> => {
  try {
    // Remove any URL formatting from ORCID ID
    const cleanOrcidId = orcidId
      .replace(/^https?:\/\/orcid\.org\//, "")
      .replace(/\/$/, "");

    const response = await fetch(`https://pub.orcid.org/v3.0/${cleanOrcidId}`, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "X-ray Atlas (https://github.com/WSU-Carbon-Lab/xray-atlas)",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("ORCID profile not found");
      }
      throw new Error(`Failed to fetch ORCID profile: ${response.status}`);
    }

    const data = await response.json();

    // Parse the ORCID API response
    const person = data.person;
    if (!person) {
      throw new Error("Invalid ORCID profile data");
    }

    const profile: ORCIDProfile = {
      orcid_id: cleanOrcidId,
    };

    // Extract name
    if (person.name) {
      const givenNames = person.name["given-names"]?.value || "";
      const familyName = person.name["family-name"]?.value || "";
      profile.name = `${givenNames} ${familyName}`.trim();
    }

    // Extract emails
    if (person.emails?.email) {
      profile.emails = person.emails.email
        .filter((email: any) => email.primary)
        .map((email: any) => email.email);
    }

    // Extract biography
    if (person.biography?.content) {
      profile.biography = person.biography.content;
    }

    // Extract country
    if (person.addresses?.address) {
      const primaryAddress = person.addresses.address.find(
        (addr: any) => addr.primary,
      );
      if (primaryAddress?.country) {
        profile.country = primaryAddress.country.value;
      }
    }

    // Extract keywords
    if (person.keywords?.keyword) {
      profile.keywords = person.keywords.keyword.map((kw: any) => kw.content);
    }

    // Extract employment history
    if (person.activities?.employments?.employment) {
      profile.employment = person.activities.employments.employment.map(
        (emp: any) => ({
          organization: emp.organization?.name || "Unknown",
          department: emp.organization?.address?.department,
          title: emp["job-title"],
          start_date: emp["start-date"]
            ? `${emp["start-date"].year}-${String(emp["start-date"].month || 1).padStart(2, "0")}-${String(emp["start-date"].day || 1).padStart(2, "0")}`
            : undefined,
          end_date: emp["end-date"]
            ? `${emp["end-date"].year}-${String(emp["end-date"].month || 1).padStart(2, "0")}-${String(emp["end-date"].day || 1).padStart(2, "0")}`
            : undefined,
        }),
      );
    }

    // Extract affiliations
    if (person.activities?.educations?.education) {
      profile.affiliations = person.activities.educations.education.map(
        (edu: any) => ({
          organization: edu.organization?.name || "Unknown",
          department: edu.organization?.address?.department,
          title: edu["role-title"],
          start_date: edu["start-date"]
            ? `${edu["start-date"].year}-${String(edu["start-date"].month || 1).padStart(2, "0")}-${String(edu["start-date"].day || 1).padStart(2, "0")}`
            : undefined,
          end_date: edu["end-date"]
            ? `${edu["end-date"].year}-${String(edu["end-date"].month || 1).padStart(2, "0")}-${String(edu["end-date"].day || 1).padStart(2, "0")}`
            : undefined,
        }),
      );
    }

    return profile;
  } catch (error) {
    console.error("Error fetching ORCID profile:", error);
    throw error;
  }
};
