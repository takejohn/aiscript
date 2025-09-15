import { ARR } from '../value.js';
import { isControl, type Control } from '../control.js';
import { autobind } from '../../utils/mini-autobind.js';
import type { Ast } from '../../index.js';
import type { Value } from '../value.js';
import type { Scope } from '../scope.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from '../context.js';
import type { CallInfo, Evaluator } from '../types.js';

export class ArrEvaluator implements Evaluator<Ast.Arr> {
	@autobind
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

	@autobind
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
