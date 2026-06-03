import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildAtlasTeamVerificationSummary,
  clearAtlasTeamVerificationSummary,
  isAtlasTeamVerifiedSummary,
} from "./atlasTeamVerification";

describe("atlasTeamVerification", () => {
  it("buildAtlasTeamVerificationSummary sets atlasTeamVerified", () => {
    const summary = buildAtlasTeamVerificationSummary();
    assert.equal(summary.atlasTeamVerified, true);
    assert.equal(summary.passed, true);
    assert.equal(isAtlasTeamVerifiedSummary(summary), true);
  });

  it("clearAtlasTeamVerificationSummary removes team-only summaries", () => {
    const summary = buildAtlasTeamVerificationSummary();
    assert.equal(clearAtlasTeamVerificationSummary(summary), null);
  });
});
