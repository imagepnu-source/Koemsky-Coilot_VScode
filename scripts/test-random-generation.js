// ---------------------------------------------------------
// Annotated on 2025-10-20 15:40
// Baseline: User-declared reference version (2025-10-21)
// File: scripts/test-random-generation.js
// Note: Comments are for maintainability; no runtime behavior change.
// ---------------------------------------------------------
// 1-25 사이의 수를 10개 랜덤하게 선택하는 함수
function generateRandomNumbers(min, max, count) {
  const numbers = new Set()

  while (numbers.size < count) {
    const randomNum = Math.floor(Math.random() * (max - min + 1)) + min
    numbers.add(randomNum)
  }

  return Array.from(numbers).sort((a, b) => a - b)
}

console.log("=== 1-25 사이의 랜덤 10개 숫자 생성 테스트 ===")
console.log("")

// 10번 실행해서 분포 확인
for (let i = 0; i < 10; i++) {
  const randomNumbers = generateRandomNumbers(1, 25, 10)
  const hasHighNumbers = randomNumbers.some((num) => num >= 15)
  const hasLowNumbers = randomNumbers.some((num) => num <= 10)

  console.log(`실행 ${i + 1}: [${randomNumbers.join(", ")}]`)
  console.log(`  - 15 이상 포함: ${hasHighNumbers ? "✓" : "✗"}`)
  console.log(`  - 10 이하 포함: ${hasLowNumbers ? "✓" : "✗"}`)
  console.log(`  - 최소값: ${Math.min(...randomNumbers)}, 최대값: ${Math.max(...randomNumbers)}`)
  console.log("")
}

// 분포 분석
console.log("=== 분포 분석 (100회 실행) ===")
const distribution = {}
for (let i = 1; i <= 25; i++) {
  distribution[i] = 0
}

for (let test = 0; test < 100; test++) {
  const numbers = generateRandomNumbers(1, 25, 10)
  numbers.forEach((num) => distribution[num]++)
}

console.log("각 숫자별 선택 횟수:")
for (let i = 1; i <= 25; i++) {
  console.log(`${i}: ${distribution[i]}회`)
}

const lowCount = Object.keys(distribution)
  .filter((key) => key <= 14)
  .reduce((sum, key) => sum + distribution[key], 0)
const highCount = Object.keys(distribution)
  .filter((key) => key >= 15)
  .reduce((sum, key) => sum + distribution[key], 0)

console.log("")
console.log(`1-14 범위 선택 횟수: ${lowCount}`)
console.log(`15-25 범위 선택 횟수: ${highCount}`)
console.log(`전체 선택 횟수: ${lowCount + highCount}`)
