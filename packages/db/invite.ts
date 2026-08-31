import { randomBytes } from "crypto";

function randomCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/** Patient's code — a doctor enters it to connect to the patient. */
export function generateInviteCode(): string {
  return randomCode();
}

/** Doctor's code — a patient enters it to request a connection to the doctor. */
export function generateConnectCode(): string {
  return randomCode();
}

/** Opaque token for a clinic invite link (goes in a URL, not typed by hand). */
export function generateClinicInviteToken(): string {
  return randomBytes(18).toString("base64url");
}
