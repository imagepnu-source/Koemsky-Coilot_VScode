"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";

interface AuthDialogProps {
  open: boolean;
  onAuthenticated: () => void;
}

export function AuthDialog({ open, onAuthenticated }: AuthDialogProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [guardianBirthDate, setGuardianBirthDate] = useState("");
  const [guardianGender, setGuardianGender] = useState("");
  const [guardianRelation, setGuardianRelation] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const isPasswordStrong = password.length >= 8;

  const handleAuth = async () => {
    if (!supabase) {
      setMessage("Supabase 설정이 필요합니다 (URL/KEY 확인)");
      return;
    }
    if (!email.trim() || !password) {
      setMessage("이메일과 비밀번호를 모두 입력해 주세요.");
      return;
    }
    if (mode === "signup") {
      const normalizedMobile = mobile.replace(/\D/g, "");
      if (!normalizedMobile) {
        setMessage("휴대폰 번호를 입력해 주세요.");
        return;
      }
      // 한국 휴대폰 기준: 10~11자리(지역/통신사 앞자리 포함)
      if (normalizedMobile.length < 10 || normalizedMobile.length > 11) {
        setMessage("휴대폰 번호 형식이 올바르지 않습니다. 예: 010-1234-5678");
        return;
      }
    }
    if (mode === "signup" && password !== confirmPassword) {
      setMessage("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    if (mode === "signup" && !isPasswordStrong) {
      setMessage("비밀번호는 최소 8자 이상이어야 합니다.");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        if (data.session) {
          onAuthenticated();
        } else {
          setMessage("로그인 세션을 가져오지 못했습니다.");
        }
      } else {
        const normalizedMobile = mobile.replace(/\D/g, "");
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
            data: {
              // 항상 숫자만 저장 (예: 01040422450)
              mobile: normalizedMobile,
              guardian_birth_date: guardianBirthDate || null,
              guardian_gender: guardianGender || null,
              guardian_relation: guardianRelation || null,
            },
          },
        });
        if (error) {
          const msg = error.message || "";
          if (
            error.code === "user_already_exists" ||
            /already\s+registered/i.test(msg) ||
            /already exists/i.test(msg)
          ) {
            setMode("login");
            setMessage("이미 가입된 이메일입니다. 로그인으로 전환했습니다.");
            return;
          }
          throw error;
        }
        if (data.user) {
          setMessage("회원 가입이 완료되었습니다. 이메일을 확인해 주세요.");
        } else {
          setMessage("회원 가입은 되었지만, 추가 확인이 필요할 수 있습니다.");
        }
      }
    } catch (err: any) {
      console.error("[AuthDialog] auth error", err);
      const raw = err?.message || "인증 중 오류가 발생했습니다.";
      if (typeof raw === "string" && raw.toLowerCase().includes("email not confirmed")) {
        setMessage(
          "이메일이 아직 확인되지 않았습니다.\n메일함에서 '이메일 확인' 링크를 눌러 주세요. 필요한 경우 아래에서 확인 메일을 다시 보낼 수 있습니다.",
        );
      } else {
        setMessage(raw);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!supabase) {
      setMessage("Supabase 설정이 필요합니다 (URL/KEY 확인)");
      return;
    }
    if (!email.trim()) {
      setMessage("비밀번호를 찾을 이메일을 입력해 주세요.");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      });
      if (error) throw error;
      setMessage("비밀번호 재설정 메일을 보냈습니다. 메일함을 확인해 주세요.");
    } catch (err: any) {
      console.error("[AuthDialog] reset password error", err);
      setMessage(err?.message || "비밀번호 재설정 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!supabase) {
      setMessage("Supabase 설정이 필요합니다 (URL/KEY 확인)");
      return;
    }
    if (!email.trim()) {
      setMessage("확인 메일을 받을 이메일을 입력해 주세요.");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await (supabase as any).auth.resend({
        type: "signup",
        email: email.trim(),
      });
      if (error) throw error;
      setMessage("이메일 확인 메일을 다시 보냈습니다. 메일함을 확인해 주세요.");
    } catch (err: any) {
      console.error("[AuthDialog] resend confirmation error", err);
      setMessage(err?.message || "이메일 확인 메일 재발송 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "login" ? "로그인" : "회원 가입"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <div>
              <Label htmlFor="email">이메일 (로그인 ID)</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@example.com"
              />
            </div>
            {mode === "signup" && (
              <div>
                <Label htmlFor="mobile">휴대폰 번호</Label>
                <Input
                  id="mobile"
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="예: 010-1234-5678"
                />
              </div>
            )}
            {mode === "signup" && (
              <>
                <div>
                  <Label htmlFor="guardianBirth">보호자 생년월일 (선택)</Label>
                  <Input
                    id="guardianBirth"
                    type="date"
                    value={guardianBirthDate}
                    onChange={(e) => setGuardianBirthDate(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="guardianGender">성별 (선택)</Label>
                    <select
                      id="guardianGender"
                      className="w-full border rounded px-2 py-1 text-sm"
                      value={guardianGender}
                      onChange={(e) => setGuardianGender(e.target.value)}
                    >
                      <option value="">선택 안 함</option>
                      <option value="male">남</option>
                      <option value="female">여</option>
                      <option value="other">기타</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="guardianRelation">아이와의 관계 (선택)</Label>
                    <select
                      id="guardianRelation"
                      className="w-full border rounded px-2 py-1 text-sm"
                      value={guardianRelation}
                      onChange={(e) => setGuardianRelation(e.target.value)}
                    >
                      <option value="">선택 안 함</option>
                      <option value="father">부</option>
                      <option value="mother">모</option>
                      <option value="teacher">선생님</option>
                      <option value="family">가족</option>
                      <option value="neighbor">이웃</option>
                      <option value="other">기타</option>
                    </select>
                  </div>
                </div>
              </>
            )}
            <div>
              <Label htmlFor="password">비밀번호</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8자 이상 비밀번호"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-2 flex items-center text-gray-500"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                >
                  {showPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M3 3l18 18" strokeLinecap="round" strokeLinejoin="round" />
                      <path
                        d="M10.58 10.58A3 3 0 0113.42 13.4M9.88 4.12A9.77 9.77 0 0112 4c5 0 9 4 10 7-0.273.82-.73 1.68-1.34 2.5M6.18 6.18C4.24 7.39 2.9 9.17 2 11c.55 1.11 1.31 2.18 2.24 3.12A11.63 11.63 0 008.5 16.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {mode === "signup" && (
                <div className="mt-3">
                  <Label htmlFor="password-confirm">비밀번호 확인</Label>
                  <Input
                    id="password-confirm"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="비밀번호를 한 번 더 입력해주세요"
                  />
                </div>
              )}
              {mode === "signup" && (
                <p className="mt-1 text-[10px] text-gray-500">
                  비밀번호는 최소 8자 이상이어야 합니다. (영문/숫자 조합을 권장합니다.)
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Button className="w-full" onClick={handleAuth} disabled={loading}>
              {mode === "login" ? "로그인" : "회원 가입"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full text-xs"
              onClick={handleResetPassword}
              disabled={loading}
            >
              비밀번호를 잊으셨나요? (이메일로 재설정 링크 보내기)
            </Button>
            {mode === "signup" && (
              <Button
                type="button"
                variant="outline"
                className="w-full text-xs"
                onClick={handleResendConfirmation}
                disabled={loading}
              >
                회원 가입 확인 메일 다시 보내기
              </Button>
            )}
          </div>

          <div className="flex justify-between items-center text-xs text-gray-600">
            <span>
              {mode === "login" ? "처음 사용하시나요?" : "이미 계정이 있으신가요?"}
            </span>
            <button
              type="button"
              className="text-blue-600 underline"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              disabled={loading}
            >
              {mode === "login" ? "회원 가입으로 전환" : "로그인으로 전환"}
            </button>
          </div>

          {message && (
            <div className="text-xs text-red-600 whitespace-pre-line border border-red-200 bg-red-50 p-2 rounded">
              {message}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
