const fs = require('fs');

const filePath = 'FM 000';
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n').map(line => line.replace(/\r$/, ''));

console.log('총 라인 수:', lines.length);

let modifiedCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Number 라인 찾기
  const numberMatch = line.match(/^Number (\d+):\s*(.+)$/);
  if (numberMatch) {
    const number = numberMatch[1];
    const titlePart = numberMatch[2].trim();
    
    // 이 라인 다음에서 난이도 조절 찾기 (최대 50줄 내에서)
    let difficultyAge = null;
    for (let j = i + 1; j < Math.min(i + 50, lines.length); j++) {
      const diffMatch = lines[j].match(/^난이도 조절:\s*\((\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)\s*개월\)/);
      if (diffMatch) {
        difficultyAge = `${diffMatch[1]}–${diffMatch[2]}`;
        break;
      }
    }
    
    if (difficultyAge) {
      // 기존 제목에서 연령 부분 제거
      let cleanTitle = titlePart
        .replace(/\s*\([0-9.]+\s*[–-]\s*[0-9.]+\s*개월\)\s*$/g, '')
        .replace(/\s*\([0-9.]+\s*개월\)\s*$/g, '')
        .trim();
      
      // 새 라인 생성
      const newLine = `Number ${number}: ${cleanTitle} (${difficultyAge}개월)`;
      
      // 원래 라인과 다르면 교체
      if (line !== newLine) {
        lines[i] = newLine;
        modifiedCount++;
        console.log(`${number}번 수정: ${cleanTitle} (${difficultyAge}개월)`);
      }
    } else {
      console.log(`⚠️  ${number}번: 난이도 조절 없음`);
    }
  }
}

// 파일 저장
const newContent = lines.join('\n');
fs.writeFileSync(filePath, newContent, 'utf8');

console.log(`\n✓ ${modifiedCount}개 놀이 제목 수정 완료`);
