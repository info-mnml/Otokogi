import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: '男気じゃんけん管理アプリ',
  description: 'ミニマルなデザインと本質的な機能を持つ男気じゃんけん管理ウェブアプリ',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className="h-full">
      <body className={cn(inter.className, "h-full bg-gray-50")}>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-grow container mx-auto px-4 py-6">
            {children}
          </main>
          <footer className="border-t border-gray-200 py-6">
            <div className="container mx-auto px-4 text-center text-sm text-gray-500">
              © {new Date().getFullYear()} 男気じゃんけん管理アプリ
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
