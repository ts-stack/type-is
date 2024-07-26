# @ts-stack/type-is

Infer the content-type of a headers.

## Install

```sh
npm install @ts-stack/type-is
```

## Usage

```ts
import http from 'http';
import { typeIs } from '@ts-stack/type-is';

http.createServer(function (req, res) {
  const istext = typeIs(req.headers, ['text/*'])
  res.end('you ' + (istext ? 'sent' : 'did not send') + ' me text')
})
```

## License

[MIT](LICENSE)
