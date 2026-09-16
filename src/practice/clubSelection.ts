// Pure "which club is actually selected" logic for the always-visible
// Practice setup, split out from PracticeView so it's unit-testable
// without a DOM. Distance Wedge and Short Game share this: both draw from
// the same My Bag club list, so a club chosen in one stays valid in the
// other, and an empty bag falls back to a synthetic "General Practice"
// stand-in rather than blocking the page.

export const GENERAL_CLUB_ID = "general";
export const GENERAL_CLUB_NAME = "No Club / General Practice";

export type ClubLike = { id: string; name: string };

// Falls back to the first available club whenever the persisted choice is
// no longer valid (nothing chosen yet, or the club was since deleted) --
// this is what keeps the club selector always showing something usable
// without requiring a click before the rest of the page appears.
export function resolveEffectiveClubId(clubs: ClubLike[], selectedClubId: string): string {
  if (clubs.length === 0) return GENERAL_CLUB_ID;
  const stillValid = clubs.some((club) => club.id === selectedClubId);
  return stillValid ? selectedClubId : clubs[0].id;
}

export function resolveEffectiveClubName(clubs: ClubLike[], effectiveClubId: string): string {
  if (clubs.length === 0) return GENERAL_CLUB_NAME;
  return clubs.find((club) => club.id === effectiveClubId)?.name ?? GENERAL_CLUB_NAME;
}

// What the Club section should offer as choices: the user's real clubs,
// or -- when My Bag is empty -- a single General Practice stand-in.
export function resolveClubChoices(clubs: ClubLike[]): ClubLike[] {
  return clubs.length > 0 ? clubs : [{ id: GENERAL_CLUB_ID, name: GENERAL_CLUB_NAME }];
}
