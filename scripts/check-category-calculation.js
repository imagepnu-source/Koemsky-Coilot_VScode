// 브라우저 콘솔에서 실행: 카테고리별 발달 나이 계산 검증
(function() {
  console.log("=== 카테고리별 발달 나이 계산 검증 ===\n");
  
  const categories = ["대근육", "소근육", "인지", "언어", "사회 정서", "자조"];
  
  categories.forEach(category => {
    const key = `komensky_category_${category}`;
    const data = localStorage.getItem(key);
    
    if (!data) {
      console.log(`${category}: 데이터 없음\n`);
      return;
    }
    
    try {
      const record = JSON.parse(data);
      
      // playData에서 체크된 놀이만 추출
      const checkedPlays = [];
      
      record.playData.forEach(play => {
        let highestLevel = 0;
        let highestDate = null;
        
        play.achievedLevelFlags.forEach((checked, idx) => {
          if (checked) {
            const level = idx + 1;
            if (level > highestLevel) {
              highestLevel = level;
              highestDate = play.achievedDates[idx];
            }
          }
        });
        
        if (highestLevel > 0 && highestDate) {
          // 발달 개월 계산
          const delta = (play.maxAge - play.minAge) / 4;
          const achieveMonth = play.minAge + delta * (highestLevel - 1);
          
          checkedPlays.push({
            playNumber: play.playNumber,
            playTitle: play.playTitle,
            minAge: play.minAge,
            maxAge: play.maxAge,
            highestLevel: highestLevel,
            achieveMonth: Math.round(achieveMonth * 100) / 100,
            date: new Date(highestDate)
          });
        }
      });
      
      if (checkedPlays.length === 0) {
        console.log(`${category}: 체크된 놀이 없음\n`);
        return;
      }
      
      // 날짜순 정렬
      checkedPlays.sort((a, b) => a.date - b.date);
      
      // 발달개월 높은순으로 정렬하여 상위 3개
      const top3 = [...checkedPlays]
        .sort((a, b) => b.achieveMonth - a.achieveMonth)
        .slice(0, 3);
      
      const average = top3.reduce((sum, p) => sum + p.achieveMonth, 0) / top3.length;
      const finalAge = Math.round(average * 100) / 100;
      
      console.log(`${category}:`);
      console.log(`  전체 체크된 놀이: ${checkedPlays.length}개`);
      console.log(`  저장된 categoryDevelopmentalAge: ${record.categoryDevelopmentalAge}`);
      console.log(`  계산된 발달나이 (상위3개 평균): ${finalAge}`);
      console.log(`  일치 여부: ${record.categoryDevelopmentalAge === finalAge ? "✅" : "❌"}`);
      
      console.log(`\n  상위 3개 놀이:`);
      top3.forEach((play, idx) => {
        console.log(`    ${idx + 1}. #${play.playNumber} ${play.playTitle}`);
        console.log(`       연령대: ${play.minAge}-${play.maxAge}M, 레벨: ${play.highestLevel}, 발달개월: ${play.achieveMonth}`);
      });
      
      if (record.categoryDevelopmentalAge !== finalAge) {
        console.log(`\n  ⚠️ 불일치 발견!`);
        console.log(`     저장값: ${record.categoryDevelopmentalAge}`);
        console.log(`     계산값: ${finalAge}`);
        console.log(`     차이: ${Math.abs(record.categoryDevelopmentalAge - finalAge).toFixed(2)}`);
      }
      
      console.log("\n" + "=".repeat(60) + "\n");
      
    } catch (e) {
      console.error(`${category} 파싱 오류:`, e);
    }
  });
  
  console.log("검증 완료");
})();
