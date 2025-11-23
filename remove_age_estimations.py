import re

file_path = r"c:\Users\Administrator\Desktop\K1\public\PS_B_001-100_difficulty_v1.txt"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to find (a=XX개월 추산) or (b=XX개월 추산) after Level 1 or Level 5
# This pattern looks for the age estimation markers
pattern1 = r'\. \(a=\d+(?:\.\d+)?개월 추산\)\.'
pattern2 = r'\. \(b=\d+(?:\.\d+)?개월 추산\)\.'
pattern3 = r' \(a=\d+(?:\.\d+)?개월 추산\)\.'
pattern4 = r' \(b=\d+(?:\.\d+)?개월 추산\)\.'
pattern5 = r'\(a=\d+(?:\.\d+)?개월 추산\)'
pattern6 = r'\(b=\d+(?:\.\d+)?개월 추산\)'

# Count occurrences
count1 = len(re.findall(pattern1, content))
count2 = len(re.findall(pattern2, content))
count3 = len(re.findall(pattern3, content))
count4 = len(re.findall(pattern4, content))
count5 = len(re.findall(pattern5, content))
count6 = len(re.findall(pattern6, content))

print(f"패턴 1 발견: {count1}개")
print(f"패턴 2 발견: {count2}개")
print(f"패턴 3 발견: {count3}개")
print(f"패턴 4 발견: {count4}개")
print(f"패턴 5 발견: {count5}개")
print(f"패턴 6 발견: {count6}개")

# Replace patterns - remove the age estimation markers
original_content = content
content = re.sub(pattern1, '.', content)
content = re.sub(pattern2, '.', content)
content = re.sub(pattern3, '.', content)
content = re.sub(pattern4, '.', content)
content = re.sub(pattern5, '', content)
content = re.sub(pattern6, '', content)

if content != original_content:
    # Save the updated content
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"\n✓ 총 {count1+count2+count3+count4+count5+count6}개의 연령 추산 표시를 삭제했습니다.")
else:
    print("\n삭제할 연령 추산 표시를 찾지 못했습니다.")

# Also check and update the OneDrive file
file_path2 = r"c:\Users\Administrator\OneDrive\Komensky TXT\PS_B_001-100_difficulty_v1.txt"

try:
    with open(file_path2, 'r', encoding='utf-8') as f:
        content2 = f.read()
    
    original_content2 = content2
    content2 = re.sub(pattern1, '.', content2)
    content2 = re.sub(pattern2, '.', content2)
    content2 = re.sub(pattern3, '.', content2)
    content2 = re.sub(pattern4, '.', content2)
    content2 = re.sub(pattern5, '', content2)
    content2 = re.sub(pattern6, '', content2)
    
    if content2 != original_content2:
        with open(file_path2, 'w', encoding='utf-8') as f:
            f.write(content2)
        print("✓ OneDrive 파일도 업데이트했습니다.")
except:
    print("OneDrive 파일은 건너뜁니다.")
