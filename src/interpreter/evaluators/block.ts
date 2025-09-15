import { unWrapLabeledBreak, type Control } from '../control.js';
import { autobind } from '../../utils/mini-autobind.js';
import type { Ast } from '../../index.js';
import type { Value } from '../value.js';
import type { Scope } from '../scope.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from '../context.js';
import type { CallInfo, Evaluator } from '../types.js';

export class BlockEvaluator implements Evaluator<Ast.Block> {
	@autobind
	async evalAsync(context: AsyncEvaluatorContext, node: Ast.Block, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		return unWrapLabeledBreak(await context.run(node.statements, scope.createChildScope(), callStack), node.label);
	}

	@autobind
	evalSync(context: SyncEvaluatorContext, node: Ast.Block, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		return unWrapLabeledBreak(context.run(node.statements, scope.createChildScope(), callStack), node.label);
	}
};
