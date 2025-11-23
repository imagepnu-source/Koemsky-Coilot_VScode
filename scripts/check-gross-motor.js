// 대근육 발달 나이 계산 확인 스크립트
// 브라우저 콘솔에서 실행

console.log("=== 대근육 데이터 조사 ===\n");

// 1. CategoryRecord 확인
const grossMotorKey = "komensky_category_record_대근육";
const grossMotorRecord = localStorage.getItem(grossMotorKey);

if (!grossMotorRecord) {
  console.log("❌ 대근육 데이터가 없습니다.");
} else {
  const record = JSON.parse(grossMotorRecord);
  
  console.log("📊 대근육 CategoryRecord:");
  console.log(`- categoryDevelopmentalAge: ${record.categoryDevelopmentalAge}개월`);
  console.log(`- playData 개수: ${record.playData?.length || 0}`);
  console.log(`- graphData 개수: ${record.graphData?.length || 0}\n`);
  
  // 2. PlayData 분석 (체크된 놀이만)
  console.log("✅ 체크된 놀이 목록:");
  const checkedPlays = record.playData?.filter(p => 
    p.achievedLevelFlags?.some(flag => flag === true)
  ) || [];
  
  checkedPlays.forEach(play => {
    const highestLevel = play.achievedLevelFlags.reduce((max, flag, idx) => 
      flag ? idx + 1 : max, 0
    );
    
    const delta = (play.maxAge - play.minAge) / 4;
    const devAge = highestLevel > 0 ? play.minAge + delta * (highestLevel - 1) : 0;
    
    console.log(`  놀이 ${play.playNumber}: ${play.playTitle}`);
    console.log(`    연령대: ${play.minAge}-${play.maxAge}개월`);
    console.log(`    최고 레벨: ${highestLevel}`);
    console.log(`    계산된 발달나이: ${devAge.toFixed(2)}개월`);
  });
  
  // 3. GraphData 분석
  console.log("\n📈 GraphData (시간축 그래프용):");
  if (record.graphData && record.graphData.length > 0) {
    const sortedGraph = [...record.graphData].sort((a, b) => b.achievedMonth - a.achievedMonth);
    sortedGraph.slice(0, 10).forEach((entry, idx) => {
      console.log(`  ${idx + 1}. 놀이 ${entry.playNumber}: ${entry.achievedMonth}개월 (${entry.achieveDate})`);
    });
    
    // 상위 3개 평균
    const top3 = sortedGraph.slice(0, 3);
    const avg = top3.reduce((sum, e) => sum + e.achievedMonth, 0) / top3.length;
    console.log(`\n  ⭐ 상위 3개 평균: ${avg.toFixed(2)}개월`);
  }
  
  // 4. 12개월 이상 놀이 체크 확인
  console.log("\n🔍 12개월 이상 놀이 체크 상태:");
  const over12Months = record.playData?.filter(p => p.minAge > 12) || [];
  const checkedOver12 = over12Months.filter(p => 
    p.achievedLevelFlags?.some(flag => flag === true)
  );
  
  console.log(`  12개월 이상 놀이: 총 ${over12Months.length}개`);
  console.log(`  체크된 놀이: ${checkedOver12.length}개`);
  
  if (checkedOver12.length > 0) {
    console.log(`  ⚠️ 12개월 이상에서 체크된 놀이 발견:`);
    checkedOver12.forEach(p => {
      const level = p.achievedLevelFlags.reduce((max, flag, idx) => 
        flag ? idx + 1 : max, 0
      );
      console.log(`    놀이 ${p.playNumber}: ${p.minAge}-${p.maxAge}개월, 레벨 ${level}`);
    });
  }
}

// 5. 다른 카테고리와 비교
console.log("\n📋 전체 카테고리 발달 나이:");
const categories = ["대근육", "소근육", "언어(표현)", "언어(이해)", "인지", "사회 정서", "기본생활"];
categories.forEach(cat => {
  const key = `komensky_category_record_${cat}`;
  const data = localStorage.getItem(key);
  if (data) {
    const record = JSON.parse(data);
    console.log(`  ${cat}: ${record.categoryDevelopmentalAge}개월`);
  }
});

console.log("\n=== 조사 완료 ===");
