import { isControl, type Control } from '../../control.js';
import { OBJ } from '../../value.js';
import type { Scope } from '../../scope.js';
import type * as Ast from '../../../node.js';
import type { Value } from '../../value.js';
import type { AsyncEvaluationContext, CallInfo, Evaluator, SyncEvaluationContext } from '../context.js';

export const objEvaluator: Evaluator<Ast.Node & { type: 'obj' }> = {
	async evalAsync(context: AsyncEvaluationContext, node: Ast.Node & { type: 'obj' }, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const obj = new Map<string, Value>();
		for (const [key, valueExpr] of node.value) {
			const value = await context._eval(valueExpr, scope, callStack);
			if (isControl(value)) {
				return value;
			}
			obj.set(key, value);
		}
		return OBJ(obj);
	},

	evalSync(context: SyncEvaluationContext, node: Ast.Node & { type: 'obj' }, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const obj = new Map<string, Value>();
		for (const [key, valueExpr] of node.value) {
			const value = context._evalSync(valueExpr, scope, callStack);
			if (isControl(value)) {
				return value;
			}
			obj.set(key, value);
		}
		return OBJ(obj);
	},
};
