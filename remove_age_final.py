import re

file_path = r"c:\Users\Administrator\Desktop\K1\public\PS_B_001-100_difficulty_v1.txt"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to find and remove (a=XX개월 추산) or (b=XX개월 추산) anywhere in the text
# Including both English period (.) and Korean period (。)
pattern = r' \([ab]=\d+(?:\.\d+)?개월 추산\)[.。]?'

matches = re.findall(pattern, content)
print(f"발견된 패턴: {len(matches)}개")
for i, match in enumerate(matches[:5], 1):  # Show first 5 examples
    print(f"  예시 {i}: '{match}'")

# Remove the pattern
content = re.sub(pattern, '.', content)

# Save the updated content
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n✓ public 폴더: 총 {len(matches)}개의 연령 추산 표시를 삭제했습니다.")

# Also update OneDrive file
file_path2 = r"c:\Users\Administrator\OneDrive\Komensky TXT\PS_B_001-100_difficulty_v1.txt"

try:
    with open(file_path2, 'r', encoding='utf-8') as f:
        content2 = f.read()
    
    matches2 = re.findall(pattern, content2)
    content2 = re.sub(pattern, '.', content2)
    
    with open(file_path2, 'w', encoding='utf-8') as f:
        f.write(content2)
    print(f"✓ OneDrive 폴더: 총 {len(matches2)}개의 연령 추산 표시를 삭제했습니다.")
except Exception as e:
    print(f"OneDrive 파일 처리 중 오류: {e}")

# Final verification
with open(file_path, 'r', encoding='utf-8') as f:
    final_content = f.read()

remaining = len(re.findall(r'\([ab]=\d+(?:\.\d+)?개월 추산\)', final_content))
print(f"\n✅ 확인: 남은 연령 추산 표시 = {remaining}개")
