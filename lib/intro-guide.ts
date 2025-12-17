// lib/intro-guide.ts
// Simple parser for public/Intro.txt to multi-page intro guide

export type IntroPage = {
  title: string
  bodyLines: string[]
}

/**
 * Intro.txt 전용 파서
 *
 * 지원하는 규칙 (Intro.txt 상단 주석과 동일):
 * - // 로 시작하는 줄은 주석 → 무시
 * - 'Page 1' 같은 페이지 번호 표시는 무시
 * - '---' 단독 줄 → 새 페이지로 구분
 * - '#1 ' → 새 페이지의 Level 1 제목 (title)
 * - '#2 ' → 현재 페이지의 Level 2 제목 (본문에 헤더로 포함)
 * - '#CRLF' → 한 줄 공백 추가(문단 구분)
 * - '#if ...' → 실행 조건 설명이므로 화면에는 표시하지 않음
 * - '# ' 로 시작하는 나머지 줄 → '#' 은 제거하고 일반 본문으로 취급
 * - 그 외 줄은 일반 본문, 빈 줄은 문단 구분
 */
export function parseIntroText(text: string): IntroPage[] {
  const pages: IntroPage[] = []
  let current: IntroPage | null = null
  // 멀티라인 #if 블록용 현재 조건 키 (예: hasChild)
  let activeCondKey: string | null = null

  const flush = () => {
    if (current && (current.title.trim() !== "" || current.bodyLines.some(l => l.trim() !== ""))) {
      pages.push(current)
    }
    current = null
  }

  const lines = text.split(/\r?\n/)
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "") // trim right only
    const trimmed = line.trim()

    // 멀티라인 #if 블록 안에 있는 동안의 처리
    if (activeCondKey) {
      // 빈 줄을 만나면 블록 종료 (문단 구분은 유지)
      if (!trimmed) {
        if (current) current.bodyLines.push("")
        activeCondKey = null
        continue
      }

      // 새로운 제어 지시어나 페이지 구분선을 만나도 블록 종료 후, 해당 줄은 아래 공통 처리
      if (trimmed.startsWith("//") || /^Page\s+\d+/i.test(trimmed) || trimmed === "---" || trimmed.startsWith("#")) {
        activeCondKey = null
        // fall-through: 아래 공통 로직에서 다시 처리
      } else {
        if (!current) current = { title: "", bodyLines: [] }
        current.bodyLines.push(`__IF__${activeCondKey}__::${line}`)
        continue
      }
    }

    if (!trimmed) {
      // keep explicit blank lines as paragraph separators
      if (current) current.bodyLines.push("")
      continue
    }

    // 1) 전체 주석/페이지 번호
    if (trimmed.startsWith("//")) {
      continue
    }
    if (/^Page\s+\d+/i.test(trimmed)) {
      continue
    }

    // 2) 페이지 구분선
    if (trimmed === "---") {
      flush()
      continue
    }

    // 3) 조건(#if ...)은 화면에 직접 표시하지 않고,
    //    조건/내용을 파싱해 특수 마커로 bodyLines 에 저장
    if (/^#if\b/.test(trimmed)) {
      // 형태: #if (조건) then (내용)  // 주석...
      // - 한 줄짜리와 멀티라인 두 가지를 모두 지원합니다.
      const mFull = line.match(/^#if\s*\(([^)]*)\)\s*then\s*\((.*)\)\s*(?:\/\/.*)?$/)
      const mStart = !mFull ? line.match(/^#if\s*\(([^)]*)\)\s*then\s*\(\s*(?:\/\/.*)?$/) : null
      if (!mFull && !mStart) {
        continue
      }
      const condRaw = (mFull ?? mStart)![1].trim()

      let condKey: string | null = null
      // id 유무 조건
      if (/등록된\s*id\s*가\s*없으면/.test(condRaw)) {
        condKey = "noId"
      } else if (/등록된\s*id가\s*있으면/.test(condRaw)) {
        condKey = "hasId"
      }
      // 아이 유무 조건 (문구가 조금 달라도 "아이"와 "없으면/1명 이상 있으면" 포함 여부로 판단)
      else if (/아이.*없으면/.test(condRaw)) {
        condKey = "noChild"
      } else if (/아이.*1명 이상 있으면/.test(condRaw)) {
        condKey = "hasChild"
      }

      if (!condKey) {
        continue
      }

      // 멀티라인 #if: 다음 줄들에 대해 activeCondKey 로 처리
      if (mStart && !mFull) {
        activeCondKey = condKey
        if (!current) {
          current = { title: "", bodyLines: [] }
        }
        continue
      }

      if (!current) {
        current = { title: "", bodyLines: [] }
      }

      // 한 줄짜리 #if: 내용 안에 #CRLF 토큰이 포함될 수 있으므로,
      // 이를 기준으로 여러 줄로 나누어 같은 조건으로 저장합니다.
      let contentRaw = mFull![2]
      contentRaw = contentRaw.replace(/\s*\/\/.*$/, "")

      const segments = contentRaw.split(/#CRLF/g)
      for (const seg of segments) {
        // 공백만 있는 조각은 건너뜀
        if (!seg || seg.replace(/\s/g, "") === "") continue
        current.bodyLines.push(`__IF__${condKey}__::${seg}`)
      }
      continue
    }

    // 4) 특수 토큰 처리
    if (trimmed === "#CRLF") {
      if (current) current.bodyLines.push("")
      continue
    }

    if (/^#1\s+/.test(trimmed)) {
      // 새 페이지 + 레벨1 제목
      const titleText = trimmed.replace(/^#1\s+/, "").trim()
      flush()
      current = { title: titleText, bodyLines: [] }
      continue
    }

    if (/^#2\s+/.test(trimmed)) {
      // 현재 페이지의 레벨2 제목: 본문에 특별 마커로 추가
      if (!current) {
        current = { title: "", bodyLines: [] }
      }
      const h2 = trimmed.replace(/^#2\s+/, "").trim()
      current.bodyLines.push("__H2__" + h2)
      continue
    }

    // 5) '# ' 로 시작하는 일반 본문 줄 (앞의 '#' 제거)
    if (/^#\s+/.test(trimmed)) {
      if (!current) current = { title: "", bodyLines: [] }
      const content = trimmed.replace(/^#\s+/, "").trimStart()
      current.bodyLines.push(content)
      continue
    }

    if (trimmed === "CRLF") {
      // 잘못 들어간 CRLF) 같은 줄은 무시
      continue
    }

    // 6) 일반 본문 줄
    if (!current) {
      current = { title: "", bodyLines: [] }
    }
    current.bodyLines.push(line)
  }

  flush()
  return pages
}
