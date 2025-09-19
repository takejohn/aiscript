import { isControl } from '../control.js';
import { assertFunction } from '../util.js';
import { evaluationStepsToEvaluator, instructions } from '../evaluator.js';
import type { Evaluator } from '../types.js';
import type { Ast } from '../../index.js';
import type { Scope } from '../scope.js';
import type { EvaluationStepResult } from '../evaluator.js';

type BinaryOperationNodes = {
	'Core:pow': Ast.Pow,
	'Core:mul': Ast.Mul,
	'Core:div': Ast.Div,
	'Core:mod': Ast.Rem,
	'Core:add': Ast.Add,
	'Core:sub': Ast.Sub,
	'Core:lt': Ast.Lt,
	'Core:lteq': Ast.Lteq,
	'Core:gt': Ast.Gt,
	'Core:gteq': Ast.Gteq,
	'Core:eq': Ast.Eq,
	'Core:neq': Ast.Neq,
};

function createEvaluator<F extends keyof BinaryOperationNodes>(fnName: F): Evaluator<BinaryOperationNodes[F]> {
	const func = function(node: BinaryOperationNodes[F], scope: Scope): EvaluationStepResult {
		const callee = scope.get(fnName);
		assertFunction(callee);

		return instructions.eval(node.left, scope, (left) => {
			if (isControl(left)) {
				return instructions.end(left);
			}

			return instructions.eval(node.right, scope, (right) => {
				if (isControl(right)) {
					return instructions.end(right);
				}

				return instructions.fn(callee, [left, right], (value) => {
					return instructions.end(value);
				});
			});
		});
	};

	return evaluationStepsToEvaluator(func);
}

export const BinaryOperationEvaluator = Object.freeze({
	POW: createEvaluator('Core:pow'),
	MUL: createEvaluator('Core:mul'),
	DIV: createEvaluator('Core:div'),
	REM: createEvaluator('Core:mod'),
	ADD: createEvaluator('Core:add'),
	SUB: createEvaluator('Core:sub'),
	LT: createEvaluator('Core:lt'),
	LTEQ: createEvaluator('Core:lteq'),
	GT: createEvaluator('Core:gt'),
	GTEQ: createEvaluator('Core:gteq'),
	EQ: createEvaluator('Core:eq'),
	NEQ: createEvaluator('Core:neq'),
});
