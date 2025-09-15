import { OBJ } from '../value.js';
import { isControl, type Control } from '../control.js';
import { autobind } from '../../utils/mini-autobind.js';
import type { Ast } from '../../index.js';
import type { Value } from '../value.js';
import type { Scope } from '../scope.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from '../context.js';
import type { CallInfo, Evaluator } from '../types.js';

export class ObjEvaluator implements Evaluator<Ast.Obj> {
	@autobind
	async evalAsync(context: AsyncEvaluatorContext, node: Ast.Obj, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const obj = new Map<string, Value>();
		for (const [key, valueExpr] of node.value) {
			const value = await context.eval(valueExpr, scope, callStack);
			if (isControl(value)) {
				return value;
			}
			obj.set(key, value);
		}
		return OBJ(obj);
	}

	@autobind
	evalSync(context: SyncEvaluatorContext, node: Ast.Obj, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const obj = new Map<string, Value>();
		for (const [key, valueExpr] of node.value) {
			const value = context.eval(valueExpr, scope, callStack);
			if (isControl(value)) {
				return value;
			}
			obj.set(key, value);
		}
		return OBJ(obj);
	}
};
