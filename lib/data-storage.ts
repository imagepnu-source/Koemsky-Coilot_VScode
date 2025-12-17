// src/lib/data-storage.ts
// Supabase & Local DB 분리 설계 기반 데이터 저장/조회/동기화 모듈

import { supabase } from "@/lib/supabaseClient";

// --- Supabase 전용 데이터 ---
export async function saveAccountToSupabase(account: any) {
  // 예시: supabase.from("accounts").upsert(account)
}
export async function saveChildToSupabase(child: any) {
  // 예시: supabase.from("children").upsert(child)
}
export async function fetchChildrenFromSupabase(userId: string) {
  // 예시: supabase.from("children").select("*").eq("user_id", userId)
}

// --- Local DB 전용 데이터 ---
export function saveCategoryToLocal(categories: any) {
  localStorage.setItem("categories", JSON.stringify(categories));
}
export function fetchCategoryFromLocal() {
  const raw = localStorage.getItem("categories");
  return raw ? JSON.parse(raw) : [];
}

// --- 동기화/캐시 데이터 (찜, 댓글, play_data, graph_data) ---
export function savePlayDataToLocal(playData: any) {
  localStorage.setItem("playData", JSON.stringify(playData));
}
export function fetchPlayDataFromLocal() {
  const raw = localStorage.getItem("playData");
  return raw ? JSON.parse(raw) : [];
}
export async function savePlayDataToSupabase(playData: any) {
  // 예시: supabase.from("play_states").upsert(playData)
}
export async function syncPlayData(userId: string) {
  // 1. Local → Supabase 업로드
  // 2. Supabase → Local 병합
  // (충돌 해결 로직 필요)
}
