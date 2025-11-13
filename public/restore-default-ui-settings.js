// 브라우저 콘솔에서 실행: UI Settings를 기본값으로 복구
(function() {
  console.log("=== UI Settings 기본값으로 복구 ===\n");
  
  const defaultSettings = {
    // header
    topHeaderBox: { bg: "#FFFFFF", padding: 12, border: { width: 1, color: "rgba(0,0,0,0.12)" } },
    title: { size: 18, bold: true, color: "#111111" },
    namebio: { size: 13, bold: false, color: "#444444" },
    devage: { size: 14, bold: true, color: "#0A66FF" },
    catag: { size: 12, bold: true, color: "#111111" },
    dropdown: {
      options: [],
      size: 12, bold: false, color: "#111111",
      bg: "#FFFFFF", borderWidth: 1, borderColor: "rgba(0,0,0,0.12)", hoverBg: "#F5F5F5"
    },

    // list
    playListBox: { bg: "#FFFFFF", padding: 12, border: { width: 1, color: "rgba(0,0,0,0.12)" } },
    activityBox: { bg: "#FFFFFF", borderWidth: 1, borderColor: "rgba(0,0,0,0.12)", radius: 12 },
    levelBadgeBox: { bg: "#FFFFFF", borderWidth: 1, borderColor: "rgba(0,0,0,0.12)", radius: 12 },
    activity: { size: 14, bold: true, color: "#111111" },
    levelBadge: { 
      fontSize: 12, bold: false, bg: "#FFFFFF", 
      borderWidth: 1, borderColor: "rgba(0,0,0,0.12)", radius: 10, 
      height: 20, paddingX: 6, paddingY: 2 
    },
    ageBadge: { 
      fontSize: 11, bold: false, color: "#111111", bg: "#FFFFFF", 
      borderWidth: 1, borderColor: "rgba(0,0,0,0.12)", radius: 8, 
      height: 18, paddingX: 6, paddingY: 2, width: 80 
    },
    levelBadgeIndent: 0,
    ageBadgeIndent: 0,
    activityIndent: 8,

    // detail
    detailPanelBox: { bg: "#FFFFFF", borderWidth: 1, borderColor: "rgba(0,0,0,0.12)", radius: 12 },
    detailHeaderBox: { bg: "#F9FAFB", borderWidth: 0, borderColor: "transparent", radius: 8 },
    detailHeaderTitle: { size: 14, bold: true, color: "#111111" },
    detailHeaderListBtn: { 
      fontSize: 12, bold: true, color: "#111111", bg: "transparent", 
      hoverBg: "rgba(0,0,0,0.05)", borderWidth: 0, borderColor: "transparent", 
      radius: 6, paddingX: 12, paddingY: 6 
    },
    detailHeaderPrevBtn: { 
      fontSize: 12, bold: true, color: "#111111", bg: "transparent", 
      hoverBg: "rgba(0,0,0,0.05)", borderWidth: 0, borderColor: "transparent", 
      radius: 6, paddingX: 12, paddingY: 6 
    },
    detailHeaderNextBtn: { 
      fontSize: 12, bold: true, color: "#111111", bg: "transparent", 
      hoverBg: "rgba(0,0,0,0.05)", borderWidth: 0, borderColor: "transparent", 
      radius: 6, paddingX: 12, paddingY: 6 
    },
    detailSmallBox: { bg: "#FFFFFF", borderWidth: 1, borderColor: "rgba(0,0,0,0.12)", radius: 12 },
    detailTitle: { size: 16, bold: true, color: "#111111", indent: 0 },
    detailBody: { size: 13, bold: false, color: "#333333", indent: 10 },
    difficultyCheckbox: { 
      size: 20, bg: "#FFFFFF", borderWidth: 2, 
      borderColor: "rgba(0,0,0,0.3)", borderColorChecked: "#0A66FF", 
      checkmarkColor: "#0A66FF", gap: 8 
    },
    safetySmallBox: { bg: "#FFF9E6", borderWidth: 1, borderColor: "#FFD700", radius: 12 },
    safetyTitle: { size: 16, bold: true, color: "#D97706", indent: 0 },
    safetyBody: { size: 13, bold: false, color: "#92400E", indent: 10 }
  };
  
  localStorage.setItem('komensky_ui_design_v2', JSON.stringify(defaultSettings));
  
  console.log("✓ UI Settings가 기본값으로 복구되었습니다.");
  console.log("\n페이지를 새로고침하세요:");
  console.log("location.reload();");
  
})();
