import { NULL } from '../value.js';
import { isControl, type Control } from '../control.js';
import { isObject } from '../util.js';
import { getPrimProp } from '../primitive-props.js';
import type { Ast } from '../../index.js';
import type { Value } from '../value.js';
import type { Scope } from '../scope.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from '../context.js';
import type { CallInfo, Evaluator } from '../types.js';

export class PropEvaluator implements Evaluator<Ast.Prop> {
	async evalAsync(context: AsyncEvaluatorContext, node: Ast.Prop, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const target = await context.eval(node.target, scope, callStack);
		if (isControl(target)) {
			return target;
		}
		if (isObject(target)) {
			if (target.value.has(node.name)) {
				return target.value.get(node.name)!;
			} else {
				return NULL;
			}
		} else {
			return getPrimProp(target, node.name);
		}
	}

	evalSync(context: SyncEvaluatorContext, node: Ast.Prop, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const target = context.eval(node.target, scope, callStack);
		if (isControl(target)) {
			return target;
		}
		if (isObject(target)) {
			if (target.value.has(node.name)) {
				return target.value.get(node.name)!;
			} else {
				return NULL;
			}
		} else {
			return getPrimProp(target, node.name);
		}
	}
};
