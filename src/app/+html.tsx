import { type ReactNode } from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';

const ogTitle = 'Latch';
const ogDescription = 'Personal building access.';
const ogImage = 'https://bmx.fldr.zip/brand/login-visual.png';
const ogUrl = 'https://bmx.fldr.zip/';

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <meta name="description" content={ogDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:url" content={ogUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={ogDescription} />
        <meta name="twitter:image" content={ogImage} />
        <ScrollViewStyleReset />
      </head>
      <body style={{ backgroundColor: '#07101F' }}>{children}</body>
    </html>
  );
}
