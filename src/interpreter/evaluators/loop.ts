import { NULL } from '../value.js';
import { autobind } from '../../utils/mini-autobind.js';
import type { Ast } from '../../index.js';
import type { Control } from '../control.js';
import type { Value } from '../value.js';
import type { Scope } from '../scope.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from '../context.js';
import type { CallInfo, Evaluator } from '../types.js';

export class LoopEvaluator implements Evaluator<Ast.Loop> {
	@autobind
	async evalAsync(context: AsyncEvaluatorContext, node: Ast.Loop, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		// eslint-disable-next-line no-constant-condition, @typescript-eslint/no-unnecessary-condition
		while (true) {
			const v = await context.run(node.statements, scope.createChildScope(), callStack);
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

	@autobind
	evalSync(context: SyncEvaluatorContext, node: Ast.Loop, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		// eslint-disable-next-line no-constant-condition, @typescript-eslint/no-unnecessary-condition
		while (true) {
			const v = context.run(node.statements, scope.createChildScope(), callStack);
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
