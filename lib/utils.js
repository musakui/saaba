import { json } from 'node:stream/consumers'

/** @import { OutgoingHttpHeaders } from 'node:http' */
/** @import { RequestContext } from './types' */

export const CONTENT_TYPE = 'content-type'
export const APP_JSON = 'application/json'
export const JSON_HEAD = { [CONTENT_TYPE]: APP_JSON }

export const HAS_BODY = new Set(['PUT', 'POST', 'PATCH', 'DELETE'])
export const HTTP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', ...HAS_BODY])

export const CORS_DEFAULT = {
	'access-control-max-age': 86400,
	'access-control-allow-origin': '*',
	'access-control-allow-headers': 'Content-Type',
	'access-control-allow-methods': [...HTTP_METHODS].join(','),
}

/**
 * @param {boolean | OutgoingHttpHeaders} [opt]
 */
export const getCORS = (opt) => {
	if (opt === false) return null
	return /** @type {OutgoingHttpHeaders} */ ({
		...CORS_DEFAULT,
		...(opt === true ? null : opt),
	})
}

/**
 * get request body as JSON
 *
 * @template T
 * @param {RequestContext} ctx
 */
export async function getJSON(ctx) {
	if (!ctx.method || !HAS_BODY.has(ctx.method)) return null
	if (ctx.req.headers[CONTENT_TYPE] !== APP_JSON) return null
	try {
		return /** @type {T} */ (await json(ctx.req))
	} catch (err) {
		throw new HttpError('invalid JSON', { cause: err })
	}
}

/**
 * Send error as JSON
 *
 * @param {HttpError} err
 * @param {RequestContext} ctx
 */
export function errorJSON(err, ctx) {
	const code = err.statusCode || 500
	const text = err.statusText || 'Server Error'
	ctx.res
		.writeHead(code, text, JSON_HEAD)
		.end(JSON.stringify({ status: 'error', code, message: `${err}` }))
}

/**
 * represents a generic HTTP error
 */
export class HttpError extends Error {
	/** HTTP status code */
	statusCode = 0

	/** HTTP status text */
	statusText = 'Error'

	/** @param {ErrorOptions} [opts] */
	constructor(message = '', opts) {
		super(message, opts)
		if (!this.message) this.message = this.statusText
	}
}

/** 400 Bad Request */
export class BadRequestError extends HttpError {
	statusCode = 400
	statusText = 'Bad Request'
}

/** 403 Forbidden */
export class ForbiddenError extends HttpError {
	statusCode = 403
	statusText = 'Forbidden'
}

/** 404 Not Found */
export class NotFoundError extends HttpError {
	statusCode = 404
	statusText = 'Not Found'
}

/** 405 Method Not Allowed */
export class NotAllowedError extends HttpError {
	statusCode = 405
	statusText = 'Method Not Allowed'
}
