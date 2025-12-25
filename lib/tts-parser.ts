// lib/tts-parser.ts
// TTS 스크립트 파싱 유틸리티

export type ParsedLine = {
  id: number;
  speaker: string;
  sentences: string[];
};

export type ParsedScene = {
  id: number;
  sceneNumber: number;
  title: string;
  lines: ParsedLine[];
};

export type BookSection = {
  id: number;
  title: string;
  sentences: string[];
};

/**
 * 스크립트 텍스트를 Scene 단위로 파싱
 * "Scene N: Title" 헤더와 "이름: 문장." 패턴을 인식
 */
export function parseScript(raw: string): ParsedScene[] {
  const lines = raw.split(/\r?\n/);
  const scenes: ParsedScene[] = [];
  let current: ParsedScene | null = null;
  let lineId = 1;
  let sceneBody = "";

  const flushSceneBody = () => {
    if (!current) return;
    const body = sceneBody.trim();
    if (!body) {
      sceneBody = "";
      return;
    }

    const speakerRegex = /\b([A-Za-z가-힣]+)\s*:/g;
    let match: RegExpExecArray | null;
    let lastSpeaker: string | null = null;
    let segmentStart = 0;

    while ((match = speakerRegex.exec(body)) !== null) {
      const name = (match[1] || "").trim();

      if (lastSpeaker !== null) {
        const messagePart = body.slice(segmentStart, match.index).trim();
        if (messagePart) {
          const sentenceParts = messagePart
            .split(".")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s) => (s.endsWith(".") ? s : s + "."));

          current.lines.push({
            id: lineId++,
            speaker: lastSpeaker,
            sentences: sentenceParts,
          });
        }
      }

      lastSpeaker = name;
      segmentStart = speakerRegex.lastIndex;
    }

    if (lastSpeaker !== null) {
      const messagePart = body.slice(segmentStart).trim();
      if (messagePart) {
        const sentenceParts = messagePart
          .split(".")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => (s.endsWith(".") ? s : s + "."));

        current.lines.push({
          id: lineId++,
          speaker: lastSpeaker,
          sentences: sentenceParts,
        });
      }
    }

    sceneBody = "";
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const sceneMatch = /^Scene\s+(\d+)\s*:(.*)$/i.exec(trimmed);
    if (sceneMatch) {
      flushSceneBody();

      const num = parseInt(sceneMatch[1], 10) || scenes.length + 1;
      const title = (sceneMatch[2] || "").trim();
      const scene: ParsedScene = {
        id: scenes.length + 1,
        sceneNumber: num,
        title,
        lines: [],
      };
      scenes.push(scene);
      current = scene;
      continue;
    }

    if (!current) {
      current = {
        id: scenes.length + 1,
        sceneNumber: scenes.length + 1,
        title: "",
        lines: [],
      };
      scenes.push(current);
    }

    sceneBody += (sceneBody ? " " : "") + line.trim();
  }

  flushSceneBody();
  return scenes;
}

/**
 * 책 텍스트를 Section 단위로 파싱
 * '---' 구분자로 섹션을 나눔
 */
export function parseBookText(raw: string): BookSection[] {
  const sections: BookSection[] = [];
  if (!raw.trim()) return sections;

  const parts = raw.split(/^---\s*$/m);
  for (const part of parts) {
    const block = part.trim();
    if (!block) continue;

    const sentences = block
      .split(".")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => (s.endsWith(".") ? s : s + "."));

    if (!sentences.length) continue;
    const id = sections.length + 1;
    sections.push({ id, title: `Section ${id}`, sentences });
  }

  return sections;
}
