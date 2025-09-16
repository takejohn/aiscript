import { NULL, NUM } from '../value.js';
import { isControl, type Control } from '../control.js';
import { assertNumber } from '../util.js';
import { autobind } from '../../utils/mini-autobind.js';
import { evalClauseAsync, evalClauseSync } from './evaluator-utils.js';
import type { Ast } from '../../index.js';
import type { Value } from '../value.js';
import type { Scope } from '../scope.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from '../context.js';
import type { CallInfo, Evaluator } from '../types.js';

export class ForEvaluator implements Evaluator<Ast.For> {
	@autobind
	async evalAsync(context: AsyncEvaluatorContext, node: Ast.For, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		if (node.times) {
			const times = await context.eval(node.times, scope, callStack);
			if (isControl(times)) {
				return times;
			}
			assertNumber(times);
			for (let i = 0; i < times.value; i++) {
				const v = await evalClauseAsync(context, node.for, scope, callStack);
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
		} else {
			const from = await context.eval(node.from!, scope, callStack);
			if (isControl(from)) {
				return from;
			}
			const to = await context.eval(node.to!, scope, callStack);
			if (isControl(to)) {
				return to;
			}
			assertNumber(from);
			assertNumber(to);
			for (let i = from.value; i < from.value + to.value; i++) {
				const v = await context.eval(node.for, scope.createChildScope(new Map([
					[node.var!, {
						isMutable: false,
						value: NUM(i),
					}],
				])), callStack);
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
		}
		return NULL;
	}

	@autobind
	evalSync(context: SyncEvaluatorContext, node: Ast.For, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		if (node.times) {
			const times = context.eval(node.times, scope, callStack);
			if (isControl(times)) {
				return times;
			}
			assertNumber(times);
			for (let i = 0; i < times.value; i++) {
				const v = evalClauseSync(context, node.for, scope, callStack);
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
		} else {
			const from = context.eval(node.from!, scope, callStack);
			if (isControl(from)) {
				return from;
			}
			const to = context.eval(node.to!, scope, callStack);
			if (isControl(to)) {
				return to;
			}
			assertNumber(from);
			assertNumber(to);
			for (let i = from.value; i < from.value + to.value; i++) {
				const v = context.eval(node.for, scope.createChildScope(new Map([
					[node.var!, {
						isMutable: false,
						value: NUM(i),
					}],
				])), callStack);
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
		}
		return NULL;
	}
};
