import re

file_path = r"c:\Users\Administrator\OneDrive\Komensky TXT\PS_B_001-100_difficulty_v1.txt"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find Number 82 and fix it
for i in range(len(lines)):
    if 'Number 82: 그림 속 이상한 점 찾기' in lines[i]:
        print(f"Found Number 82 at line {i+1}")
        # Find the play method section
        for j in range(i, min(i+50, len(lines))):
            if lines[j].strip() == '놀이 방법:':
                print(f"Found 놀이 방법: at line {j+1}")
                # Replace the next 7 lines
                lines[j+1] = '1. 준비: 잘못된 상황 그림을 한 장 보여주고 자유롭게 관찰하게 합니다.\n'
                lines[j+2] = '2. 시범: "어디가 이상할까?" 질문하며 틀린 부분을 말하게 합니다.\n'
                lines[j+3] = '3. 기본: "왜 그게 틀렸을까?" 이유를 구체적으로 설명하게 유도합니다.\n'
                lines[j+4] = '4. 반복: 필요하면 선택지(발, 손, 방향 등)를 제시해 생각을 돕습니다.\n'
                lines[j+5] = '5. 확장: 어떻게 고치면 좋을지 해결 방법을 스스로 말하게 합니다.\n'
                lines[j+6] = '6. 협응: 역할놀이로 올바르게 고쳐보며 행동으로 확인합니다.\n'
                lines[j+7] = '7. 마무리: 다른 그림으로 바꿔 3~4회 반복하며 일반화합니다.\n'
                print("✓ Number 82: 그림 속 이상한 점 찾기 - 재구조화 완료")
                break
        break

# Write back to file
with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("\nNumber 82 놀이 방법이 모범 형식으로 재구조화되었습니다!")
