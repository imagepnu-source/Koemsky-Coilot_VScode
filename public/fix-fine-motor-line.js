const fs = require('fs');

// FM 001.txt 읽기
const content = fs.readFileSync('FM 001.txt', 'utf-8');
const lines = content.split('\n').map(line => line.replace(/\r$/, ''));

let modifiedCount = 0;

// 각 줄 처리
const newLines = lines.map(line => {
  // "Fine Motor 발달 (" 로 시작하는 줄 찾기
  if (line.startsWith('Fine Motor 발달 (')) {
    modifiedCount++;
    // "Fine Motor 발달 (" 를 "- " 로 교체하고, 마지막 ")" 제거
    const modified = line.replace(/^Fine Motor 발달 \(/, '- ').replace(/\)$/, '');
    console.log(`${modifiedCount}. 변경: ${line}`);
    console.log(`   →      ${modified}`);
    return modified;
  }
  return line;
});

// 파일 쓰기
fs.writeFileSync('FM 001.txt', newLines.join('\r\n'), 'utf-8');
console.log(`\n총 ${modifiedCount}줄 수정 완료`);
