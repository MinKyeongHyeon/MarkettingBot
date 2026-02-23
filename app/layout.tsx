import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "마케팅봇 - 채널별 광고 문구 생성",
  description: "도메인 메타정보 기반 Ollama 마케팅 문구 생성",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
