import type { Ast } from '../index.js';

export type CallInfo = {
	name: string;
	pos: Ast.Pos | undefined;
};
