import { isControl } from '../../control.js';
import { assertFunction } from '../../util.js';
import type { Value, VFn } from '../../value.js';
import type { Control } from '../../control.js';
import type { AsyncEvaluationContext, CallInfo, Evaluator, SyncEvaluationContext } from '../context.js';
import type { Ast, Scope } from '../../../index.js';

type BinaryOperationNode = Ast.Expression & {
	left: Ast.Expression;
	right: Ast.Expression;
};

class BinaryOperationEvaluator<N extends BinaryOperationNode> implements Evaluator<N> {
	constructor(private op: string) {
	}

	async evalAsync(context: AsyncEvaluationContext, node: N, scope: Scope, callstack: readonly CallInfo[]): Promise<Value | Control> {
		const callee = this.getCallee(scope);
		const left = await context._eval(node.left, scope, callstack);
		if (isControl(left)) {
			return left;
		}
		const right = await context._eval(node.right, scope, callstack);
		if (isControl(right)) {
			return right;
		}
		return context._fn(callee, [left, right], callstack);
	}

	evalSync(context: SyncEvaluationContext, node: N, scope: Scope, callstack: readonly CallInfo[]): Value | Control {
		const callee = this.getCallee(scope);
		const left = context._evalSync(node.left, scope, callstack);
		if (isControl(left)) {
			return left;
		}
		const right = context._evalSync(node.right, scope, callstack);
		if (isControl(right)) {
			return right;
		}
		return context._fnSync(callee, [left, right], callstack);
	}

	private getCallee(scope: Scope): VFn {
		const callee = scope.get(this.op);
		assertFunction(callee);
		return callee;
	}
}

export const addEvaluator = new BinaryOperationEvaluator<Ast.Node & { type: 'add' }>('Core:add');
export const divEvaluator = new BinaryOperationEvaluator<Ast.Node & { type: 'div' }>('Core:div');
export const eqEvaluator = new BinaryOperationEvaluator<Ast.Node & { type: 'eq' }>('Core:eq');
export const gtEvaluator = new BinaryOperationEvaluator<Ast.Node & { type: 'gt' }>('Core:gt');
export const gteqEvaluator = new BinaryOperationEvaluator<Ast.Node & { type: 'gteq' }>('Core:gteq');
export const ltEvaluator = new BinaryOperationEvaluator<Ast.Node & { type: 'lt' }>('Core:lt');
export const lteqEvaluator = new BinaryOperationEvaluator<Ast.Node & { type: 'lteq' }>('Core:lteq');
export const mulEvaluator = new BinaryOperationEvaluator<Ast.Node & { type: 'mul' }>('Core:mul');
export const neqEvaluator = new BinaryOperationEvaluator<Ast.Node & { type: 'neq' }>('Core:neq');
export const powEvaluator = new BinaryOperationEvaluator<Ast.Node & { type: 'pow' }>('Core:pow');
export const remEvaluator = new BinaryOperationEvaluator<Ast.Node & { type: 'rem' }>('Core:mod');
export const subEvaluator = new BinaryOperationEvaluator<Ast.Node & { type: 'sub' }>('Core:sub');
