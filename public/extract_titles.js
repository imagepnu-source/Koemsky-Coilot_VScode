const fs = require('fs');
const path = require('path');

// 카테고리별 파일명과 영문명 매핑
const categories = [
  { ko: '대근육', en: 'gross-motor', file: 'details_gross-motor.txt' },
  { ko: '소근육', en: 'fine-motor', file: 'details_fine-motor.txt' },
  { ko: '스스로', en: 'self-care', file: 'details_self-care.txt' },
  { ko: '문제 해결', en: 'problem-solving', file: 'details_problem-solving.txt' },
  { ko: '사회적 감성', en: 'social-emotion', file: 'details_social-emotion.txt' },
  { ko: '수용언어', en: 'receptive-language', file: 'details_receptive-language.txt' },
  { ko: '표현언어', en: 'expressive-language', file: 'details_expressive-language.txt' }
];

let output = '';

categories.forEach(cat => {
  try {
    const filePath = path.join(__dirname, cat.file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    output += cat.ko + ', ' + cat.en + '\n';
    output += 'Number\tKorean Title\tAge Range\n';
    
    const entries = [];
    let currentNumber = null;
    let currentTitle = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // "Number X: 제목 (나이범위)" 형식에서 제목과 나이 범위를 분리
      let match = line.match(/^Number (\d+):\s*(.+)$/);
      if (match) {
        currentNumber = match[1];
        let fullTitle = match[2].trim();
        
        // 제목에서 나이 범위 추출 시도
        let ageMatch = fullTitle.match(/\(\s*(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)\s*개월\s*\)$/);
        if (ageMatch) {
          // 제목에 나이 범위가 있는 경우 - 제목에서 제거하고 나이 범위 저장
          const title = fullTitle.replace(/\s*\(\s*(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)\s*개월\s*\)$/, '').trim();
          const minAge = ageMatch[1];
          const maxAge = ageMatch[2];
          // 바로 entries에 추가
          entries.push({ number: parseInt(currentNumber), title, minAge, maxAge });
          currentNumber = null;
          currentTitle = null;
          continue;
        }
        
        // 단일 나이
        ageMatch = fullTitle.match(/\(\s*(\d+(?:\.\d+)?)\s*개월\s*\)$/);
        if (ageMatch) {
          const title = fullTitle.replace(/\s*\(\s*(\d+(?:\.\d+)?)\s*개월\s*\)$/, '').trim();
          const age = ageMatch[1];
          entries.push({ number: parseInt(currentNumber), title, minAge: age, maxAge: age });
          currentNumber = null;
          currentTitle = null;
          continue;
        }
        
        // 나이 범위가 없는 경우 - 나중에 "난이도 조절:" 줄에서 찾기
        currentTitle = fullTitle;
        continue;
      }
      
      // "난이도 조절: (나이범위)" 형식
      if (currentNumber && currentTitle) {
        match = line.match(/^난이도\s*조절:\s*\((\d+(?:\.\d+)?)[–-](\d+(?:\.\d+)?)\s*개월\)/);
        if (match) {
          const minAge = match[1];
          const maxAge = match[2];
          entries.push({ number: parseInt(currentNumber), title: currentTitle, minAge, maxAge });
          currentNumber = null;
          currentTitle = null;
          continue;
        }
        
        // 단일 나이
        match = line.match(/^난이도\s*조절:\s*\((\d+(?:\.\d+)?)\s*개월\)/);
        if (match) {
          const age = match[1];
          entries.push({ number: parseInt(currentNumber), title: currentTitle, minAge: age, maxAge: age });
          currentNumber = null;
          currentTitle = null;
          continue;
        }
      }
    }
    
    // 번호 순으로 정렬
    entries.sort((a, b) => a.number - b.number);
    
    entries.forEach(entry => {
      // 제목에서 나이 범위 표시 제거 (예: " (3-6개월)" 또는 " (12 개월)")
      let cleanTitle = entry.title;
      cleanTitle = cleanTitle.replace(/\s*\([0-9.]+[–-][0-9.]+\s*개월\)\s*$/g, '');
      cleanTitle = cleanTitle.replace(/\s*\([0-9.]+\s*개월\)\s*$/g, '');
      
      output += entry.number + '\t' + cleanTitle + '\t' + entry.minAge + '-' + entry.maxAge + '\n';
    });
    
    output += '\n';
    console.log('✓ ' + cat.ko + ': ' + entries.length + '개 추출');
    
  } catch (err) {
    console.log('✗ ' + cat.ko + ' 파일 읽기 오류: ' + err.message);
  }
});

// 파일 저장
const outputPath = path.join(__dirname, 'play_data_extracted.txt');
fs.writeFileSync(outputPath, output, 'utf8');
console.log('\n파일 생성 완료: play_data_extracted.txt');
console.log('경로: ' + outputPath);
