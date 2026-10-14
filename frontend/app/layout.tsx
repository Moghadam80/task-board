import type { Metadata } from 'next';
import { Vazirmatn } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const vazir = Vazirmatn({ variable: '--font-vazir', subsets: ['arabic', 'latin'] });

export const metadata: Metadata = {
  title: 'کاربان | مدیریت وظایف تیم',
  description: 'برد مدیریت وظایف تیمی با دسترسی مبتنی بر نقش',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" className={vazir.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
