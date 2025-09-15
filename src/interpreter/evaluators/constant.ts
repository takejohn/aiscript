import type { Ast } from '../../index.js';
import type { Control } from '../control.js';
import type { Value } from '../value.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from '../context.js';
import type { Evaluator } from '../types.js';

type ConstantNode = Ast.Null | Ast.Bool | Ast.Num | Ast.Str;

export class ConstantEvaluator<N extends ConstantNode> implements Evaluator<N> {
	constructor(private translate: (node: N) => Value) {}

	async evalAsync(context: AsyncEvaluatorContext, node: N): Promise<Value | Control> {
		return this.translate(node);
	}

	evalSync(context: SyncEvaluatorContext, node: N): Value | Control {
		return this.translate(node);
	}
};
