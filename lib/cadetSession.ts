"use client";

const TOKEN_KEY = "sd_cadet_token";
const INFO_KEY  = "sd_cadet_info";

export interface CadetInfo {
  id: string;
  name: string;
  avatar: string;
  coins: number;
}

export function saveCadetSession(token: string, child: CadetInfo) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(INFO_KEY, JSON.stringify(child));
}

export function getCadetToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function getCadetInfo(): CadetInfo | null {
  try {
    const raw = localStorage.getItem(INFO_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearCadetSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(INFO_KEY);
  } catch {}
}
