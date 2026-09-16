import { describe, expect, it } from "vitest";
import {
  GENERAL_CLUB_ID,
  GENERAL_CLUB_NAME,
  resolveClubChoices,
  resolveEffectiveClubId,
  resolveEffectiveClubName,
} from "./clubSelection";

const PW = { id: "club-pw", name: "PW" };
const GW = { id: "club-gw", name: "GW" };

describe("resolveClubChoices", () => {
  it("returns the real clubs when My Bag has any", () => {
    expect(resolveClubChoices([PW, GW])).toEqual([PW, GW]);
  });

  it("falls back to a single General Practice choice when My Bag is empty", () => {
    expect(resolveClubChoices([])).toEqual([{ id: GENERAL_CLUB_ID, name: GENERAL_CLUB_NAME }]);
  });
});

describe("resolveEffectiveClubId", () => {
  it("keeps the persisted selection when it's still a valid club", () => {
    expect(resolveEffectiveClubId([PW, GW], "club-gw")).toBe("club-gw");
  });

  it("falls back to the first club when nothing was ever selected", () => {
    expect(resolveEffectiveClubId([PW, GW], "")).toBe("club-pw");
  });

  it("falls back to the first club when the selected club was deleted", () => {
    expect(resolveEffectiveClubId([PW, GW], "club-that-no-longer-exists")).toBe("club-pw");
  });

  it("returns the General Practice sentinel when My Bag is empty, regardless of what was persisted", () => {
    expect(resolveEffectiveClubId([], "club-pw")).toBe(GENERAL_CLUB_ID);
  });
});

describe("resolveEffectiveClubName", () => {
  it("returns the matching club's name", () => {
    expect(resolveEffectiveClubName([PW, GW], "club-gw")).toBe("GW");
  });

  it("returns General Practice when My Bag is empty", () => {
    expect(resolveEffectiveClubName([], GENERAL_CLUB_ID)).toBe(GENERAL_CLUB_NAME);
  });

  it("returns General Practice if the id somehow doesn't match any club", () => {
    expect(resolveEffectiveClubName([PW], "unknown-id")).toBe(GENERAL_CLUB_NAME);
  });
});
