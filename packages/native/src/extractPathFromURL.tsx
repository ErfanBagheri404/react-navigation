import escapeStringRegexp from 'escape-string-regexp';

import type { LinkingPrefix } from './types';

const WILDCARD_PREFIX_REGEX = /^(((https?:\/\/)[^/]+)|([^/]+:(\/\/)?))/;
const PROTOCOL_REGEX = /^[^:]+:/;
const MULTIPLE_SLASHES_REGEX = /\/+/g;
const LEADING_SLASH_REGEX = /^\//;

const cachedPrefixRegexes = new WeakMap<LinkingPrefix[], RegExp[]>();

const getPrefixRegexes = (prefixes: LinkingPrefix[]) => {
  const cached = cachedPrefixRegexes.get(prefixes);

  if (cached) {
    return cached;
  }

  const prefixRegexes = prefixes.map((prefix) => {
    if (prefix === '*') {
      return WILDCARD_PREFIX_REGEX;
    }

    const protocol = prefix.match(PROTOCOL_REGEX)?.[0] ?? '';
    const host = prefix
      .slice(protocol.length)
      .replace(MULTIPLE_SLASHES_REGEX, '/') // Replace multiple slash (//) with single ones
      .replace(LEADING_SLASH_REGEX, ''); // Remove extra leading slash

    return new RegExp(
      `^${escapeStringRegexp(protocol)}(/)*${host
        .split('.')
        .map((it) => (it === '*' ? '[^/?#]+' : escapeStringRegexp(it)))
        .join('\\.')}${host === '' || host.endsWith('/') ? '' : '(?=$|[/?#])'}`
    );
  });

  cachedPrefixRegexes.set(prefixes, prefixRegexes);

  return prefixRegexes;
};

export function extractPathFromURL(prefixes: LinkingPrefix[], url: string) {
  const queryIndex = url.indexOf('?');
  const originAndPath = queryIndex === -1 ? url : url.slice(0, queryIndex);
  const search = queryIndex === -1 ? '' : url.slice(queryIndex);

  for (const prefixRegex of getPrefixRegexes(prefixes)) {
    const match = prefixRegex.exec(originAndPath);

    if (match) {
      let result = originAndPath.slice(match[0].length);

      if (result.includes('//')) {
        result = result.replace(MULTIPLE_SLASHES_REGEX, '/');
      }

      result += search;

      return result.startsWith('/') ? result : `/${result}`;
    }
  }

  return undefined;
}
