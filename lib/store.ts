import { CheckIn } from "./types";

// In-memory store that acts as a mock database.
// Replace with Firebase, Supabase, or any real DB later.
const checkins: CheckIn[] = [];

export function getAllCheckIns(): CheckIn[] {
  return [...checkins].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function addCheckIn(entry: CheckIn): CheckIn {
  checkins.push(entry);
  return entry;
}
