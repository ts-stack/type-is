# @ts-stack/type-is

Infer the content-type of a request by headers. This is a fork of [type-is](https://github.com/jshttp/type-is), but this one accepts headers instead of a request object. Writen in TypeScript in format ESM.

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
