# saaba

> a smol node server utility

**Warning** this is still experimental and APIs are expected to change a lot

## Usage

```js
import { create, createListener } from '@musakui/saaba'

const listener = createListener({
	router: {
		// '' is the root
		'': () => 'hello world',
		// null for 204 No Content
		'favicon.ico': null,
		// nested router
		foo: {
			// return object for json
			'': () => ({ status: 'ok' }),
			// path param (similar to `/foo/:id`)
			':id': async (ctx) => {
				// ctx.params contains url params
				const data = await getData(ctx.params.id, ctx.req.url)
				// ctx.req and ctx.res are the raw objects from the server
				ctx.res.writeHead(200, { 'x-custom-header': 'custom' }).end(data)
			},
			// named route (see handlers below)
			'named-route': 'namedHandler',
		},
		// regex groups will be on params
		'(?<num>\\d+)': (ctx) => ctx.params.num,
	},
	// named handlers
	handlers: {
		namedHandler: (ctx) => {
			const search = ctx.query.get('q') // URLSearchParams
			return { search }
		},
	},
	jsonError: true, // return JSON errors
})

create(8000, listener).then(() => console.log('server started'))
```
