// GraphData 재생성 스크립트
// 브라우저 콘솔에서 실행하세요

console.log("=== GraphData 재생성 시작 ===\n");

// 발달 나이 계산 함수
function computeAchieveMonthOfThePlay(minAge, maxAge, level) {
  if (!level || level <= 0) return 0;
  const delta = (maxAge - minAge) / 4;
  const v = minAge + delta * (level - 1);
  return Number(v.toFixed(2));
}

const categories = ["대근육", "소근육", "언어(표현)", "언어(이해)", "인지", "사회 정서", "기본생활"];

categories.forEach(category => {
  const key = `komensky_category_record_${category}`;
  const recordStr = localStorage.getItem(key);
  
  if (!recordStr) {
    console.log(`⚠️ ${category}: 데이터 없음`);
    return;
  }
  
  const record = JSON.parse(recordStr);
  const oldGraphData = record.graphData || [];
  const newGraphData = [];
  
  // playData에서 graphData 재생성
  record.playData.forEach(playData => {
    let highestLevel = 0;
    let latestDate = null;
    
    playData.achievedLevelFlags.forEach((achieved, idx) => {
      if (achieved) {
        const level = idx + 1;
        if (level > highestLevel) {
          highestLevel = level;
          latestDate = playData.achievedDates[idx];
        }
      }
    });
    
    if (highestLevel > 0 && latestDate) {
      // 올바른 발달 나이 계산
      const achievedMonth = computeAchieveMonthOfThePlay(
        playData.minAge, 
        playData.maxAge, 
        highestLevel
      );
      
      newGraphData.push({
        achieveDate: latestDate,
        playNumber: playData.playNumber,
        achievedLevel_Highest: highestLevel,
        AchieveMonthOfThePlay: achievedMonth,
        achievedMonth: achievedMonth
      });
    }
  });
  
  // 날짜순 정렬
  newGraphData.sort((a, b) => new Date(a.achieveDate) - new Date(b.achieveDate));
  
  // 비교
  const oldMax = oldGraphData.length > 0 ? Math.max(...oldGraphData.map(g => g.achievedMonth)) : 0;
  const newMax = newGraphData.length > 0 ? Math.max(...newGraphData.map(g => g.achievedMonth)) : 0;
  
  console.log(`📊 ${category}:`);
  console.log(`  이전 graphData: ${oldGraphData.length}개, 최대값: ${oldMax.toFixed(2)}개월`);
  console.log(`  새로운 graphData: ${newGraphData.length}개, 최대값: ${newMax.toFixed(2)}개월`);
  
  if (oldMax !== newMax) {
    console.log(`  ⚠️ 값이 변경되었습니다!`);
  }
  
  // 저장
  record.graphData = newGraphData;
  localStorage.setItem(key, JSON.stringify(record));
});

console.log("\n=== GraphData 재생성 완료 ===");
console.log("페이지를 새로고침하세요.");
