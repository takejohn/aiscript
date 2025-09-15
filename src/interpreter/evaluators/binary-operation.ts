import { isControl, type Control } from '../control.js';
import { assertFunction } from '../util.js';
import type { Ast } from '../../index.js';
import type { Value } from '../value.js';
import type { Scope } from '../scope.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from '../context.js';
import type { CallInfo, Evaluator } from '../types.js';

type BinaryOperationNode =
	Ast.Pow |
	Ast.Mul |
	Ast.Div |
	Ast.Rem |
	Ast.Add |
	Ast.Sub |
	Ast.Lt |
	Ast.Lteq |
	Ast.Gt |
	Ast.Gteq |
	Ast.Eq |
	Ast.Neq;

export class BinaryOperationEvaluator<N extends BinaryOperationNode> implements Evaluator<N> {
	constructor(private functionName: string) {}

	async evalAsync(context: AsyncEvaluatorContext, node: BinaryOperationNode, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const callee = scope.get(this.functionName);
		assertFunction(callee);
		const left = await context.eval(node.left, scope, callStack);
		if (isControl(left)) {
			return left;
		}
		const right = await context.eval(node.right, scope, callStack);
		if (isControl(right)) {
			return right;
		}
		return context.fn(callee, [left, right], callStack);
	}

	evalSync(context: SyncEvaluatorContext, node: BinaryOperationNode, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const callee = scope.get(this.functionName);
		assertFunction(callee);
		const left = context.eval(node.left, scope, callStack);
		if (isControl(left)) {
			return left;
		}
		const right = context.eval(node.right, scope, callStack);
		if (isControl(right)) {
			return right;
		}
		return context.fn(callee, [left, right], callStack);
	}
};
