    "use client"
    import { useEffect } from "react"

    export default function HideDocScrollbar() {
      useEffect(() => {
        const id = "__docScrollMask"
        if (!document.getElementById(id)) {
          const style = document.createElement("style")
          style.id = id
          style.textContent = `
:root.no-doc-scrollbar, :root.no-doc-scrollbar body {
  scrollbar-width: none !important;
}
:root.no-doc-scrollbar::-webkit-scrollbar,
:root.no-doc-scrollbar body::-webkit-scrollbar {
  display: none !important;
}
          `.trim()
          document.head.appendChild(style)
        }
        document.documentElement.classList.add("no-doc-scrollbar")
        return () => {
          document.documentElement.classList.remove("no-doc-scrollbar")
        }
      }, [])
      return null
    }
