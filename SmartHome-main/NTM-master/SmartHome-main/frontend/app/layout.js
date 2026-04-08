import './globals.css';

import AuthProvider from './providers';
import { ThemeProvider } from '@/context/ThemeContext';

export const metadata = {
  title: 'NEXUS – Nhà Thông Minh',
  description: 'Hệ thống điều khiển và giám sát nhà thông minh',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
