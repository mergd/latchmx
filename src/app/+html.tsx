import { type ReactNode } from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';

import { APP_NAME } from '@/lib/title';

const ogTitle = APP_NAME;
const ogDescription = 'Personal building access.';
const ogImage = 'https://bmx.fldr.zip/brand/og.png';
const ogImageAlt = `${APP_NAME} mark on a cream field.`;
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
        <title>{ogTitle}</title>
        <meta name="description" content={ogDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:alt" content={ogImageAlt} />
        <meta property="og:url" content={ogUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={ogDescription} />
        <meta name="twitter:image" content={ogImage} />
        <meta name="twitter:image:alt" content={ogImageAlt} />
        <ScrollViewStyleReset />
      </head>
      <body style={{ backgroundColor: '#0E0E0D' }}>{children}</body>
    </html>
  );
}
