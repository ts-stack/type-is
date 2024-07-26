/*!
 * type-is
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * Copyright(c) 2024 Kostia Tretiak
 * MIT Licensed
 */

import { IncomingHttpHeaders } from 'node:http';
import contentType from 'content-type';
import mime from 'mime-types';

/**
Checks if the `mediaType` is one of the `types`. If the `mediaType` is invalid
or does not matches any of the `types`, then `false` is returned. Otherwise, a
string of the type that matched is returned.

The `mediaType` argument is expected to be a
[media type](https://tools.ietf.org/html/rfc6838) string. The `types` argument
is an array of type strings.

Each type in the `types` array can be one of the following:

- A file extension name such as `json`. This name will be returned if matched.
- A mime type such as `application/json`.
- A mime type with a wildcard such as `* /*` or `* /json` or `application/*`.
  The full mime type will be returned if matched.
- A suffix such as `+json`. This can be combined with a wildcard such as
  `* /vnd+json` or `application/*+json`. The full mime type will be returned
  if matched.

Some examples to illustrate the inputs and returned value:

```js
var mediaType = 'application/json'

typeis.is(mediaType, ['json']) // => 'json'
typeis.is(mediaType, ['html', 'json']) // => 'json'
typeis.is(mediaType, ['application/*']) // => 'application/json'
typeis.is(mediaType, ['application/json']) // => 'application/json'

typeis.is(mediaType, ['html']) // => false
```
 */
export function is(actual?: any, ...acceptable: string[]): string | false;
export function is(actual?: any, acceptable?: string[]): string | false;
export function is(actual_?: string | null, acceptable?: string | string[]): string | false {
  // remove parameters and normalize
  const actual = tryNormalizeType(actual_);

  // no type or invalid
  if (!actual) {
    return false;
  }

  // support flattened arguments
  if (!Array.isArray(acceptable)) {
    acceptable = new Array(arguments.length - 1);
    for (let i = 0; i < acceptable.length; i++) {
      // eslint-disable-next-line prefer-rest-params
      acceptable[i] = arguments[i + 1];
    }
  }

  // no types, return the content type
  if (!acceptable || !acceptable.length) {
    return actual;
  }

  let type;
  for (let i = 0; i < acceptable.length; i++) {
    const normalized = normalize((type = acceptable[i])) ?? false;
    if (mimeMatch(normalized, actual)) {
      return type[0] === '+' || type.indexOf('*') !== -1 ? actual : type;
    }
  }

  // no matches
  return false;
}

/**
 * Returns a Boolean if the given `headers` has `transfer-encoding` or `content-length` field, regardless of the
 * `Content-Type` header.
 * 
 * Having a body has no relation to how large the body is (it may be 0 bytes).
 * This is similar to how file existence works. If a body does exist, then this
 * indicates that there is data to read from the Node.js request stream.
 * 
```ts
if (typeis.hasBody(headers)) {
  // read the body, since there is one
}
```
 * 
 * See also http://www.w3.org/Protocols/rfc2616/rfc2616-sec4.html#sec4.3
 */
export function hasBody(headers: IncomingHttpHeaders) {
  return headers['transfer-encoding'] !== undefined || !isNaN(headers['content-length'] as unknown as number);
}

/**
 * Checks if the `headers` is one of the `types`. If the headers has no `transfer-encoding` and
 * no `content-length`, regardless of the `Content-Type` header, then `null` is returned.
 * If the `Content-Type` header is invalid or does not matches any of the `types`, then
 * `false` is returned. Otherwise, a string of the type that matched is returned.
 * 
 * The `headers` argument is expected to be a Node.js HTTP headers. The `types` argument
 * is an array of type strings.
 * 
 * Each type in the `types` array can be one of the following:
 * 
 * - A file extension name such as `json`. This name will be returned if matched.
 * - A mime type such as `application/json`.
 * - A mime type with a wildcard such as `* /*` or `* /json` or `application/*`. The full mime
 * type will be returned if matched.
 * - A suffix such as `+json`. This can be combined with a wildcard such as `* /vnd+json` or `application/*+json`. The full mime type will be returned
 * if matched.
 * 
 * Some examples to illustrate the inputs and returned value:
 * 
```js
// headers.content-type = 'application/json'

typeis(headers, ['json']) // => 'json'
typeis(headers, ['html', 'json']) // => 'json'
typeis(headers, ['application/*']) // => 'application/json'
typeis(headers, ['application/json']) // => 'application/json'

typeis(headers, ['html']) // => false
```
 */
export function typeIs(headers: IncomingHttpHeaders, ...acceptable: string[]): string | false | null;
export function typeIs(headers: IncomingHttpHeaders, acceptable?: string[]): string | false | null;
export function typeIs(headers: IncomingHttpHeaders, acceptable?: string | string[]): string | false | null {
  // no body
  if (!hasBody(headers)) {
    return null;
  }

  // support flattened arguments
  if (!Array.isArray(acceptable)) {
    acceptable = new Array(arguments.length - 1);
    for (let i = 0; i < acceptable.length; i++) {
      // eslint-disable-next-line prefer-rest-params
      acceptable[i] = arguments[i + 1];
    }
  }

  // request content type
  const value = headers['content-type'];

  return is(value, acceptable);
}

/**
 * Normalize a mime type.
 * If it's a shorthand, expand it to a valid mime type.
 *
 * In general, you probably want:
```ts
const type = is(headers, ['urlencoded', 'json', 'multipart']);
```
 * Then use the appropriate body parsers.
 * These three are the most common request body types
 * and are thus ensured to work.
 */
export function normalize(type: string): string | false | null {
  if (typeof type !== 'string') {
    // invalid type
    return false;
  }

  switch (type) {
    case 'urlencoded':
      return 'application/x-www-form-urlencoded';
    case 'multipart':
      return 'multipart/*';
  }

  if (type[0] === '+') {
    // "+json" -> "*/*+json" expando
    return '*/*' + type;
  }

  return type.indexOf('/') === -1 ? mime.lookup(type) : type;
}

/**
Match the type string `expected` with `actual`, taking in to account wildcards.
A wildcard can only be in the type of the subtype part of a media type and only
in the `expected` value (as `actual` should be the real media type to match). A
suffix can still be included even with a wildcard subtype. If an input is
malformed, `false` will be returned.

```js
mimeMatch('text/html', 'text/html') // => true
mimeMatch('* /html', 'text/html') // => true
mimeMatch('text/*', 'text/html') // => true
mimeMatch('* /*', 'text/html') // => true
mimeMatch('* /*+json', 'application/x-custom+json') // => true
```
 */
export function mimeMatch(expected: string | false, actual: string): boolean {
  // invalid type
  if (expected === false) {
    return false;
  }

  // split types
  const actualParts = actual.split('/');
  const expectedParts = expected.split('/');

  // invalid format
  if (actualParts.length !== 2 || expectedParts.length !== 2) {
    return false;
  }

  // validate type
  if (expectedParts[0] !== '*' && expectedParts[0] !== actualParts[0]) {
    return false;
  }

  // validate suffix wildcard
  if (expectedParts[1].slice(0, 2) === '*+') {
    return (
      expectedParts[1].length <= actualParts[1].length + 1 &&
      expectedParts[1].slice(1) === actualParts[1].slice(1 - expectedParts[1].length)
    );
  }

  // validate subtype
  if (expectedParts[1] !== '*' && expectedParts[1] !== actualParts[1]) {
    return false;
  }

  return true;
}

/**
Normalize a `type` string. This works by performing the following:

- If the `type` is not a string, `false` is returned.
- If the string starts with `+` (so it is a `+suffix` shorthand like `+json`),
  then it is expanded to contain the complete wildcard notation of `* /*+suffix`.
  - If the string contains a `/`, then it is returned as the type.
  - Else the string is assumed to be a file extension and the mapped media type is
    returned, or `false` is there is no mapping.
  
  This includes two special mappings:
  
  - `'multipart'` -> `'multipart/*'`
  - `'urlencoded'` -> `'application/x-www-form-urlencoded'`
 */
function normalizeType(value: string): string {
  // parse the type
  const type = contentType.parse(value);

  // remove the parameters
  type.parameters = {};

  // reformat it
  return contentType.format(type);
}

/**
 * Try to normalize a type and remove parameters.
 */
function tryNormalizeType(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    return normalizeType(value);
  } catch (err) {
    return null;
  }
}
