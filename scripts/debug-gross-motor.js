// 브라우저 콘솔에서 실행: 대근육 상세 디버깅
(function() {
  console.log("=== 대근육 발달나이 계산 상세 분석 ===\n");
  
  const category = "대근육";
  const key = `komensky_category_${category}`;
  const data = localStorage.getItem(key);
  
  if (!data) {
    console.log("대근육 데이터 없음");
    return;
  }
  
  const record = JSON.parse(data);
  
  console.log("1. 전체 playData 개수:", record.playData.length);
  console.log("2. 저장된 categoryDevelopmentalAge:", record.categoryDevelopmentalAge);
  console.log("3. graphData 개수:", record.graphData.length);
  console.log("\n");
  
  // playData에서 체크된 모든 놀이 상세 분석
  console.log("=== PlayData 분석 ===");
  const checkedPlays = [];
  
  record.playData.forEach((play, idx) => {
    const checkedLevels = [];
    
    play.achievedLevelFlags.forEach((checked, levelIdx) => {
      if (checked) {
        checkedLevels.push({
          level: levelIdx + 1,
          date: play.achievedDates[levelIdx]
        });
      }
    });
    
    if (checkedLevels.length > 0) {
      // 최고 레벨 찾기
      const highest = checkedLevels.reduce((max, curr) => 
        curr.level > max.level ? curr : max
      , checkedLevels[0]);
      
      // 발달 개월 계산
      const delta = (play.maxAge - play.minAge) / 4;
      const achieveMonth = play.minAge + delta * (highest.level - 1);
      
      const playInfo = {
        index: idx,
        playNumber: play.playNumber,
        playTitle: play.playTitle,
        minAge: play.minAge,
        maxAge: play.maxAge,
        delta: Math.round(delta * 100) / 100,
        allLevels: checkedLevels,
        highestLevel: highest.level,
        highestDate: highest.date ? new Date(highest.date) : null,
        achieveMonth: Math.round(achieveMonth * 100) / 100
      };
      
      checkedPlays.push(playInfo);
      
      console.log(`\n놀이 #${play.playNumber}: ${play.playTitle}`);
      console.log(`  연령대: ${play.minAge}-${play.maxAge}M (delta: ${playInfo.delta})`);
      console.log(`  체크된 레벨:`, checkedLevels.map(l => `Lv${l.level}`).join(", "));
      console.log(`  최고 레벨: Lv${highest.level}`);
      console.log(`  최고 레벨 날짜:`, highest.date);
      console.log(`  발달개월 계산: ${play.minAge} + ${playInfo.delta} × ${highest.level - 1} = ${playInfo.achieveMonth}`);
    }
  });
  
  console.log("\n\n=== 발달나이 계산 ===");
  console.log("총 체크된 놀이:", checkedPlays.length);
  
  if (checkedPlays.length === 0) {
    console.log("체크된 놀이 없음");
    return;
  }
  
  // 날짜순 정렬
  const sorted = [...checkedPlays].sort((a, b) => {
    if (!a.highestDate) return 1;
    if (!b.highestDate) return -1;
    return a.highestDate - b.highestDate;
  });
  
  console.log("\n날짜순 정렬:");
  sorted.forEach((p, idx) => {
    console.log(`${idx + 1}. #${p.playNumber} ${p.achieveMonth}M (${p.highestDate ? p.highestDate.toLocaleDateString() : "날짜없음"})`);
  });
  
  // 발달개월 높은순 정렬
  const byAchievement = [...checkedPlays].sort((a, b) => b.achieveMonth - a.achieveMonth);
  
  console.log("\n발달개월 높은순 정렬:");
  byAchievement.forEach((p, idx) => {
    console.log(`${idx + 1}. #${p.playNumber} ${p.playTitle}: ${p.achieveMonth}M (Lv${p.highestLevel})`);
  });
  
  // 상위 3개 선택
  const top3 = byAchievement.slice(0, 3);
  
  console.log("\n\n=== 상위 3개로 발달나이 계산 ===");
  top3.forEach((p, idx) => {
    console.log(`${idx + 1}. #${p.playNumber} ${p.playTitle}`);
    console.log(`   ${p.minAge}-${p.maxAge}M, Lv${p.highestLevel} → ${p.achieveMonth}M`);
  });
  
  const sum = top3.reduce((s, p) => s + p.achieveMonth, 0);
  const average = sum / top3.length;
  const finalAge = Math.round(average * 100) / 100;
  
  console.log(`\n합계: ${sum.toFixed(2)}`);
  console.log(`평균: ${sum.toFixed(2)} ÷ ${top3.length} = ${average.toFixed(4)}`);
  console.log(`최종 (소수점 2자리): ${finalAge}`);
  
  console.log("\n\n=== 결과 비교 ===");
  console.log(`저장된 값: ${record.categoryDevelopmentalAge}`);
  console.log(`계산된 값: ${finalAge}`);
  console.log(`일치 여부: ${record.categoryDevelopmentalAge === finalAge ? "✅ 일치" : "❌ 불일치"}`);
  
  if (record.categoryDevelopmentalAge !== finalAge) {
    console.log(`차이: ${(record.categoryDevelopmentalAge - finalAge).toFixed(2)}`);
  }
  
  // graphData 분석
  console.log("\n\n=== GraphData 분석 ===");
  console.log("graphData 항목 수:", record.graphData.length);
  
  if (record.graphData.length > 0) {
    console.log("\ngraphData 내용:");
    const sortedGraph = [...record.graphData].sort((a, b) => 
      new Date(a.achieveDate) - new Date(b.achieveDate)
    );
    
    sortedGraph.forEach((g, idx) => {
      console.log(`${idx + 1}. #${g.playNumber}: ${g.AchieveMonthOfThePlay}M (${new Date(g.achieveDate).toLocaleDateString()})`);
    });
    
    // graphData의 최대값들
    const graphTop3 = [...sortedGraph]
      .sort((a, b) => b.AchieveMonthOfThePlay - a.AchieveMonthOfThePlay)
      .slice(0, 3);
    
    console.log("\ngraphData 상위 3개:");
    graphTop3.forEach((g, idx) => {
      console.log(`${idx + 1}. #${g.playNumber}: ${g.AchieveMonthOfThePlay}M`);
    });
    
    const graphAvg = graphTop3.reduce((s, g) => s + g.AchieveMonthOfThePlay, 0) / graphTop3.length;
    console.log(`\ngraphData 기준 평균: ${Math.round(graphAvg * 100) / 100}`);
  }
  
})();
