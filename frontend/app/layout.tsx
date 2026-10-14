import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { iranyekan } from './models/fonts';


export const metadata: Metadata = {
  title: 'کاربان | مدیریت وظایف تیم',
  description: 'برد مدیریت وظایف تیمی با دسترسی مبتنی بر نقش',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {

  return (
    <html lang="fa" dir="rtl" className={iranyekan.className}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
