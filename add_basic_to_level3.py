import re

# 파일 읽기
with open(r'c:\Users\Administrator\Desktop\K1\public\PS_B_001-100_difficulty_v1.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# Level 3: 뒤에 (기본)이 없는 경우를 찾아서 추가
# Level 3: 로 시작하고 바로 (기본)으로 시작하지 않는 패턴
pattern = r'^(Level 3:) (?!\(기본\))'

def add_basic(match):
    return match.group(1) + ' (기본) '

# 치환 실행
new_content = re.sub(pattern, add_basic, content, flags=re.MULTILINE)

# 변경 개수 확인
changes = content.count('\nLevel 3: ') + (1 if content.startswith('Level 3: ') else 0)
changes_with_basic = new_content.count('\nLevel 3: (기본) ') + (1 if new_content.startswith('Level 3: (기본) ') else 0)
added = changes_with_basic - (content.count('\nLevel 3: (기본) ') + (1 if content.startswith('Level 3: (기본) ') else 0))

print(f"총 Level 3 항목: {changes}개")
print(f"(기본) 추가됨: {added}개")
print(f"최종 (기본) 포함: {changes_with_basic}개")

# 파일 저장
with open(r'c:\Users\Administrator\Desktop\K1\public\PS_B_001-100_difficulty_v1.txt', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("\n✅ 완료!")
