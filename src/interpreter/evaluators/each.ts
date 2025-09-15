import { NULL } from '../value.js';
import { isControl, type Control } from '../control.js';
import { assertArray } from '../util.js';
import { define } from '../define.js';
import type { Ast } from '../../index.js';
import type { Value } from '../value.js';
import type { Scope } from '../scope.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from '../context.js';
import type { CallInfo, Evaluator } from '../types.js';

export class EachEvaluator implements Evaluator<Ast.Node> {
	async evalAsync(context: AsyncEvaluatorContext, node: Ast.Each, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const items = await context.eval(node.items, scope, callStack);
		if (isControl(items)) {
			return items;
		}
		assertArray(items);
		for (const item of items.value) {
			const eachScope = scope.createChildScope();
			define(eachScope, node.var, item, false);
			const v = await context.eval(node.for, eachScope, callStack);
			if (v.type === 'break') {
				if (v.label != null && v.label !== node.label) {
					return v;
				}
				break;
			} else if (v.type === 'continue') {
				if (v.label != null && v.label !== node.label) {
					return v;
				}
			} else if (v.type === 'return') {
				return v;
			}
		}
		return NULL;
	}

	evalSync(context: SyncEvaluatorContext, node: Ast.Each, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const items = context.eval(node.items, scope, callStack);
		if (isControl(items)) {
			return items;
		}
		assertArray(items);
		for (const item of items.value) {
			const eachScope = scope.createChildScope();
			define(eachScope, node.var, item, false);
			const v = context.eval(node.for, eachScope, callStack);
			if (v.type === 'break') {
				if (v.label != null && v.label !== node.label) {
					return v;
				}
				break;
			} else if (v.type === 'continue') {
				if (v.label != null && v.label !== node.label) {
					return v;
				}
			} else if (v.type === 'return') {
				return v;
			}
		}
		return NULL;
	}
};
