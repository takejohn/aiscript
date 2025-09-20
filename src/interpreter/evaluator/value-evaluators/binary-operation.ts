import { isControl } from '../../control.js';
import { assertFunction } from '../../util.js';
import { instructions } from '../step.js';
import type { Value } from '../../value.js';
import type { Control } from '../../control.js';
import type { Ast } from '../../../index.js';
import type { Scope } from '../../scope.js';
import type { EvaluationStepResult } from '../step.js';

type BinaryOperationNode = Ast.Expression & { left: Ast.Expression, right: Ast.Expression };

const createEvaluationStep = <N extends BinaryOperationNode>(fnName: string) =>
	function(node: N, scope: Scope): EvaluationStepResult {
		const callee = scope.get(fnName);
		assertFunction(callee);

		return instructions.eval(node.left, scope, (left) => {
			if (isControl(left)) {
				return instructions.end(left);
			}

			return instructions.eval<Value | Control>(node.right, scope, (right) => {
				if (isControl(right)) {
					return instructions.end(right);
				}

				return instructions.fn(callee, [left, right], (value) => {
					return instructions.end(value);
				});
			});
		});
	};

export const evalPow = createEvaluationStep<Ast.Pow>('Core:pow');
export const evalMul = createEvaluationStep<Ast.Mul>('Core:mul');
export const evalDiv = createEvaluationStep<Ast.Div>('Core:div');
export const evalRem = createEvaluationStep<Ast.Rem>('Core:mod');
export const evalAdd = createEvaluationStep<Ast.Add>('Core:add');
export const evalSub = createEvaluationStep<Ast.Sub>('Core:sub');
export const evalLt = createEvaluationStep<Ast.Lt>('Core:lt');
export const evalLteq = createEvaluationStep<Ast.Lteq>('Core:lteq');
export const evalGt = createEvaluationStep<Ast.Gt>('Core:gt');
export const evalGteq = createEvaluationStep<Ast.Gteq>('Core:gteq');
export const evalEq = createEvaluationStep<Ast.Eq>('Core:eq');
export const evalNeq = createEvaluationStep<Ast.Neq>('Core:neq');
