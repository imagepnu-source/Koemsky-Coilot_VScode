import re

file_path = r"c:\Users\Administrator\OneDrive\Komensky TXT\PS_B_001-100_difficulty_v1.txt"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find and replace Number 64 (무게 비교하기)
for i in range(len(lines)):
    if 'Number 64: 무게 비교하기' in lines[i]:
        # Find the play method section
        for j in range(i, min(i+50, len(lines))):
            if lines[j].strip() == '놀이 방법:':
                # Replace the next 7 lines
                lines[j+1] = '1. 준비: 두 가지 물건을 테이블에 나란히 놓고 자유롭게 관찰하게 합니다.\n'
                lines[j+2] = '2. 시범: 보호자가 두 물건을 들어 보며 "어느 게 더 무거울까?" 질문합니다.\n'
                lines[j+3] = '3. 기본: 아이에게 두 물건을 직접 들어보게 하고 느낀 점을 말하게 합니다.\n'
                lines[j+4] = '4. 반복: 간이 저울에 올려 결과를 확인하며 손의 느낌과 비교합니다.\n'
                lines[j+5] = '5. 확장: "왜 이게 더 무거울까?" 물으며 재질과 크기의 관계를 탐색합니다.\n'
                lines[j+6] = '6. 협응: 다른 물건 쌍으로 바꾸어 아이 스스로 무게를 예측하고 확인합니다.\n'
                lines[j+7] = '7. 마무리: 여러 물건을 무게 순으로 배열하며 무게 개념을 정리합니다.\n'
                print("✓ Number 64: 무게 비교하기 - 재구조화 완료")
                break
        break

# Find and replace Number 70 (간단한 규칙 이어가기)
for i in range(len(lines)):
    if 'Number 70: 간단한 규칙 이어가기' in lines[i]:
        # Find the play method section
        for j in range(i, min(i+50, len(lines))):
            if lines[j].strip() == '놀이 방법:':
                # Replace the next 7 lines
                lines[j+1] = '1. 준비: 색색의 도형 카드를 테이블에 펼쳐 놓고 규칙을 하나 정합니다.\n'
                lines[j+2] = '2. 시범: 보호자가 노랑-파랑-노랑-파랑 식으로 배열하며 규칙을 보여줍니다.\n'
                lines[j+3] = '3. 기본: 아이에게 "무슨 색이 다음일까?" 질문하며 규칙을 관찰하게 합니다.\n'
                lines[j+4] = '4. 반복: 아이가 다음 도형을 선택하여 규칙에 맞게 이어 붙이게 합니다.\n'
                lines[j+5] = '5. 확장: 규칙을 바꾸어 다양한 도형 조합으로 여러 번 반복합니다.\n'
                lines[j+6] = '6. 협응: 아이가 스스로 새로운 규칙을 만들고 보호자가 맞춰보게 합니다.\n'
                lines[j+7] = '7. 마무리: 완성한 규칙 줄을 함께 보며 패턴 인식 능력을 칭찬합니다.\n'
                print("✓ Number 70: 간단한 규칙 이어가기 - 재구조화 완료")
                break
        break

# Find and replace Number 81 (숫자 스티커 순서대로 붙이기)
for i in range(len(lines)):
    if 'Number 81: 숫자 스티커 순서대로 붙이기' in lines[i]:
        # Find the play method section
        for j in range(i, min(i+50, len(lines))):
            if lines[j].strip() == '놀이 방법:':
                # Replace the next 7 lines
                lines[j+1] = '1. 준비: 활동지와 숫자 스티커를 테이블에 펼쳐 놓습니다.\n'
                lines[j+2] = '2. 시범: 보호자가 \'1\' 스티커를 찾아 첫 칸에 붙이며 보여줍니다.\n'
                lines[j+3] = '3. 기본: 아이에게 \'2\'를 찾아 다음 칸에 붙이게 하며 순서를 말합니다.\n'
                lines[j+4] = '4. 반복: 3부터 10까지 차례로 붙이며 헷갈리면 함께 세어 확인합니다.\n'
                lines[j+5] = '5. 확장: 붙인 숫자 아래에 점을 찍어 수량과 숫자를 연결해 봅니다.\n'
                lines[j+6] = '6. 협응: 역순으로 읽어보거나 짝수/홀수만 찾으며 수 감각을 확장합니다.\n'
                lines[j+7] = '7. 마무리: 새 활동지로 바꾸어 혼자서 완성하며 자신감을 키웁니다.\n'
                print("✓ Number 81: 숫자 스티커 순서대로 붙이기 - 재구조화 완료")
                break
        break

# Find and replace Number 83 (스스로 문제 만들고 답해보기)
for i in range(len(lines)):
    if 'Number 83: 스스로 문제 만들고 답해보기' in lines[i]:
        # Find the play method section
        for j in range(i, min(i+50, len(lines))):
            if lines[j].strip() == '놀이 방법:':
                # Replace the next 7 lines
                lines[j+1] = '1. 준비: 빈 카드와 색연필, 스티커를 테이블에 준비합니다.\n'
                lines[j+2] = '2. 시범: 보호자가 간단한 문제를 말로 만들고 카드에 적어 봅니다.\n'
                lines[j+3] = '3. 기본: 아이에게 주제를 정하고 문제를 말로 먼저 만들어보게 합니다.\n'
                lines[j+4] = '4. 반복: 문장을 카드에 적거나 그림으로 표현하며 정답을 정합니다.\n'
                lines[j+5] = '5. 확장: 보호자가 풀어보며 규칙이 모호한 부분을 함께 다듬습니다.\n'
                lines[j+6] = '6. 협응: 역할을 바꿔 아이가 출제자가 되고 보호자가 답을 맞힙니다.\n'
                lines[j+7] = '7. 마무리: 완성한 문제 카드를 모아 \'나만의 문제집\'으로 정리합니다.\n'
                print("✓ Number 83: 스스로 문제 만들고 답해보기 - 재구조화 완료")
                break
        break

# Find and replace Number 84 (간단한 패턴 따라 그리기)
for i in range(len(lines)):
    if 'Number 84: 간단한 패턴 따라 그리기' in lines[i]:
        # Find the play method section
        for j in range(i, min(i+50, len(lines))):
            if lines[j].strip() == '놀이 방법:':
                # Replace the next 7 lines
                lines[j+1] = '1. 준비: 패턴 활동지와 색연필을 테이블에 펼쳐 놓습니다.\n'
                lines[j+2] = '2. 시범: 보호자가 한 줄의 패턴을 손가락으로 짚으며 소리 내어 읽습니다.\n'
                lines[j+3] = '3. 기본: 아이에게 빈칸에 들어갈 다음 도형을 예측하게 합니다.\n'
                lines[j+4] = '4. 반복: 예측한 도형을 직접 그려 넣고 패턴을 확인합니다.\n'
                lines[j+5] = '5. 확장: 색을 바꿔 같은 규칙을 새 줄에 다시 적용해 봅니다.\n'
                lines[j+6] = '6. 협응: 아이가 스스로 규칙을 만들어 한 줄을 완성하게 합니다.\n'
                lines[j+7] = '7. 마무리: 완성한 패턴을 함께 읽으며 규칙 인식 능력을 칭찬합니다.\n'
                print("✓ Number 84: 간단한 패턴 따라 그리기 - 재구조화 완료")
                break
        break

# Find and replace Number 85 (반으로 접기 대칭 모양 관찰)
for i in range(len(lines)):
    if 'Number 85: 반으로 접기 대칭 모양 관찰' in lines[i]:
        # Find the play method section
        for j in range(i, min(i+50, len(lines))):
            if lines[j].strip() == '놀이 방법:':
                # Replace the next 7 lines
                lines[j+1] = '1. 준비: A4용지와 색연필을 테이블에 놓고 중앙선을 가볍게 그어 봅니다.\n'
                lines[j+2] = '2. 시범: 보호자가 종이를 반으로 접고 손가락으로 꾹 눌러 접힌 선을 만듭니다.\n'
                lines[j+3] = '3. 기본: 종이를 펼쳐 접힌 선과 좌우 면을 함께 관찰합니다.\n'
                lines[j+4] = '4. 반복: 한쪽 면에 간단한 점이나 선을 그리고 접어 문질러 찍어 봅니다.\n'
                lines[j+5] = '5. 확장: 펼쳐서 양쪽이 대칭이 되었는지 확인하며 대칭 개념을 익힙니다.\n'
                lines[j+6] = '6. 협응: 다른 모양으로 2~3회 반복하며 아이 스스로 대칭을 만들게 합니다.\n'
                lines[j+7] = '7. 마무리: 완성된 대칭 그림을 함께 보며 좌우 공간 인식을 칭찬합니다.\n'
                print("✓ Number 85: 반으로 접기 대칭 모양 관찰 - 재구조화 완료")
                break
        break

# Find and replace remaining numbers (86-90) 
numbers_to_fix = [
    (86, "상황극 문제 해결 놀이", [
        '1. 준비: 간단한 문제 상황을 설정하고 역할을 나눕니다.\n',
        '2. 시범: 보호자가 문제 상황을 연기하며 "어떻게 하면 좋을까?" 묻습니다.\n',
        '3. 기본: 아이에게 해결 방법을 생각해보게 하고 자유롭게 말하게 합니다.\n',
        '4. 반복: 제시한 방법을 상황극으로 실제 연기하며 확인합니다.\n',
        '5. 확장: 다른 해결 방법도 있는지 함께 탐색하며 여러 가능성을 봅니다.\n',
        '6. 협응: 역할을 바꾸어 아이가 문제를 내고 보호자가 해결하게 합니다.\n',
        '7. 마무리: 다양한 상황으로 3~4회 반복하며 문제 해결력을 강화합니다.\n'
    ]),
    (87, "다른 점 찾기 그림 맞추기", [
        '1. 준비: 비슷하지만 다른 두 그림을 나란히 테이블에 놓습니다.\n',
        '2. 시범: 보호자가 한 가지 다른 점을 찾아 가리키며 설명합니다.\n',
        '3. 기본: 아이에게 다른 점을 찾아보라고 하고 천천히 관찰하게 합니다.\n',
        '4. 반복: 찾은 점을 스티커로 표시하며 왜 다른지 설명하게 합니다.\n',
        '5. 확장: 모든 다른 점을 찾을 때까지 힌트를 주며 계속 탐색합니다.\n',
        '6. 협응: 다른 그림 쌍으로 바꾸어 아이 스스로 모두 찾게 합니다.\n',
        '7. 마무리: 난이도를 높여 더 복잡한 그림으로 3~4회 반복합니다.\n'
    ]),
    (88, "간단한 지도 보고 장소 찾기", [
        '1. 준비: 간단한 선과 도형으로 구성된 지도를 준비합니다.\n',
        '2. 시범: 지도에서 출발점과 목적지를 함께 살펴봅니다.\n',
        '3. 기본: 아이에게 "보물이 어디 있을까?" 하고 질문합니다.\n',
        '4. 반복: 방향을 말하며 손가락으로 경로를 따라가게 합니다.\n',
        '5. 확장: 실제 공간에서 지도를 들고 보물을 찾아보게 합니다.\n',
        '6. 협응: 중간 지점마다 힌트를 주며 방향 전환을 유도합니다.\n',
        '7. 마무리: 보물을 찾으면 함께 확인하고 칭찬해줍니다.\n'
    ]),
    (89, "한글 낱말 보고 같은 그림 고르기", [
        '1. 준비: 한글 낱말 카드와 그림 카드를 테이블에 펼쳐 놓습니다.\n',
        '2. 시범: 보호자가 한 낱말 카드를 읽고 맞는 그림을 찾아 짝짓습니다.\n',
        '3. 기본: 아이에게 다른 낱말 카드를 주고 천천히 읽어보게 합니다.\n',
        '4. 반복: 해당하는 그림을 찾아보게 하고 왜 그 그림인지 물어봅니다.\n',
        '5. 확장: 맞추면 칭찬하며 여러 쌍을 계속 반복하여 익힙니다.\n',
        '6. 협응: 역으로 그림을 먼저 보고 맞는 낱말 카드를 찾게 합니다.\n',
        '7. 마무리: 모든 짝을 맞춘 후 낱말을 다시 읽으며 복습합니다.\n'
    ]),
    (90, "수수께끼 듣고 정답 맞히기", [
        '1. 준비: 간단한 수수께끼 몇 개를 미리 준비합니다.\n',
        '2. 시범: 보호자가 한 수수께끼를 천천히 들려주며 단서를 강조합니다.\n',
        '3. 기본: 아이에게 "정답이 뭘까?" 질문하며 생각할 시간을 줍니다.\n',
        '4. 반복: 아이가 답을 말하면 왜 그렇게 생각했는지 이유를 물어봅니다.\n',
        '5. 확장: 정답을 함께 확인하고 수수께끼의 단서를 다시 설명합니다.\n',
        '6. 협응: 역할을 바꿔 아이가 간단한 수수께끼를 만들어보게 합니다.\n',
        '7. 마무리: 여러 수수께끼를 풀며 추리력과 언어 능력을 칭찬합니다.\n'
    ])
]

for num, title, new_lines in numbers_to_fix:
    for i in range(len(lines)):
        if f'Number {num}: {title}' in lines[i]:
            # Find the play method section
            for j in range(i, min(i+50, len(lines))):
                if lines[j].strip() == '놀이 방법:':
                    # Replace the next 7 lines
                    for k in range(7):
                        lines[j+1+k] = new_lines[k]
                    print(f"✓ Number {num}: {title} - 재구조화 완료")
                    break
            break

# Write back to file
with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("\n모든 놀이 방법이 모범 형식으로 재구조화되었습니다!")
