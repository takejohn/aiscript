import { ARR } from '../value.js';
import { isControl, type Control } from '../control.js';
import type { Ast } from '../../index.js';
import type { Value } from '../value.js';
import type { Scope } from '../scope.js';
import type { CallInfo, Evaluator, AsyncEvaluatorContext, SyncEvaluatorContext } from '../context.js';

export class ArrEvaluator implements Evaluator<Ast.Arr> {
	async evalAsync(context: AsyncEvaluatorContext, node: Ast.Arr, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const value = [];
		for (const item of node.value) {
			const valueItem = await context.eval(item, scope, callStack);
			if (isControl(valueItem)) {
				return valueItem;
			}
			value.push(valueItem);
		}
		return ARR(value);
	}

	evalSync(context: SyncEvaluatorContext, node: Ast.Arr, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const value = [];
		for (const item of node.value) {
			const valueItem = context.eval(item, scope, callStack);
			if (isControl(valueItem)) {
				return valueItem;
			}
			value.push(valueItem);
		}
		return ARR(value);
	}
};
