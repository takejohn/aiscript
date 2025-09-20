import type { Ast, Scope } from '../../index.js';
import type { Control } from '../control.js';
import type { CallInfo } from '../types.js';
import type { Value } from '../value.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from './context.js';

export interface NodeEvaluator<N extends Ast.Node, R = Value | Control> {
	evalAsync(
		context: AsyncEvaluatorContext,
		node: N,
		scope: Scope,
		callStack: readonly CallInfo[]
	): Promise<R>;

	evalSync(
		context: SyncEvaluatorContext,
		node: N,
		scope: Scope,
		callStack: readonly CallInfo[]
	): R;
}

