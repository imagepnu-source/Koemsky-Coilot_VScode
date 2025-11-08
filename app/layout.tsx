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
  return (
    <html lang="ko" className="your-root-classes">
      <body>{children}</body>
    </html>
  );
}
