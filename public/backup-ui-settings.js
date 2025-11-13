// 브라우저 콘솔에서 실행: UI Settings 백업
(function() {
  const settings = localStorage.getItem('komensky_ui_design_v2');
  
  if (!settings) {
    console.log("UI Settings가 없습니다.");
    return;
  }
  
  console.log("=== UI Settings 백업 ===");
  console.log("\n다음 코드를 복사해두세요:\n");
  console.log(`localStorage.setItem('komensky_ui_design_v2', '${settings.replace(/'/g, "\\'")}');`);
  console.log("\n복원하려면 위 코드를 콘솔에 붙여넣으세요.");
  
  // JSON 형태로도 출력
  try {
    const parsed = JSON.parse(settings);
    console.log("\n=== JSON 형태 ===");
    console.log(JSON.stringify(parsed, null, 2));
  } catch (e) {
    console.error("파싱 실패:", e);
  }
  
})();
