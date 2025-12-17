import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface MenuItem {
  label: string;
  onClick?: () => void;
  children?: MenuItem[];
}

interface HamburgerMenuProps {
  onOpenGuardianSettings?: () => void;
  onOpenChildSettings?: () => void;
  onOpenAdminTools?: () => void;
  onOpenIntro?: () => void;
}



function getMenu(
  onOpenGuardianSettings?: () => void,
  onOpenChildSettings?: () => void,
  onOpenAdminTools?: () => void,
  onOpenIntro?: () => void,
): MenuItem[] {
  return [
    {
      label: "보호자 정보",
      onClick: () => onOpenGuardianSettings && onOpenGuardianSettings(),
    },
    {
      label: "아이 정보",
      onClick: () => onOpenChildSettings && onOpenChildSettings(),
    },
    {
      label: "관리자 전용",
      onClick: () => onOpenAdminTools && onOpenAdminTools(),
    },
    {
      label: "Intro",
      onClick: () => onOpenIntro && onOpenIntro(),
    },
    { label: "Supabase 내용 확인" },
    {
      label: "끝내기",
      onClick: () => {
        // Soft exit: just reload the app, keep session
        window.location.reload();
      },
    },
    {
      label: "Log Out",
      onClick: async () => {
        if (supabase) {
          try {
            await supabase.auth.signOut();
            window.location.reload();
          } catch (e) {
            alert("로그아웃 실패: " + (typeof e === "object" && e && "message" in e ? (e as any).message : String(e)));
          }
        }
      },
    },
  ];
}

export default function HamburgerMenu({
  onOpenGuardianSettings,
  onOpenChildSettings,
  onOpenAdminTools,
  onOpenIntro,
}: HamburgerMenuProps) {
  const [open, setOpen] = useState(false);
  const menu = getMenu(onOpenGuardianSettings, onOpenChildSettings, onOpenAdminTools, onOpenIntro);
  return (
    <div style={{ position: "fixed", top: 16, left: 16, zIndex: 1000 }}>
      <button
        aria-label="메뉴 열기"
        onClick={() => setOpen((v) => !v)}
        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 28 }}
      >
        &#9776;
      </button>
      {open && (
        <nav
          style={{
            position: "absolute",
            top: 40,
            left: 0,
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: 8,
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            minWidth: 220,
            padding: 12,
          }}
        >
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {menu.map((item) => (
              <li key={item.label} style={{ marginBottom: 8 }}>
                <button
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    fontWeight: 600,
                    cursor: item.onClick ? "pointer" : "default",
                    color: item.onClick ? "#0070f3" : undefined,
                  }}
                  onClick={() => {
                    if (item.onClick) item.onClick();
                    setOpen(false);
                  }}
                  tabIndex={0}
                >
                  {item.label}
                </button>
                {item.children && (
                  <ul style={{ margin: "6px 0 0 12px", padding: 0 }}>
                    {item.children.map((child) => (
                      <li key={child.label} style={{ fontWeight: 400, marginBottom: 4 }}>{child.label}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
