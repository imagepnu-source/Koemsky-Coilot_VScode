const fs = require('fs');

// play_data_extracted.txt 읽기
const content = fs.readFileSync('play_data_extracted.txt', 'utf-8');

// 카테고리 패턴 찾기 (한글, 영문 형식)
const lines = content.split('\n');
const result = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // 카테고리 헤더 라인인지 확인 (예: "대근육, gross-motor")
  const isCategoryHeader = /^[가-힣\s]+,\s*[a-z-]+$/.test(line.trim());
  
  if (isCategoryHeader && i > 0) {
    // 이전 라인이 빈 줄이 아니면 빈 줄 추가
    if (result[result.length - 1] !== '') {
      result.push('');
    }
  }
  
  result.push(line);
}

// 결과 저장
const output = result.join('\n');
fs.writeFileSync('play_data_extracted.txt', output, 'utf-8');
console.log('✅ 카테고리 구분 빈 줄 추가 완료');

// play_data.txt도 동일하게 처리
fs.writeFileSync('play_data.txt', output, 'utf-8');
console.log('✅ play_data.txt 업데이트 완료');
