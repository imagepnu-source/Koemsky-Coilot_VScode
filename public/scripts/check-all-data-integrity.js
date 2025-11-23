// 브라우저 콘솔에서 실행: 모든 카테고리 PlayData vs GraphData 비교
(function() {
  console.log("=== 전체 카테고리 데이터 무결성 검사 ===\n");
  
  const categories = ["대근육", "소근육", "인지", "언어", "사회 정서", "자조"];
  const results = {};
  
  categories.forEach(category => {
    const key = `komensky_category_record_${category}`;
    const data = localStorage.getItem(key);
    
    if (!data) {
      results[category] = { error: "데이터 없음" };
      return;
    }
    
    try {
      const record = JSON.parse(data);
      
      // PlayData에서 체크된 놀이 계산
      const playDataChecked = [];
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
          const delta = (play.maxAge - play.minAge) / 4;
          const achieveMonth = play.minAge + delta * (highestLevel - 1);
          
          playDataChecked.push({
            playNumber: play.playNumber,
            level: highestLevel,
            month: Math.round(achieveMonth * 100) / 100
          });
        }
      });
      
      // PlayData 상위 3개 평균
      const playDataTop3 = [...playDataChecked]
        .sort((a, b) => b.month - a.month)
        .slice(0, 3);
      const playDataAvg = playDataTop3.length > 0
        ? playDataTop3.reduce((sum, p) => sum + p.month, 0) / playDataTop3.length
        : 0;
      
      // GraphData 상위 3개 평균
      const graphDataTop3 = [...record.graphData]
        .sort((a, b) => b.AchieveMonthOfThePlay - a.AchieveMonthOfThePlay)
        .slice(0, 3);
      const graphDataAvg = graphDataTop3.length > 0
        ? graphDataTop3.reduce((sum, g) => sum + g.AchieveMonthOfThePlay, 0) / graphDataTop3.length
        : 0;
      
      // 불일치 항목 찾기
      const mismatches = [];
      playDataChecked.forEach(pd => {
        const graphEntry = record.graphData.find(g => g.playNumber === pd.playNumber);
        if (graphEntry) {
          if (Math.abs(pd.month - graphEntry.AchieveMonthOfThePlay) > 0.01) {
            mismatches.push({
              playNumber: pd.playNumber,
              playData: pd.month,
              graphData: graphEntry.AchieveMonthOfThePlay,
              diff: Math.abs(pd.month - graphEntry.AchieveMonthOfThePlay)
            });
          }
        }
      });
      
      const playDataMatch = Math.abs(record.categoryDevelopmentalAge - playDataAvg) < 0.01;
      const graphDataMatch = Math.abs(record.categoryDevelopmentalAge - graphDataAvg) < 0.01;
      
      results[category] = {
        stored: record.categoryDevelopmentalAge,
        playDataAvg: Math.round(playDataAvg * 100) / 100,
        graphDataAvg: Math.round(graphDataAvg * 100) / 100,
        playDataCount: playDataChecked.length,
        graphDataCount: record.graphData.length,
        playDataMatch,
        graphDataMatch,
        mismatches: mismatches.length,
        status: playDataMatch && graphDataMatch ? "✅" : "❌"
      };
      
    } catch (e) {
      results[category] = { error: e.message };
    }
  });
  
  // 결과 테이블 출력
  console.table(
    categories.map(cat => {
      const r = results[cat];
      if (r.error) {
        return { 카테고리: cat, 상태: "❌", 오류: r.error };
      }
      return {
        카테고리: cat,
        저장값: r.stored,
        PlayData평균: r.playDataAvg,
        GraphData평균: r.graphDataAvg,
        불일치항목: r.mismatches,
        상태: r.status
      };
    })
  );
  
  // 상세 문제 분석
  console.log("\n=== 문제가 있는 카테고리 상세 ===\n");
  
  categories.forEach(cat => {
    const r = results[cat];
    if (!r.error && r.status === "❌") {
      console.log(`\n${cat}:`);
      console.log(`  저장된 값: ${r.stored}M`);
      console.log(`  PlayData 계산: ${r.playDataAvg}M ${r.playDataMatch ? "✅" : "❌"}`);
      console.log(`  GraphData 계산: ${r.graphDataAvg}M ${r.graphDataMatch ? "✅" : "❌"}`);
      console.log(`  불일치 항목: ${r.mismatches}개`);
      
      if (!r.playDataMatch && !r.graphDataMatch) {
        console.log(`  ⚠️ 심각: PlayData와 GraphData 모두 불일치!`);
      } else if (!r.playDataMatch) {
        console.log(`  ⚠️ PlayData 불일치 - GraphData가 올바를 수 있음`);
      } else if (!r.graphDataMatch) {
        console.log(`  ⚠️ GraphData 불일치 - PlayData가 올바를 수 있음`);
      }
    }
  });
  
  // 권장 조치
  console.log("\n=== 권장 조치 ===\n");
  
  const problemCategories = categories.filter(cat => 
    results[cat] && !results[cat].error && results[cat].status === "❌"
  );
  
  if (problemCategories.length === 0) {
    console.log("✅ 모든 카테고리가 정상입니다!");
  } else {
    console.log(`문제가 있는 카테고리: ${problemCategories.join(", ")}`);
    console.log("\n해결 방법:");
    console.log("1. GraphData 재생성:");
    console.log("   - 브라우저 콘솔에서 실행:");
    console.log("   fetch('/scripts/fix-graph-data.js').then(r=>r.text()).then(eval)");
    console.log("\n2. 전체 재계산:");
    problemCategories.forEach(cat => {
      console.log(`   window.dispatchEvent(new CustomEvent("recalculateCategory", { detail: { category: "${cat}" } }))`);
    });
  }
  
  return results;
})();
