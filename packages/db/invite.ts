export function generateInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}
