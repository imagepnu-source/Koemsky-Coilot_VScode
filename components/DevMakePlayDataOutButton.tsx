import { makePlayDataOut } from "./lib/make_play_data_out";

// 개발자용: play_data_OUT.txt 생성 버튼 (임시)
export function DevMakePlayDataOutButton() {
  const handleClick = async () => {
    const txt = await makePlayDataOut();
    // 브라우저에서 파일 다운로드
    const blob = new Blob([txt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "play_data_OUT.txt";
    a.click();
    URL.revokeObjectURL(url);
  };
  return <button onClick={handleClick} style={{position:'fixed',top:8,right:8,zIndex:9999}}>play_data_OUT.txt 생성</button>;
}
