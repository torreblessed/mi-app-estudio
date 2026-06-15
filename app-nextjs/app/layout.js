import { Geist, Geist_Mono, Source_Serif_4 } from 'next/font/google'
import './globals.css'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
})

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-source-serif',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

export const metadata = {
  title: 'Mi app de estudio',
  description: 'Organiza tus notas y estudia con inteligencia artificial.',
}

export default function RootLayout({ children }) {
  return (
    <html
      lang="es"
      className={`${geist.variable} ${sourceSerif.variable} ${geistMono.variable}`}
    >
      <body>{children}</body>
    </html>
  )
}
