const fs = require('fs');

// 처리할 details 파일 목록
const files = [
  'details_fine-motor.txt',
  'details_gross-motor.txt',
  'details_problem-solving.txt',
  'details_receptive-language.txt',
  'details_expressive-language.txt',
  'details_social-emotion.txt',
  'details_self-care.txt'
];

let totalModified = 0;

files.forEach(filename => {
  console.log(`\n처리 중: ${filename}`);
  
  // 파일 읽기
  const content = fs.readFileSync(filename, 'utf-8');
  const lines = content.split('\n').map(line => line.replace(/\r$/, ''));

  let modifiedCount = 0;
  const newLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    newLines.push(line);
    
    // "코메니우스 교육철학 반영:" 찾기
    if (line.match(/^코메니우스 교육철학 반영:/)) {
      // 다음 라인 확인
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        
        // 다음 라인이 "- "로 시작하지 않으면 "- " 삽입
        if (nextLine.trim() && !nextLine.match(/^-\s/)) {
          modifiedCount++;
          console.log(`  ${modifiedCount}. 라인 ${i + 1} 다음에 "- " 삽입`);
          console.log(`     기존: ${nextLine.substring(0, 60)}...`);
          
          // 다음 라인에 "- " 추가
          i++; // 다음 라인로 이동
          newLines.push('- ' + nextLine);
          continue; // 다음 라인을 이미 처리했으므로 건너뜀
        }
      }
    }
  }

  // 파일 쓰기
  if (modifiedCount > 0) {
    fs.writeFileSync(filename, newLines.join('\r\n'), 'utf-8');
    console.log(`  ✓ ${modifiedCount}개 항목 수정 완료`);
    totalModified += modifiedCount;
  } else {
    console.log(`  ✓ 수정 불필요 (이미 완료됨)`);
  }
});

console.log(`\n전체 결과: 총 ${totalModified}개 항목에 "- " 추가 완료`);
