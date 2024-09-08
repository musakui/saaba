# saaba

> a smol node server utility

[![npm](https://img.shields.io/npm/v/@musakui/saaba.svg)](https://www.npmjs.com/package/@musakui/saaba)

**Warning** this is still experimental and APIs are expected to change a lot

## Usage

```js
import { createServer } from 'node:http'
import {
	createListener,
	getJSON,
	NotFoundError,
	NotAllowedError,
} from '@musakui/saaba'

const listener = createListener({
	cors: true,
	emptyFavicon: true,
	handleRequest: async (ctx) => {
		if (ctx.path === '/') {
			if (ctx.method === 'GET') return { status: 'ok' }

			if (ctx.method === 'POST') {
				const data = await getJSON(ctx)
				return { status: 'ok', data }
			}

			throw new NotAllowedError()
		}

		if (ctx.path === '/demo') {
			if (ctx.method !== 'GET') throw new NotAllowedError()

			// query as URLSearchParams
			const name = ctx.query.get('name') || 'no name'

			// manually set header
			ctx.res.setHeader('content-type', 'text/html')

			return `<html><title>demo</title><body>hi, ${name}</body></html>`
		}

		throw new NotFoundError()
	},
})

createServer(8000, listener).then(() => console.log('server started'))
```
