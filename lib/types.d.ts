import type {
	ServerResponse,
	IncomingMessage,
	OutgoingHttpHeaders,
} from 'node:http'

import type { HttpError } from './utils'

export type HttpMethods =
	| 'GET'
	| 'PUT'
	| 'HEAD'
	| 'POST'
	| 'PATCH'
	| 'DELETE'
	| 'OPTIONS'

export type RequestContext<
	ReqType extends IncomingMessage = IncomingMessage,
	ResType extends ServerResponse<ReqType> = ServerResponse<ReqType>
> = {
	/** HTTP method */
	readonly method?: string

	/** raw Request */
	readonly req: ReqType

	/** raw Response */
	readonly res: ResType

	/** request path */
	readonly path: string

	/** request query params */
	readonly query: URLSearchParams
}

export type ListenerOptions<
	ReqType extends IncomingMessage,
	ResType extends ServerResponse<ReqType>
> = {
	/** send 204 No Content for favicon.ico */
	emptyFavicon?: boolean

	/** CORS headers */
	cors?: boolean | OutgoingHttpHeaders

	/** request handler */
	handleRequest: (ctx: RequestContext<ReqType, ResType>) => Promise<unknown>

	/**
	 * error handler
	 *
	 * default: return JSON error
	 */
	handleError?: (err: HttpError | Error, ctx: RequestContext<ReqType, ResType>) => void
}
