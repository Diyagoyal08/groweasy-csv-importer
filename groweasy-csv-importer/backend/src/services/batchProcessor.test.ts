import { describe, expect, it } from "vitest";
import { sanitizeRecord } from "./batchProcessor";

describe("sanitizeRecord", () => {
  it("keeps the first email and phone while appending extras to crm_note", () => {
    const result = sanitizeRecord({
      created_at: "2024-05-10",
      name: "Jane Doe",
      email: "first@example.com, second@example.com",
      country_code: "+91",
      mobile_without_country_code: "+91 98765 43210, +91 99999 00000",
      company: "GrowEasy",
      city: "Bengaluru",
      state: "KA",
      country: "India",
      lead_owner: "Alex",
      crm_status: "good_lead_follow_up",
      crm_note: "Original note",
      data_source: "Meridian Tower",
      possession_time: "2025",
      description: "Interested in plots",
    });

    expect(result.email).toBe("first@example.com");
    expect(result.mobile_without_country_code).toBe("9876543210");
    expect(result.country_code).toBe("+91");
    expect(result.crm_note).toContain("Additional emails");
    expect(result.crm_note).toContain("Additional phone numbers");
  });

  it("returns empty enum values for unsupported statuses and sources", () => {
    const result = sanitizeRecord({
      crm_status: "unknown",
      data_source: "random",
    });

    expect(result.crm_status).toBe("");
    expect(result.data_source).toBe("");
  });
});
