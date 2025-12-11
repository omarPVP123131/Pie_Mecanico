import type React from "react"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { StoredParamsProvider } from "@/context/StoredParamsContext";
import { defaultParams } from "@/lib/defaultParams"
import { Analytics } from "@vercel/analytics/next"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata = {
  title: "Simulador 3D - Pierna Mecánica Completa",
  description: "Simulador interactivo de pierna mecánica completa con ecuaciones matemáticas paramétricas avanzadas",
  generator: "v1",
  authors: [{ name: "Omar Palomares Velasco", url: "https://github.com/omarPVP123131" }],

  icons: {
    icon: [
      {
        url: "https://iconape.com/wp-content/png_logo_vector/cecytem-logo.png",
      },
    ],
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
