"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createLocalRepository, memoryStore, type KeyValueStore } from "./localRepository";
import type { R1vleRepository } from "./repository";
import { createSupabaseRepository } from "./supabaseRepository";
import { idbBlobStore } from "./idbBlobStore";

export type { R1vleRepository } from "./repository";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const isSupabaseConfigured = SUPABASE_URL.length > 0 && SUPABASE_KEY.length > 0;

let supabase: SupabaseClient | null = null;
let repo: R1vleRepository | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  supabase ??= createClient(SUPABASE_URL, SUPABASE_KEY);
  return supabase;
}

function browserStore(): KeyValueStore {
  try {
    const probe = "__r1vle_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return memoryStore();
  }
}

/** Single repository for the app: Supabase when configured, otherwise browser-local demo data. */
export function getRepository(): R1vleRepository {
  if (repo) return repo;
  const client = getSupabase();
  repo = client ? createSupabaseRepository(client) : createLocalRepository(browserStore(), () => new Date(), idbBlobStore());
  return repo;
}
