const fs = require('fs');

// FM 001.txt 읽기
const content = fs.readFileSync('FM 001.txt', 'utf-8');
const lines = content.split('\n').map(line => line.replace(/\r$/, ''));

let modifiedCount = 0;
const newLines = [];
let i = 0;

while (i < lines.length) {
  const line = lines[i];
  
  // Number 제목 찾기 - 범위 형식: (a–b개월) 또는 단일 형식: (a개월)
  const titleMatchRange = line.match(/^(Number \d+):\s*(.+?)\s*\((\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)\s*개월\)\s*$/);
  const titleMatchSingle = line.match(/^(Number \d+):\s*(.+?)\s*\((\d+(?:\.\d+)?)\s*개월\)\s*$/);
  
  const titleMatch = titleMatchRange || titleMatchSingle;
  
  if (titleMatch) {
    // 제목 발견, 이제 "놀이 난이도 조절:" 찾기
    let difficultyLine = null;
    let difficultyIndex = -1;
    
    // 다음 30줄 내에서 "난이도 조절:" 찾기
    for (let j = i + 1; j < Math.min(i + 35, lines.length); j++) {
      if (lines[j].match(/^난이도 조절:/)) {
        difficultyLine = lines[j];
        difficultyIndex = j;
        break;
      }
      // 다음 Number 제목이 나오면 중단
      if (lines[j].match(/^Number \d+:/)) {
        break;
      }
    }
    
    if (difficultyLine) {
      // "난이도 조절: (a–b개월)" 에서 연령 추출
      const difficultyMatch = difficultyLine.match(/^난이도 조절:\s*\((\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)\s*개월\)/);
      
      if (difficultyMatch) {
        const newMinAge = difficultyMatch[1];
        const newMaxAge = difficultyMatch[2];
        
        // 기존 제목의 연령 (범위 또는 단일)
        let oldAgeStr;
        if (titleMatchRange) {
          oldAgeStr = `${titleMatch[3]}–${titleMatch[4]}`;
        } else {
          oldAgeStr = titleMatch[3];
        }
        
        const newAgeStr = `${newMinAge}–${newMaxAge}`;
        
        // 연령이 다르면 교체
        if (oldAgeStr !== newAgeStr) {
          const newTitle = `${titleMatch[1]}: ${titleMatch[2]} (${newMinAge}–${newMaxAge}개월)`;
          modifiedCount++;
          console.log(`${modifiedCount}. ${titleMatch[1]}`);
          console.log(`   기존: (${oldAgeStr}개월) → 변경: (${newAgeStr}개월)`);
          newLines.push(newTitle);
        } else {
          newLines.push(line);
        }
      } else {
        newLines.push(line);
      }
    } else {
      newLines.push(line);
    }
  } else {
    newLines.push(line);
  }
  
  i++;
}

// 파일 쓰기
fs.writeFileSync('FM 001.txt', newLines.join('\r\n'), 'utf-8');
console.log(`\n총 ${modifiedCount}개 놀이 제목의 연령 수정 완료`);
