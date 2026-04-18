export const metadata = {
  title: 'Japan CPI Dashboard',
  description: 'Japan CPI auto-updating dashboard powered by e-Stat',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
