import { CONTINUE, type Control } from '../control.js';
import { autobind } from '../../utils/mini-autobind.js';
import type { Ast } from '../../index.js';
import type { Value } from '../value.js';
import type { Scope } from '../scope.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from '../context.js';
import type { CallInfo, Evaluator } from '../types.js';

export class ContinueEvaluator implements Evaluator<Ast.Continue> {
	@autobind
	async evalAsync(context: AsyncEvaluatorContext, node: Ast.Continue, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		context.log('block:continue', { scope: scope.name });
		return CONTINUE(node.label);
	}

	@autobind
	evalSync(context: SyncEvaluatorContext, node: Ast.Continue, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		context.log('block:continue', { scope: scope.name });
		return CONTINUE(node.label);
	}
};
