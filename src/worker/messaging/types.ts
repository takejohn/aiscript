export interface Endpoint<Req, Res = Req> {
	/**
	 * 相手が保持しているハンドラを呼び出す
	 */
	request(req: Req): Promise<Res>;
}

export type EndpointHandler<Req, Res = Req> = (req: Req) => Awaitable<Res>;

export type Awaitable<T> = T | PromiseLike<T>;
