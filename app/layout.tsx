
/* app/layout.tsx */
import "./globals.css"
import React from "react"

// If your project already has a UIDesignProvider, use it.
// We soft-import to avoid breaking builds if the provider file is in a different path.
let UIDesignProvider: React.ComponentType<{ children: React.ReactNode }> | null = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  UIDesignProvider = require("@/context/UIDesignContext").UIDesignProvider
} catch (_) {
  UIDesignProvider = null
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const content = (
    <html lang="ko">
      <head>
        {/* PWA / 홈 화면 아이콘 설정 */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#0ea5e9" />
        {/* iOS 전체 화면 & 아이콘 */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Komensky" />
        <link rel="apple-touch-icon" href="/placeholder-logo.png" />
      </head>
      <body>{children}</body>
    </html>
  )

  if (UIDesignProvider) {
    const Provider = UIDesignProvider
    return (
      <html lang="ko">
        <head>
          <link rel="manifest" href="/manifest.webmanifest" />
          <meta name="theme-color" content="#0ea5e9" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content="Komensky" />
          <link rel="apple-touch-icon" href="/placeholder-logo.png" />
        </head>
        <body>
          <Provider>{children}</Provider>
        </body>
      </html>
    )
  }
  return content
}
