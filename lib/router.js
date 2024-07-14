// @ts-check

/** @type {import('./types').RouterWalker} */
export function* walkRouter(router, parts) {
	for (const [k, h] of Object.entries(router)) {
		const [l, m] =
			k[0] === ':' ? [!1, `(?<${k.slice(1)}>[^/]+)`] : [k[0] !== '(', k]

		if (h === null || typeof h === 'string' || typeof h === 'function') {
			const last = parts.at(-1)
			if (m === '' && last) {
				last.h = h
				yield parts
			} else {
				yield [...parts, { l, m, h }]
			}
			continue
		}
		yield* walkRouter(h, [...parts, { l, m }])
	}
}

/**
 * create route matchers from a router config
 *
 * @param {import('./types').Router} router
 */
export function createMatcher(router) {
	/** @type {Map<string, import('./types').RequestHandler>} */
	const literals = new Map()

	/** @type {import('./types').RouteMatcher[]} */
	const matchers = []

	for (const matcher of walkRouter(router, [])) {
		const h = matcher.at(-1)?.h
		if (!h && h !== null) continue
		const exp = matcher.map((m) => m.m).join('/')
		if (matcher.every((m) => m.l)) {
			literals.set(exp, h)
			continue
		}
		matchers.push([new RegExp(`^${exp}$`), h])
	}

	matchers.sort((a, b) => a[0].source.length - b[0].source.length)

	/** @param {string} path */
	return (path) => {
		const lit = literals.get(path)
		if (lit || lit === null) return { h: lit, params: {} }
		for (const [reg, h] of matchers) {
			const m = reg.exec(path)
			if (!m) continue
			return {
				h,
				params: /** @type {import('./types').RouteParams} */ ({ ...m.groups }),
			}
		}
		return null
	}
}

/**
 * create a generic request handler
 *
 * @param {Record<string, import('./types').RequestHandlerFn>} [handlers]
 */
export function createHandler(handlers) {
	const namedHandlers = new Map(Object.entries({ ...handlers }))

	/**
	 * @param {import('./types').RequestContext & { h: import('./types').RequestHandler }} ctx
	 */
	return async (ctx) => {
		if (ctx.h === null) return null
		const { h, ...c } = ctx
		if (typeof h === 'string') {
			const fn = namedHandlers.get(h)
			if (!fn) throw new Error(`no such handler: ${h}`)
			return await fn(c)
		}
		return await h(c)
	}
}
