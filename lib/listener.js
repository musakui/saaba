import {
	getCORS,
	errorJSON,
	HttpError,
	JSON_HEAD,
} from './utils.js'

/** @import { IncomingMessage, ServerResponse } from 'node:http' */
/** @import { ListenerOptions } from './types' */

/**
 * create a request listener for a server
 *
 * @template {IncomingMessage} [ReqType=IncomingMessage]
 * @template {ServerResponse<ReqType>} [ResType=ServerResponse<ReqType>]
 * @param {ListenerOptions<ReqType, ResType>} opts
 */
export function createListener(opts) {
	if (!(opts?.handleRequest instanceof Function)) {
		throw new Error('handleRequest must be a function')
	}

	const corsHeaders = getCORS(opts.cors)
	const emptyFavicon = !!opts.emptyFavicon
	const handleRequest = opts.handleRequest
	const handleError = opts.handleError ?? errorJSON

	/**
	 * @param {ReqType} req
	 * @param {ResType} res
	 * @return {Promise<void>}
	 */
	return async (req, res) => {
		const url = new URL(`ws://_${req.url}`)
		const path = url.pathname
		const method = req.method?.toUpperCase()

		if (corsHeaders) {
			if (method === 'OPTIONS') {
				res.writeHead(204, corsHeaders).end()
				return
			}
			for (const [k, v] of Object.entries(corsHeaders)) {
				if (v) res.setHeader(k, v)
			}
		}

		if (emptyFavicon && path === '/favicon.ico') {
			res.writeHead(204, corsHeaders ?? undefined).end()
			return
		}

		const ctx = {
			req,
			res,
			method,
			path,
			query: url.searchParams,
		}

		try {
			const ret = await handleRequest(ctx)

			if (res.writableEnded) return

			if (typeof ret === 'string' || ret instanceof Uint8Array) {
				res.writeHead(200).end(ret)
			} else if (ret) {
				res
					.writeHead(200, JSON_HEAD)
					.end(JSON.stringify(ret))
			} else {
				res.writeHead(204).end()
			}
		} catch (err) {
			if (res.writableEnded) return
			handleError(/** @type {HttpError} */ (err), ctx)
		}
	}
}
