// 브라우저 콘솔에서 실행: 모든 카테고리의 계산 방식 비교
(function() {
  console.log("=== 모든 카테고리의 발달나이 계산 비교 ===\n");
  
  const categories = ["대근육", "소근육", "인지", "언어", "사회 정서", "자조"];
  const results = {};
  
  categories.forEach(category => {
    const key = `komensky_category_${category}`;
    const data = localStorage.getItem(key);
    
    if (!data) {
      results[category] = { error: "데이터 없음" };
      return;
    }
    
    try {
      const record = JSON.parse(data);
      
      // playData에서 체크된 놀이 추출
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
          const delta = (play.maxAge - play.minAge) / 4;
          const achieveMonth = play.minAge + delta * (highestLevel - 1);
          
          checkedPlays.push({
            playNumber: play.playNumber,
            playTitle: play.playTitle,
            minAge: play.minAge,
            maxAge: play.maxAge,
            delta: delta,
            highestLevel: highestLevel,
            achieveMonth: Math.round(achieveMonth * 100) / 100,
            date: new Date(highestDate)
          });
        }
      });
      
      if (checkedPlays.length === 0) {
        results[category] = { 
          checkedCount: 0,
          storedAge: record.categoryDevelopmentalAge,
          note: "체크된 놀이 없음"
        };
        return;
      }
      
      // 상위 3개로 평균 계산
      const top3 = [...checkedPlays]
        .sort((a, b) => b.achieveMonth - a.achieveMonth)
        .slice(0, 3);
      
      const average = top3.reduce((sum, p) => sum + p.achieveMonth, 0) / top3.length;
      const calculatedAge = Math.round(average * 100) / 100;
      
      const match = record.categoryDevelopmentalAge === calculatedAge;
      
      results[category] = {
        checkedCount: checkedPlays.length,
        storedAge: record.categoryDevelopmentalAge,
        calculatedAge: calculatedAge,
        match: match,
        difference: match ? 0 : Math.round((record.categoryDevelopmentalAge - calculatedAge) * 100) / 100,
        top3: top3.map(p => ({
          num: p.playNumber,
          title: p.playTitle.substring(0, 15),
          age: `${p.minAge}-${p.maxAge}`,
          lv: p.highestLevel,
          month: p.achieveMonth
        })),
        allPlayAges: checkedPlays.map(p => ({
          num: p.playNumber,
          minAge: p.minAge,
          maxAge: p.maxAge,
          delta: Math.round(p.delta * 100) / 100
        }))
      };
      
    } catch (e) {
      results[category] = { error: e.message };
    }
  });
  
  // 결과 출력
  console.table(
    categories.map(cat => ({
      카테고리: cat,
      체크된놀이: results[cat].checkedCount ?? "N/A",
      저장된나이: results[cat].storedAge ?? "N/A",
      계산된나이: results[cat].calculatedAge ?? "N/A",
      일치: results[cat].match ? "✅" : results[cat].error ? "❌" : "❌",
      차이: results[cat].difference ?? "N/A"
    }))
  );
  
  // 상세 정보
  console.log("\n=== 각 카테고리 상세 정보 ===\n");
  
  categories.forEach(cat => {
    const r = results[cat];
    
    if (r.error || r.note) {
      console.log(`${cat}: ${r.error || r.note}`);
      return;
    }
    
    console.log(`\n${cat}:`);
    console.log(`  총 체크된 놀이: ${r.checkedCount}개`);
    console.log(`  저장된 발달나이: ${r.storedAge}`);
    console.log(`  계산된 발달나이: ${r.calculatedAge}`);
    
    if (!r.match) {
      console.log(`  ⚠️ 불일치! 차이: ${r.difference}`);
    }
    
    console.log(`\n  상위 3개:`);
    r.top3.forEach((p, idx) => {
      console.log(`    ${idx + 1}. #${p.num} ${p.title} | ${p.age}M Lv${p.lv} → ${p.month}M`);
    });
    
    // 연령대 분포 분석
    const ageRanges = r.allPlayAges.map(p => ({
      min: p.minAge,
      max: p.maxAge,
      delta: p.delta
    }));
    
    const avgMin = ageRanges.reduce((s, a) => s + a.min, 0) / ageRanges.length;
    const avgMax = ageRanges.reduce((s, a) => s + a.max, 0) / ageRanges.length;
    const avgDelta = ageRanges.reduce((s, a) => s + a.delta, 0) / ageRanges.length;
    
    console.log(`\n  연령대 통계:`);
    console.log(`    평균 minAge: ${avgMin.toFixed(2)}`);
    console.log(`    평균 maxAge: ${avgMax.toFixed(2)}`);
    console.log(`    평균 delta: ${avgDelta.toFixed(2)}`);
  });
  
  // 이상 패턴 찾기
  console.log("\n\n=== 이상 패턴 분석 ===");
  
  const mismatches = categories.filter(cat => 
    results[cat].match === false && !results[cat].error
  );
  
  if (mismatches.length > 0) {
    console.log(`불일치하는 카테고리: ${mismatches.join(", ")}`);
    
    mismatches.forEach(cat => {
      const r = results[cat];
      console.log(`\n${cat}:`);
      console.log(`  저장값 ${r.storedAge} vs 계산값 ${r.calculatedAge}`);
      console.log(`  차이: ${r.difference} (${((r.difference / r.storedAge) * 100).toFixed(1)}%)`);
    });
  } else {
    console.log("모든 카테고리가 일치합니다 ✅");
  }
  
  return results;
})();
