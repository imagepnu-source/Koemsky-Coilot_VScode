import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { loadUIDesignCfg, saveUIDesignCfg, saveGlobalUIDesignCfg } from '@/lib/ui-design';
import { supabase } from "@/lib/supabaseClient";
  const handleApplyCurrentUIToAllUsers = async () => {
    try {
      const confirmApply = window.confirm(
        "현재 이 브라우저에 적용된 UI 설정을\n" +
        "모든 사용자에게 공통으로 적용합니다.\n\n" +
        "계속하시겠습니까?"
      );
      if (!confirmApply) return;
      const current = loadUIDesignCfg();
      await saveGlobalUIDesignCfg(current);
      alert(
        "현재 UI 설정이 Supabase에 전역 값으로 저장되었습니다.\n" +
        "다른 사용자는 페이지를 새로고침하면 이 UI가 적용됩니다."
      );
    } catch (error) {
      alert("전역 UI 설정 저장 중 오류가 발생했습니다.");
    }
  };
import { getGlobalKoreanNames } from '@/lib/global-categories';
import { getChildCategoryStorageKey } from '@/lib/storage-category';
import { generateTestData } from '@/lib/storage-test-data';

interface AdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childProfile: import("@/lib/types").ChildProfile | null;
  playData: Record<string, any[]>;
}


export function AdminDialog({ open, onOpenChange, childProfile, playData }: AdminDialogProps) {
  // NOTE: 2025-12-18 임시 설정 - 관리자 비밀번호 없이 바로 관리자 기능 사용
  const [adminUnlocked, setAdminUnlocked] = useState(true);
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [testDataCount, setTestDataCount] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tempMessage, setTempMessage] = useState("");

  const [showSupabaseModal, setShowSupabaseModal] = useState(false);
  const [supabaseTable, setSupabaseTable] = useState<string>("children");
  const [supabaseRows, setSupabaseRows] = useState<any[] | null>(null);
  const [supabaseLoading, setSupabaseLoading] = useState(false);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);

  const TABLE_OPTIONS = [
    { value: "children", label: "children (아이 기본 정보)" },
    { value: "category_records", label: "category_records (카테고리 발달 기록)" },
    { value: "play_states", label: "play_states (찜/댓글/상태)" },
    { value: "subscriptions", label: "subscriptions (구독 상태)" },
    { value: "user_profiles", label: "user_profiles (보호자 정보)" },
  ] as const;

  const handleAdminAuth = () => {
    if (adminPassword === "Christ4HGe!") {
      setAdminUnlocked(true);
    } else {
      alert("비밀번호가 올바르지 않습니다.");
    }
  };

  const handleTestDataCountChange = (value: string) => {
    const count = Number.parseInt(value, 10);
    if (count > 0) {
      setTestDataCount(count);
      localStorage.setItem("komensky_test_data_count", count.toString());
    }
  };

  const handleClearAllRecords = () => {
    try {
      const categories = getGlobalKoreanNames();
      const categoryKeys = categories.map((category) => `komensky_records_${category}`);
      categoryKeys.forEach((key) => {
        localStorage.removeItem(key);
      });
      categories.forEach((category) => {
        const categoryKey = getChildCategoryStorageKey(category);
        const existingRecordStr = localStorage.getItem(categoryKey);
        if (existingRecordStr) {
          try {
            const existingRecord = JSON.parse(existingRecordStr);
            const clearedRecord = {
              ...existingRecord,
              playData: [],
              graphData: [],
              categoryDevelopmentalAge: 0,
            };
            localStorage.setItem(categoryKey, JSON.stringify(clearedRecord));
          } catch {
            localStorage.removeItem(categoryKey);
          }
        }
      });
      alert("모든 놀이 기록이 삭제되었습니다.");
    } catch (error) {
      alert("놀이 기록 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleGenerateTestData = () => {
    if (!childProfile) {
      alert("아이 정보가 없습니다. 먼저 아이 정보를 등록하세요.");
      return;
    }
    setIsGenerating(true);
    try {
      generateTestData(childProfile, playData, testDataCount, () => {});
      setTempMessage("테스트 데이터가 생성되었습니다. 페이지를 새로고침하세요.");
    } catch (error) {
      alert("테스트 데이터 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBackupUISettings = () => {
    try {
      const uiSettings = loadUIDesignCfg();
      const jsonData = JSON.stringify(uiSettings, null, 2);
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ui-settings-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert("UI 설정이 백업되었습니다.");
    } catch {
      alert("UI 설정 백업 중 오류가 발생했습니다.");
    }
  };

  const handleRestoreUISettings = () => {
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const jsonData = event.target?.result as string;
              const uiSettings = JSON.parse(jsonData);
              saveUIDesignCfg(uiSettings);
              alert("UI 설정이 복원되었습니다. 페이지를 새로고침합니다.");
              window.location.reload();
            } catch {
              alert("UI 설정 복원에 실패했습니다. 파일 형식을 확인해주세요.");
            }
          };
          reader.readAsText(file);
        }
      };
      input.click();
    } catch {
      alert("UI 설정 복원 중 오류가 발생했습니다.");
    }
  };

  const loadSupabaseTable = async (table: string) => {
    if (!supabase) {
      setSupabaseError("Supabase 설정이 필요합니다 (URL/KEY 확인)");
      setSupabaseRows(null);
      return;
    }

    setSupabaseLoading(true);
    setSupabaseError(null);

    try {
      const { data, error } = await supabase.from(table).select("*").limit(50);
      if (error) {
        console.warn("[AdminDialog] Supabase table fetch error", table, error);
        setSupabaseError(error.message || "테이블을 불러오는 중 오류가 발생했습니다.");
        setSupabaseRows(null);
      } else {
        setSupabaseRows((data as any[]) ?? []);
      }
    } catch (e: any) {
      console.warn("[AdminDialog] Supabase table fetch unexpected error", table, e);
      setSupabaseError(e?.message || "테이블을 불러오는 중 오류가 발생했습니다.");
      setSupabaseRows(null);
    } finally {
      setSupabaseLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" style={{ width: '80vw', maxWidth: '480px', maxHeight: '70vh', overflowY: 'auto' }}>
        <DialogHeader>
          <DialogTitle>관리자 창</DialogTitle>
          <DialogDescription>관리자 전용 기능 (점진적 분리 예정)</DialogDescription>
        </DialogHeader>
        {!adminUnlocked ? (
          <div className="space-y-3">
            <div>
              <label htmlFor="adminPassword">관리자 비밀번호</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  id="adminPassword"
                  type={showPassword ? "text" : "password"}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAdminAuth();
                    }
                  }}
                  placeholder="관리자 비밀번호를 입력하세요"
                  className="border rounded px-2 py-1 w-full"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                  onClick={() => setShowPassword((v) => !v)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                  tabIndex={0}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <Button className="w-full" onClick={handleAdminAuth}>
              확인
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">1. 모든 놀이기록 삭제 및 테스트 데이터</h3>
              <div className="space-y-2">
                <div>
                  <label htmlFor="testDataCount-admin">카테고리별 테스트 데이터 개수</label>
                  <Input
                    id="testDataCount-admin"
                    type="number"
                    min="1"
                    max="50"
                    value={testDataCount}
                    onChange={(e) => handleTestDataCountChange(e.target.value)}
                    placeholder="테스트 데이터 개수"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    각 카테고리에서 생성할 테스트 데이터의 개수입니다.
                  </p>
                </div>
                <Button
                  onClick={handleClearAllRecords}
                  className="w-full bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                  variant="outline"
                >
                  모든 놀이 기록 삭제
                </Button>
                <Button
                  onClick={handleGenerateTestData}
                  disabled={isGenerating}
                  className="w-full bg-transparent"
                  variant="outline"
                >
                  {isGenerating ? "생성 중..." : "Generate & Load Test Data"}
                </Button>
                {tempMessage && (
                  <div className="text-sm text-green-600 bg-green-50 p-2 rounded border border-green-200">
                    {tempMessage}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h3 className="text-sm font-medium">2. UI Set 바꾸기</h3>
              <p className="text-xs text-gray-500">
                아래 uiSet 버튼으로 UI 설정 창을 열고,
                그 안에서 Save를 누르면 모든 사용자가 같은 UI를 사용하도록 저장됩니다.
              </p>
              <div className="space-y-2">
                {/* Top 컨테이너 오른쪽 위 uiSet 과 동일한 UI 설정 창 열기 */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    try {
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new Event('komensky:openUIDesign'));
                      }
                    } catch {
                      // ignore
                    }
                  }}
                >
                  uiSet
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h3 className="text-sm font-medium">3. UI 설정 관리</h3>
              <div className="space-y-2">
                <Button onClick={handleBackupUISettings} className="w-full bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100" variant="outline">
                  UI 설정 백업
                </Button>
                <Button onClick={handleRestoreUISettings} className="w-full bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100" variant="outline">
                  UI 설정 복원
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h3 className="text-sm font-medium">4. Supabase 내용 확인</h3>
              <p className="text-xs text-gray-500">
                주요 Supabase 테이블(children, category_records, play_states 등)의 현재 내용을 읽기 전용으로 확인합니다.
              </p>
              <Button
                variant="outline"
                className="w-full bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                onClick={() => {
                  setShowSupabaseModal(true);
                  loadSupabaseTable(supabaseTable);
                }}
              >
                Supabase 내용 확인
              </Button>
            </div>
          </div>
        )}

        {adminUnlocked && showSupabaseModal && (
          <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 overflow-y-auto">
            <div className="bg-white rounded-md shadow-lg w-[90vw] max-w-3xl max-h-[80vh] mt-8 p-4 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold">Supabase 내용 확인</h2>
                <button
                  type="button"
                  onClick={() => setShowSupabaseModal(false)}
                  className="text-xs text-gray-500 hover:text-gray-800"
                >
                  닫기
                </button>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <label className="text-xs text-gray-600">테이블 선택:</label>
                <select
                  className="border rounded px-2 py-1 text-xs"
                  value={supabaseTable}
                  onChange={(e) => {
                    const next = e.target.value;
                    setSupabaseTable(next);
                    loadSupabaseTable(next);
                  }}
                >
                  {TABLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-xs px-2 py-1"
                  onClick={() => loadSupabaseTable(supabaseTable)}
                  disabled={supabaseLoading}
                >
                  새로고침
                </Button>
              </div>
              <div className="flex-1 border rounded bg-gray-50 overflow-auto text-[11px] leading-snug p-2">
                {supabaseLoading && <div>불러오는 중입니다...</div>}
                {!supabaseLoading && supabaseError && (
                  <div className="text-red-600 whitespace-pre-wrap">{supabaseError}</div>
                )}
                {!supabaseLoading && !supabaseError && supabaseRows && (
                  supabaseRows.length > 0 ? (
                    <pre className="whitespace-pre-wrap break-all text-[10px]">
                      {JSON.stringify(supabaseRows, null, 2)}
                    </pre>
                  ) : (
                    <div className="text-xs text-gray-500">표시할 데이터가 없습니다. (0 rows)</div>
                  )
                )}
              </div>
              <p className="mt-2 text-[10px] text-gray-500">
                이 창에서는 Supabase 내용을 읽기만 할 수 있습니다. (쓰기/삭제 불가)
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
