import { isControl, type Control } from '../control.js';
import { assertFunction } from '../util.js';
import type { Ast } from '../../index.js';
import type { Scope } from '../scope.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from '../context.js';
import type { CallInfo, Evaluator } from '../types.js';
import type { Value } from '../value.js';

export class CallEvaluator implements Evaluator<Ast.Call> {
	async evalAsync(context: AsyncEvaluatorContext, node: Ast.Call, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const callee = await context.eval(node.target, scope, callStack);
		if (isControl(callee)) {
			return callee;
		}
		assertFunction(callee);
		const args = [];
		for (const expr of node.args) {
			const arg = await context.eval(expr, scope, callStack);
			if (isControl(arg)) {
				return arg;
			}
			args.push(arg);
		}
		return context.fn(callee, args, callStack, node.loc.start);
	}

	evalSync(context: SyncEvaluatorContext, node: Ast.Call, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const callee = context.eval(node.target, scope, callStack);
		if (isControl(callee)) {
			return callee;
		}
		assertFunction(callee);
		const args = [];
		for (const expr of node.args) {
			const arg = context.eval(expr, scope, callStack);
			if (isControl(arg)) {
				return arg;
			}
			args.push(arg);
		}
		return context.fn(callee, args, callStack, node.loc.start);
	}
};
