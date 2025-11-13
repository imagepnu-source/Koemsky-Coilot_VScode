// 브라우저 콘솔에서 실행: 대근육 데이터 상세 조사
(function() {
  console.log("=== 대근육 PlayData vs GraphData 조사 ===\n");
  
  const category = "대근육";
  const key = `komensky_category_record_${category}`;
  const data = localStorage.getItem(key);
  
  if (!data) {
    console.log("❌ 대근육 데이터 없음");
    return;
  }
  
  const record = JSON.parse(data);
  
  console.log("📊 저장된 categoryDevelopmentalAge:", record.categoryDevelopmentalAge);
  console.log("📊 playData 개수:", record.playData.length);
  console.log("📊 graphData 개수:", record.graphData.length);
  console.log("\n" + "=".repeat(80) + "\n");
  
  // PlayData 분석
  console.log("=== PlayData 분석 ===\n");
  
  const playDataWithChecks = [];
  
  record.playData.forEach((play, idx) => {
    const checkedLevels = [];
    
    play.achievedLevelFlags.forEach((checked, levelIdx) => {
      if (checked) {
        checkedLevels.push({
          level: levelIdx + 1,
          date: play.achievedDates[levelIdx] ? new Date(play.achievedDates[levelIdx]) : null
        });
      }
    });
    
    if (checkedLevels.length > 0) {
      const highest = checkedLevels.reduce((max, curr) => 
        curr.level > max.level ? curr : max
      , checkedLevels[0]);
      
      // 발달개월 계산
      const delta = (play.maxAge - play.minAge) / 4;
      const achieveMonth = play.minAge + delta * (highest.level - 1);
      
      playDataWithChecks.push({
        playNumber: play.playNumber,
        playTitle: play.playTitle,
        minAge: play.minAge,
        maxAge: play.maxAge,
        delta: Math.round(delta * 100) / 100,
        highestLevel: highest.level,
        highestDate: highest.date,
        calculatedMonth: Math.round(achieveMonth * 100) / 100,
        allLevels: checkedLevels
      });
    }
  });
  
  console.log(`체크된 놀이: ${playDataWithChecks.length}개\n`);
  
  if (playDataWithChecks.length === 0) {
    console.log("❌ 체크된 놀이가 없습니다!");
    return;
  }
  
  // PlayData 상위 3개
  const playDataTop3 = [...playDataWithChecks]
    .sort((a, b) => b.calculatedMonth - a.calculatedMonth)
    .slice(0, 3);
  
  console.log("PlayData 기준 상위 3개:");
  playDataTop3.forEach((p, idx) => {
    console.log(`${idx + 1}. #${p.playNumber} ${p.playTitle}`);
    console.log(`   연령대: ${p.minAge}-${p.maxAge}M (delta=${p.delta})`);
    console.log(`   최고레벨: Lv${p.highestLevel}`);
    console.log(`   계산: ${p.minAge} + ${p.delta} × ${p.highestLevel - 1} = ${p.calculatedMonth}M`);
    console.log(`   날짜: ${p.highestDate ? p.highestDate.toLocaleString() : "없음"}`);
  });
  
  const playDataAvg = playDataTop3.reduce((sum, p) => sum + p.calculatedMonth, 0) / playDataTop3.length;
  console.log(`\nPlayData 평균: ${Math.round(playDataAvg * 100) / 100}M`);
  
  console.log("\n" + "=".repeat(80) + "\n");
  
  // GraphData 분석
  console.log("=== GraphData 분석 ===\n");
  
  if (record.graphData.length === 0) {
    console.log("❌ graphData가 비어있습니다!");
    return;
  }
  
  console.log(`GraphData 항목: ${record.graphData.length}개\n`);
  
  // GraphData 상위 3개
  const graphDataTop3 = [...record.graphData]
    .sort((a, b) => b.AchieveMonthOfThePlay - a.AchieveMonthOfThePlay)
    .slice(0, 3);
  
  console.log("GraphData 기준 상위 3개:");
  graphDataTop3.forEach((g, idx) => {
    console.log(`${idx + 1}. #${g.playNumber}`);
    console.log(`   AchieveMonthOfThePlay: ${g.AchieveMonthOfThePlay}M`);
    console.log(`   achievedLevel_Highest: ${g.achievedLevel_Highest}`);
    console.log(`   achieveDate: ${new Date(g.achieveDate).toLocaleString()}`);
  });
  
  const graphDataAvg = graphDataTop3.reduce((sum, g) => sum + g.AchieveMonthOfThePlay, 0) / graphDataTop3.length;
  console.log(`\nGraphData 평균: ${Math.round(graphDataAvg * 100) / 100}M`);
  
  console.log("\n" + "=".repeat(80) + "\n");
  
  // 비교 분석
  console.log("=== 비교 분석 ===\n");
  
  console.log("저장된 categoryDevelopmentalAge:", record.categoryDevelopmentalAge, "M");
  console.log("PlayData 계산값:", Math.round(playDataAvg * 100) / 100, "M");
  console.log("GraphData 계산값:", Math.round(graphDataAvg * 100) / 100, "M");
  
  // 불일치 확인
  const playDataMatch = Math.abs(record.categoryDevelopmentalAge - playDataAvg) < 0.01;
  const graphDataMatch = Math.abs(record.categoryDevelopmentalAge - graphDataAvg) < 0.01;
  
  console.log("\n일치 여부:");
  console.log("  PlayData와 일치:", playDataMatch ? "✅" : "❌");
  console.log("  GraphData와 일치:", graphDataMatch ? "✅" : "❌");
  
  if (!playDataMatch && !graphDataMatch) {
    console.log("\n⚠️ 둘 다 불일치! 데이터 손상 가능성");
  }
  
  // PlayData와 GraphData 교차 확인
  console.log("\n" + "=".repeat(80) + "\n");
  console.log("=== PlayData vs GraphData 교차 검증 ===\n");
  
  playDataWithChecks.forEach(pd => {
    const graphEntry = record.graphData.find(g => g.playNumber === pd.playNumber);
    
    if (!graphEntry) {
      console.log(`⚠️ #${pd.playNumber} ${pd.playTitle}`);
      console.log(`   PlayData에는 있지만 GraphData에 없음!`);
      console.log(`   PlayData 값: ${pd.calculatedMonth}M (Lv${pd.highestLevel})`);
    } else {
      const match = Math.abs(pd.calculatedMonth - graphEntry.AchieveMonthOfThePlay) < 0.01;
      if (!match) {
        console.log(`❌ #${pd.playNumber} ${pd.playTitle}`);
        console.log(`   PlayData: ${pd.calculatedMonth}M (Lv${pd.highestLevel})`);
        console.log(`   GraphData: ${graphEntry.AchieveMonthOfThePlay}M (Lv${graphEntry.achievedLevel_Highest})`);
        console.log(`   차이: ${Math.abs(pd.calculatedMonth - graphEntry.AchieveMonthOfThePlay).toFixed(2)}M`);
      }
    }
  });
  
  // GraphData에만 있는 항목 확인
  record.graphData.forEach(g => {
    const playEntry = playDataWithChecks.find(pd => pd.playNumber === g.playNumber);
    if (!playEntry) {
      console.log(`⚠️ #${g.playNumber}`);
      console.log(`   GraphData에는 있지만 PlayData에 없음!`);
      console.log(`   GraphData 값: ${g.AchieveMonthOfThePlay}M`);
    }
  });
  
  console.log("\n" + "=".repeat(80) + "\n");
  console.log("조사 완료!");
  
  return {
    stored: record.categoryDevelopmentalAge,
    playDataAvg: Math.round(playDataAvg * 100) / 100,
    graphDataAvg: Math.round(graphDataAvg * 100) / 100,
    playDataCount: playDataWithChecks.length,
    graphDataCount: record.graphData.length,
    playDataTop3,
    graphDataTop3
  };
})();
