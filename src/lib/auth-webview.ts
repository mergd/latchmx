import { looksLikeAuthorizationCode } from '@/lib/bmx-api';

export type AuthWebViewPage = 'login' | 'code' | 'other';

export type AuthWebViewMessage =
  | { type: 'code'; value: string }
  | { type: 'page'; value: AuthWebViewPage };

const CODE_IN_TITLE = /(?:success(?:\s+code)?|authorization\s+code|code)[=:\s]+(\S+)/i;

export function looksLikeAuthCode(value: string): boolean {
  return looksLikeAuthorizationCode(value);
}

export function authorizationCodeFromPageTitle(title: string): string | null {
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const labeled = CODE_IN_TITLE.exec(trimmed);
  const candidate = labeled?.[1] ?? trimmed;
  return looksLikeAuthCode(candidate) ? candidate : null;
}

export function parseAuthWebViewMessage(raw: string): AuthWebViewMessage | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    const record = parsed as { type?: unknown; value?: unknown };
    if (typeof record.value !== 'string' || record.value.length === 0) {
      return null;
    }
    if (record.type === 'code') {
      return looksLikeAuthCode(record.value)
        ? { type: 'code', value: record.value }
        : null;
    }
    if (record.type === 'page') {
      switch (record.value) {
        case 'login':
        case 'code':
        case 'other':
          return { type: 'page', value: record.value };
        default:
          return null;
      }
    }
    return null;
  } catch {
    return looksLikeAuthCode(raw) ? { type: 'code', value: raw.trim() } : null;
  }
}

export const AUTH_CODE_WATCH_SCRIPT = `
(function () {
  var posted = '';
  function send(type, value) {
    if (!window.ReactNativeWebView) {
      return;
    }
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, value: value }));
  }
  function looksLike(value) {
    return value.length >= 16 && value.length <= 256 && /^[A-Za-z0-9._~+/=-]+$/.test(value);
  }
  function fromTitle() {
    var title = (document.title || '').trim();
    var match = title.match(/(?:success(?:\\s+code)?|authorization\\s+code|code)[=:\\s]+(\\S+)/i);
    var candidate = match && match[1] ? match[1] : title;
    return looksLike(candidate) ? candidate : '';
  }
  function fromNode() {
    var node = document.getElementById('authorization_code');
    if (node) {
      var text = (node.value || node.textContent || '').trim();
      if (looksLike(text)) {
        return text;
      }
    }
    var labeled = document.querySelector('input[name="code"], textarea[name="code"], [data-authorization-code]');
    if (labeled) {
      var next = (labeled.value || labeled.textContent || '').trim();
      if (looksLike(next)) {
        return next;
      }
    }
    return '';
  }
  function fromBody() {
    var body = (document.body && document.body.innerText) || '';
    var match = body.match(/authorization code[:\\s]+([A-Za-z0-9._~+/=-]{16,256})/i);
    return match && match[1] ? match[1] : '';
  }
  function pageKind() {
    if (fromTitle() || fromNode() || /authorization code/i.test((document.body && document.body.innerText) || '') || /authorization code/i.test(document.title || '')) {
      return 'code';
    }
    if (document.querySelector('input[type="password"], input[name="password"]')) {
      return 'login';
    }
    return 'other';
  }
  function tick() {
    send('page', pageKind());
    var code = fromTitle() || fromNode() || fromBody();
    if (!code || code === posted) {
      return false;
    }
    posted = code;
    send('code', code);
    return true;
  }
  if (tick()) {
    return true;
  }
  var observer = new MutationObserver(function () {
    if (tick()) {
      observer.disconnect();
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  setTimeout(function () { observer.disconnect(); }, 45000);
  return true;
})();
true;
`;
