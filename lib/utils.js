export const CONTENT_TYPE = 'content-type'
export const APP_JSON = 'application/json'

export const HAS_BODY = new Set(['PUT', 'POST', 'PATCH', 'DELETE'])
export const HTTP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', ...HAS_BODY])

export const CORS_DEFAULT = {
	'Access-Control-Max-Age': 86400,
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'Content-Type',
	'Access-Control-Allow-Methods': [...HTTP_METHODS].join(','),
}

/**
 * @param {boolean | Record<string, string | number>} [opt]
 */
export const getCORS = (opt) => {
	if (opt === false) return null
	return {
		...CORS_DEFAULT,
		...(opt === true ? null : opt),
	}
}

/**
 * util method for defining router
 *
 * @param {import('./types').Router} router
 */
export function defineRouter(router) {
	return router
}

/**
 * util method for defining request handler
 *
 * @param {import('./types').RequestHandlerFn} fn
 */
export function defineHandler(fn) {
	return fn
}

/**
 * process request body
 *
 * @template T
 * @param {import('node:http').IncomingMessage} req
 * @param {(s: string) => T} fn
 */
export async function processBody(req, fn) {
	try {
		let body = ''
		for await (const chunk of req) {
			body += chunk
		}
		return fn(body)
	} catch (err) {
		throw new BadRequestError(400, `Bad Request: ${err}`)
	}
}

/**
 * parse JSON from request body
 *
 * @template T
 * @param {import('./types').RequestContext} ctx
 * @return {Promise<T | null>}
 */
export async function parseJSON(ctx) {
	if (ctx.req.headers[CONTENT_TYPE] !== APP_JSON) return null
	return await processBody(ctx.req, (s) => (s ? JSON.parse(s) : null))
}

export class BadRequestError extends Error {
	statusCode = 0

	constructor(code = 400, message = 'Bad request') {
		super(message)
		this.statusCode = code
	}
}

export class NotFoundError extends BadRequestError {
	constructor(msg = 'Not found') {
		super(404, msg)
	}
}

export class NotAllowedError extends BadRequestError {
	constructor(msg = 'Method not allowed') {
		super(405, msg)
	}
}
