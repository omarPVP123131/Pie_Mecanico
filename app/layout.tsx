import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { StoredParamsProvider } from "@/context/StoredParamsContext";
import { defaultParams } from "@/lib/defaultParams"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Simulador 3D - Pierna Mecánica Completa",
  description: "Simulador interactivo de pierna mecánica completa con ecuaciones matemáticas paramétricas avanzadas",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      
      <body className="font-sans antialiased">
          <StoredParamsProvider defaults={defaultParams}>

        {children}
        <Analytics />
          </StoredParamsProvider>

      </body>
    </html>
  )
}
