// 브라우저 콘솔에서 실행: 카테고리 데이터만 초기화 (UI Settings 보존)
(function() {
  console.log("=== 카테고리 데이터 초기화 (UI Settings 보존) ===\n");
  
  // UI Settings 백업
  const uiSettings = localStorage.getItem('komensky_ui_design_v2');
  const childProfile = localStorage.getItem('komensky_child_profile');
  const lastTab = localStorage.getItem('komensky_last_selected_tab');
  
  console.log("백업 완료:");
  console.log("- UI Settings:", uiSettings ? "✓" : "없음");
  console.log("- Child Profile:", childProfile ? "✓" : "없음");
  console.log("- Last Tab:", lastTab ? "✓" : "없음");
  
  // 삭제할 카테고리 데이터 수집
  const categoriesToDelete = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('komensky_category_')) {
      categoriesToDelete.push(key);
    }
  }
  
  console.log("\n삭제할 카테고리:", categoriesToDelete.length);
  
  // 카테고리 데이터만 삭제
  categoriesToDelete.forEach(key => {
    const categoryName = key.replace('komensky_category_', '');
    console.log(`삭제: ${categoryName}`);
    localStorage.removeItem(key);
  });
  
  console.log("\n완료! UI Settings는 보존되었습니다.");
  console.log("페이지를 새로고침한 후 Settings에서 Test Data를 다시 생성하세요.");
  
})();
