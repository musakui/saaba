import type { IncomingMessage, ServerResponse } from 'node:http'

export type RequestListener = (
	req: IncomingMessage,
	res: ServerResponse
) => Promise<void>

export type HttpMethods =
	| 'GET'
	| 'PUT'
	| 'HEAD'
	| 'POST'
	| 'PATCH'
	| 'DELETE'
	| 'OPTIONS'

export type RouteParams = Record<string, string | undefined>

export type RequestContext = {
	method?: HttpMethods
	req: IncomingMessage
	res: ServerResponse
	path: string
	query: URLSearchParams
	params: RouteParams
}

export type RequestHandlerFn = (ctx: RequestContext) => Promise<unknown>

export type RequestHandler = null | string | RequestHandlerFn

export type Router = {
	[key: string]: Router | RequestHandler
}

export type PathMatch = {
	/** literal? */
	l: boolean
	/** match str */
	m: string
	/** handler */
	h?: RequestHandler
}

export type RouterWalker = (
	router: Router,
	parts: PathMatch[]
) => Generator<PathMatch[], void>

export type RouteMatcher = [matcher: RegExp, handler: RequestHandler]

export type ListenerOptions = {
	router: Router

	/** named handlers */
	handlers?: Record<string, RequestHandlerFn>

	/** return JSON API errors */
	jsonError?: boolean

	/** CORS headers */
	cors?: boolean | Record<string, string | number>
}
