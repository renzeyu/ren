import type { Metadata } from "next";
import "./globals.css";

/* eslint-disable @next/next/no-css-tags -- This public stylesheet is also the versioned contract consumed by personal sites. */

export const metadata: Metadata = {
  metadataBase: new URL("https://renzeyu.github.io/ren/"),
  title: "郭合拉庄任氏族谱",
  description: "依据任百全手稿与家人口述持续补充的郭合拉庄任氏族谱。",
  alternates: {
    canonical: "https://renzeyu.github.io/ren/",
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: "https://renzeyu.github.io/ren/",
    title: "郭合拉庄任氏族谱",
    description: "一份由家人共同补充的任氏家族记录。",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "以档案纸与族谱连线构成的郭合拉庄任氏族谱分享封面",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "郭合拉庄任氏族谱",
    description: "一份由家人共同补充的任氏家族记录。",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="stylesheet" href="/family-tree.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
