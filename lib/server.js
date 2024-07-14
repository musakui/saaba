import { createServer } from 'node:http'

import { createHandler, createMatcher } from './router.js'

import {
	//
	CONTENT_TYPE,
	APP_JSON,
	getCORS,
	NotFoundError,
} from './utils.js'

/**
 * create a request listener for a server
 *
 * @param {import('./types').ListenerOptions} opts
 */
export function createListener(opts) {
	const corsHeaders = getCORS(opts.cors)
	const matchRoute = createMatcher(opts.router)
	const handler = createHandler(opts.handlers)

	/** @type {import('./types').RequestListener} */
	return async (req, res) => {
		try {
			const url = new URL(`ws://_${req.url}`)
			const route = matchRoute(url.pathname.slice(1))
			if (!route) throw new NotFoundError()

			const method = /** @type {import('./types').HttpMethods | undefined} */ (
				req.method?.toUpperCase()
			)

			if (corsHeaders) {
				if (method === 'OPTIONS') {
					res.writeHead(204, corsHeaders).end()
					return
				}
				for (const [k, v] of Object.entries(corsHeaders)) {
					res.setHeader(k, v)
				}
			}

			const ret = await handler({
				req,
				res,
				method,
				path: url.pathname,
				query: url.searchParams,
				...route,
			})

			if (res.writableEnded) return

			if (ret) {
				if (typeof ret === 'string' || ret instanceof Uint8Array) {
					res.writeHead(200).end(ret)
				} else {
					res
						.writeHead(200, { [CONTENT_TYPE]: APP_JSON })
						.end(JSON.stringify(ret))
				}
			} else {
				res.writeHead(204).end()
			}
		} catch (err) {
			const code = err.statusCode ?? 500
			const message = `${err}`
			if (!opts.jsonError) {
				res.writeHead(code).end(message)
				return
			}
			res
				.writeHead(code, { [CONTENT_TYPE]: APP_JSON })
				.end(JSON.stringify({ status: 'error', code, message }))
		}
	}
}

/**
 * create a server and listen on port
 *
 * @param {number} port
 * @param {import('./types').RequestListener} listener
 */
export async function create(port, listener, host = '0.0.0.0') {
	const server = createServer(listener)

	await new Promise((resolve, reject) => {
		server.on('error', (err) => reject(err))
		server.listen(port, host, () => resolve(0))
	})

	process.on('SIGINT', () => {
		server.close()
		process.exit()
	})

	return server
}
