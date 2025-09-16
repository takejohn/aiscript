import { autobind } from '../../utils/mini-autobind.js';
import { BOOL, NULL, NUM, STR, type Value } from '../value.js';
import type { Ast } from '../../index.js';
import type { Control } from '../control.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from '../context.js';
import type { Evaluator } from '../types.js';

type ConstantNode = Ast.Null | Ast.Bool | Ast.Num | Ast.Str;

export class ConstantEvaluator<N extends ConstantNode> implements Evaluator<N> {
	public static readonly NULL = new ConstantEvaluator<Ast.Null>(() => NULL);
	public static readonly BOOL = new ConstantEvaluator<Ast.Bool>((node) => BOOL(node.value));
	public static readonly NUM = new ConstantEvaluator<Ast.Num>((node) => NUM(node.value));
	public static readonly STR = new ConstantEvaluator<Ast.Str>((node) => STR(node.value));

	private constructor(private translate: (node: N) => Value) {}

	@autobind
	async evalAsync(context: AsyncEvaluatorContext, node: N): Promise<Value | Control> {
		return this.translate(node);
	}

	@autobind
	evalSync(context: SyncEvaluatorContext, node: N): Value | Control {
		return this.translate(node);
	}
};
