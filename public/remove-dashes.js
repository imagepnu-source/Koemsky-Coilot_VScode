const fs = require('fs');
const path = require('path');

const files = [
  'details_gross-motor.txt',
  'details_fine-motor.txt',
  'details_self-care.txt',
  'details_problem-solving.txt',
  'details_social-emotion.txt',
  'details_receptive-language.txt',
  'details_expressive-language.txt'
];

files.forEach(filename => {
  const filePath = path.join(__dirname, filename);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // "---" 또는 "-----" 등 대시로만 이루어진 줄 제거
    const filteredLines = lines.filter(line => !(/^-+$/.test(line.trim())));
    
    const removedCount = lines.length - filteredLines.length;
    
    if (removedCount > 0) {
      content = filteredLines.join('\n');
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ ${filename}: ${removedCount}개 대시 줄 제거`);
    } else {
      console.log(`○ ${filename}: 대시 줄 없음`);
    }
    
  } catch (err) {
    console.log(`✗ ${filename} 오류: ${err.message}`);
  }
});

console.log('\n모든 파일 처리 완료!');
