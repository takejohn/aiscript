import { type Control } from '../../control.js';
import { STR } from '../../value.js';
import type { Scope } from '../../scope.js';
import type * as Ast from '../../../node.js';
import type { Value } from '../../value.js';
import type { AsyncEvaluationContext, CallInfo, Evaluator, SyncEvaluationContext } from '../evaluation.js';

export const strEvaluator: Evaluator<Ast.Node & { type: 'str' }> = {
	async evalAsync(context: AsyncEvaluationContext, node: Ast.Node & { type: 'str' }, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		return STR(node.value);
	},

	evalSync(context: SyncEvaluationContext, node: Ast.Node & { type: 'str' }, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		return STR(node.value);
	},
};
