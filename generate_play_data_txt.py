"""
play_data_extracted.json에서 제목들을 추출하여 play_data.txt 형식으로 변환
"""

import json

def main():
    # JSON 파일 읽기
    with open('public/play_data_extracted.json', 'r', encoding='utf-8') as f:
        activities = json.load(f)
    
    # 카테고리별로 그룹화
    categories = {}
    for activity in activities:
        cat = activity['category']
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(activity)
    
    # 카테고리 이름 매핑 (영어 -> 한글, 영어)
    category_names = {
        'gross-motor': ('대근육', 'gross-motor'),
        'fine-motor': ('소근육', 'fine-motor'),
        'problem-solving': ('문제해결', 'problem-solving'),
        'social-emotion': ('사회정서', 'social-emotion'),
        'receptive-language': ('수용언어', 'receptive-language'),
        'expressive-language': ('표현언어', 'expressive-language'),
        'self-care': ('자조', 'self-care')
    }
    
    # 출력 생성
    output_lines = []
    
    for cat_key in ['gross-motor', 'fine-motor', 'problem-solving', 'social-emotion', 
                    'receptive-language', 'expressive-language', 'self-care']:
        if cat_key not in categories:
            continue
        
        cat_ko, cat_en = category_names[cat_key]
        output_lines.append(f"{cat_ko}, {cat_en}")
        output_lines.append("Number\tKorean Title\tAge Range")
        
        # 번호 순으로 정렬
        cat_activities = sorted(categories[cat_key], key=lambda x: x['number'])
        
        for activity in cat_activities:
            number = activity['number']
            title = activity['title']
            age_start = activity['ageRange'][0]
            age_end = activity['ageRange'][1]
            
            # 정수면 소수점 제거
            if age_start == int(age_start):
                age_start = int(age_start)
            if age_end == int(age_end):
                age_end = int(age_end)
            
            age_range = f"{age_start}-{age_end}"
            
            output_lines.append(f"{number}\t{title}\t{age_range}")
        
        output_lines.append("")  # 카테고리 사이 빈 줄
    
    # 파일 쓰기
    output_path = 'public/play_data_extracted.txt'
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(output_lines))
    
    print(f"✅ 완료!")
    print(f"총 {len(activities)}개 활동 제목 추출")
    print(f"저장 위치: {output_path}")
    
    # 카테고리별 통계
    print("\n📊 카테고리별 활동 수:")
    for cat_key in ['gross-motor', 'fine-motor', 'problem-solving', 'social-emotion',
                    'receptive-language', 'expressive-language', 'self-care']:
        if cat_key in categories:
            cat_ko, _ = category_names[cat_key]
            print(f"  {cat_ko} ({cat_key}): {len(categories[cat_key])}개")

if __name__ == '__main__':
    main()
