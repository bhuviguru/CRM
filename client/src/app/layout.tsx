import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/AuthContext"
import { Toaster } from "react-hot-toast"
import { AuthGuard } from "@/components/auth-guard"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SahayakCRM | Intelligent Customer Retention",
  description: "Advanced AI-powered CRM for enterprise customer retention and churn analysis.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          <AuthGuard>
            {children}
          </AuthGuard>
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  )
}
