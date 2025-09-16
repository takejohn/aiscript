import { isControl, type Control } from '../control.js';
import { assertFunction } from '../util.js';
import { autobind } from '../../utils/mini-autobind.js';
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
	public static readonly POW = new BinaryOperationEvaluator<Ast.Pow>('Core:pow');
	public static readonly MUL = new BinaryOperationEvaluator<Ast.Mul>('Core:mul');
	public static readonly DIV = new BinaryOperationEvaluator<Ast.Div>('Core:div');
	public static readonly REM = new BinaryOperationEvaluator<Ast.Rem>('Core:mod');
	public static readonly ADD = new BinaryOperationEvaluator<Ast.Add>('Core:add');
	public static readonly SUB = new BinaryOperationEvaluator<Ast.Sub>('Core:sub');
	public static readonly LT = new BinaryOperationEvaluator<Ast.Lt>('Core:lt');
	public static readonly LTEQ = new BinaryOperationEvaluator<Ast.Lteq>('Core:lteq');
	public static readonly GT = new BinaryOperationEvaluator<Ast.Gt>('Core:gt');
	public static readonly GTEQ = new BinaryOperationEvaluator<Ast.Gteq>('Core:gteq');
	public static readonly EQ = new BinaryOperationEvaluator<Ast.Eq>('Core:eq');
	public static readonly NEQ = new BinaryOperationEvaluator<Ast.Neq>('Core:neq');

	private constructor(private functionName: string) {}

	@autobind
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

	@autobind
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
