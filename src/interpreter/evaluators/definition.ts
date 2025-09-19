import { NULL } from '../value.js';
import { assertValue, isControl } from '../control.js';
import { isFunction } from '../util.js';
import { define } from '../define.js';
import { evaluationStepsToEvaluator, instructions } from '../evaluator.js';
import type { EvaluationDoneResult, EvaluationStepResult } from '../evaluator.js';
import type { Ast } from '../../index.js';
import type { Value } from '../value.js';
import type { Scope } from '../scope.js';

function evalDefinition(node: Ast.Definition, scope: Scope): EvaluationStepResult {
	return instructions.eval(node.expr, scope, (value) => {
		if (isControl(value)) {
			return instructions.end(value);
		}

		const defineValue = (): EvaluationDoneResult => {
			if (
				node.expr.type === 'fn'
						&& node.dest.type === 'identifier'
						&& isFunction(value)
						&& !value.native
			) {
				value.name = node.dest.name;
			}
			define(scope, node.dest, value, node.mut);
			return instructions.end(NULL);
		};

		const defineWithAttrs = (attrs: NonNullable<Value['attr']>, attrIterator: Iterator<Ast.Attribute>): EvaluationStepResult => {
			const nAttrResult = attrIterator.next();
			if (nAttrResult.done) {
				value.attr = attrs;
				return defineValue();
			}
			const nAttr = nAttrResult.value;
			return instructions.eval(nAttr.value, scope, (value) => {
				assertValue(value);
				attrs.push({
					name: nAttr.name,
					value,
				});
				return defineWithAttrs(attrs, attrIterator);
			});
		};

		if (node.attr.length > 0) {
			const attrs: NonNullable<Value['attr']> = [];
			const attrIterator = node.attr.values();
			return defineWithAttrs(attrs, attrIterator);
		}

		return defineValue();
	});
}

export const DefinitionEvaluator = evaluationStepsToEvaluator(evalDefinition);
