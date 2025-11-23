import re

file_path = r"c:\Users\Administrator\Desktop\K1\public\PS_B_001-100_difficulty_v1.txt"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# More comprehensive patterns to catch all variations
patterns = [
    (r' \(a=\d+(?:\.\d+)?개월 추산\)\.', ''),
    (r' \(b=\d+(?:\.\d+)?개월 추산\)\.', ''),
    (r'\(a=\d+(?:\.\d+)?개월 추산\)\.', ''),
    (r'\(b=\d+(?:\.\d+)?개월 추산\)\.', ''),
    (r' \(a=\d+(?:\.\d+)?개월 추산\)', ''),
    (r' \(b=\d+(?:\.\d+)?개월 추산\)', ''),
    (r'\(a=\d+(?:\.\d+)?개월 추산\)', ''),
    (r'\(b=\d+(?:\.\d+)?개월 추산\)', ''),
]

total_count = 0
for pattern, replacement in patterns:
    matches = re.findall(pattern, content)
    if matches:
        print(f"패턴 '{pattern}' 발견: {len(matches)}개")
        total_count += len(matches)
        content = re.sub(pattern, replacement, content)

# Save the updated content
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n✓ public 폴더: 총 {total_count}개의 연령 추산 표시를 삭제했습니다.")

# Also update OneDrive file
file_path2 = r"c:\Users\Administrator\OneDrive\Komensky TXT\PS_B_001-100_difficulty_v1.txt"

try:
    with open(file_path2, 'r', encoding='utf-8') as f:
        content2 = f.read()
    
    total_count2 = 0
    for pattern, replacement in patterns:
        matches = re.findall(pattern, content2)
        if matches:
            total_count2 += len(matches)
            content2 = re.sub(pattern, replacement, content2)
    
    with open(file_path2, 'w', encoding='utf-8') as f:
        f.write(content2)
    print(f"✓ OneDrive 폴더: 총 {total_count2}개의 연령 추산 표시를 삭제했습니다.")
except Exception as e:
    print(f"OneDrive 파일 처리 중 오류: {e}")

# Final verification
with open(file_path, 'r', encoding='utf-8') as f:
    final_content = f.read()

remaining = len(re.findall(r'\([ab]=\d+(?:\.\d+)?개월 추산\)', final_content))
print(f"\n확인: 남은 연령 추산 표시 = {remaining}개")
