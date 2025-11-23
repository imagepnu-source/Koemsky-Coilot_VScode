import re

file_path = r"c:\Users\Administrator\OneDrive\Komensky TXT\PS_B_001-100_difficulty_v1.txt"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Check for activities that still don't have the proper structure
unstructured = []

# Pattern to find all numbered activities
activity_pattern = r'Number (\d+):(.*?)\n'
activities = re.finditer(activity_pattern, content)

for match in activities:
    num = int(match.group(1))
    title = match.group(2).strip()
    
    # Focus on numbers 61-70 and 81-90
    if (61 <= num <= 70) or (81 <= num <= 90):
        # Find the play method section for this activity
        start_pos = match.start()
        next_activity = re.search(r'Number \d+:', content[start_pos+10:])
        end_pos = start_pos + 10 + (next_activity.start() if next_activity else len(content) - start_pos - 10)
        
        activity_section = content[start_pos:end_pos]
        
        # Check if it has the proper structure with 준비:, 시범:, 기본:, etc.
        if '놀이 방법:' in activity_section:
            has_structure = (
                '준비:' in activity_section and
                '시범:' in activity_section and
                '기본:' in activity_section and
                '반복:' in activity_section and
                '확장:' in activity_section and
                '협응:' in activity_section and
                '마무리:' in activity_section
            )
            
            if not has_structure:
                # Count how many structured keywords it has
                keywords = ['준비:', '시범:', '기본:', '반복:', '확장:', '협응:', '마무리:']
                count = sum(1 for kw in keywords if kw in activity_section)
                unstructured.append((num, title, count))

print("=== 아직 구조화되지 않은 놀이 방법 ===\n")
if unstructured:
    for num, title, count in unstructured:
        print(f"Number {num}: {title}")
        print(f"  → 구조화 키워드 {count}/7개 발견")
        print()
else:
    print("✓ 모든 놀이 방법(Numbers 61-70, 81-90)이 올바르게 구조화되어 있습니다!")

print(f"\n총 {len(unstructured)}개의 놀이가 추가 수정이 필요합니다.")
