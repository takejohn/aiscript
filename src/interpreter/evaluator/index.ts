import { callEvaluator } from './evaluators/call.js';
import { ifEvaluator } from './evaluators/if.js';
import { matchEvaluator } from './evaluators/match.js';
import { loopEvaluator } from './evaluators/loop.js';
import { forEvaluator } from './evaluators/for.js';
import { eachEvaluator } from './evaluators/each.js';
import { defEvaluator } from './evaluators/def.js';
import { identifierEvaluator } from './evaluators/identifier.js';
import { assignEvaluator } from './evaluators/assign.js';
import { addAssignEvaluator } from './evaluators/addAssign.js';
import { subAssignEvaluator } from './evaluators/subAssign.js';
import { nullEvaluator } from './evaluators/null.js';
import { boolEvaluator } from './evaluators/bool.js';
import { numEvaluator } from './evaluators/num.js';
import { strEvaluator } from './evaluators/str.js';
import { arrEvaluator } from './evaluators/arr.js';
import { objEvaluator } from './evaluators/obj.js';
import { propEvaluator } from './evaluators/prop.js';
import { indexEvaluator } from './evaluators/index.js';
import { plusEvaluator } from './evaluators/plus.js';
import { minusEvaluator } from './evaluators/minus.js';
import { notEvaluator } from './evaluators/not.js';
import { fnEvaluator } from './evaluators/fn.js';
import { blockEvaluator } from './evaluators/block.js';
import { existsEvaluator } from './evaluators/exists.js';
import { tmplEvaluator } from './evaluators/tmpl.js';
import { returnEvaluator } from './evaluators/return.js';
import { breakEvaluator } from './evaluators/break.js';
import { continueEvaluator } from './evaluators/continue.js';
import { nsEvaluator } from './evaluators/ns.js';
import { metaEvaluator } from './evaluators/meta.js';
import {
	powEvaluator,
	mulEvaluator,
	divEvaluator,
	remEvaluator,
	addEvaluator,
	subEvaluator,
	ltEvaluator,
	lteqEvaluator,
	gtEvaluator,
	gteqEvaluator,
	eqEvaluator,
	neqEvaluator,
} from './evaluators/binaryOperation.js';
import { andEvaluator } from './evaluators/and.js';
import { orEvaluator } from './evaluators/or.js';

import type { AsyncEvaluationContext, CallInfo, Evaluator, SyncEvaluationContext } from './evaluation.js';
import type { Control } from '../control.js';
import type * as Ast from '../../node.js';
import type { Value } from '../value.js';
import type { Scope } from '../scope.js';

type NodeType = Ast.Node['type'];

type NodeOfType<T extends NodeType> = Ast.Node & { type: T };

const invalidEvaluator: Evaluator<Ast.Node> = {
	evalAsync() {
		throw new Error('invalid node type');
	},
	evalSync() {
		throw new Error('invalid node type');
	},
};

const EVALUATORS: { [T in NodeType]: Evaluator<NodeOfType<T>> } = {
	call: callEvaluator,
	if: ifEvaluator,
	match: matchEvaluator,
	loop: loopEvaluator,
	for: forEvaluator,
	each: eachEvaluator,
	def: defEvaluator,
	identifier: identifierEvaluator,
	assign: assignEvaluator,
	addAssign: addAssignEvaluator,
	subAssign: subAssignEvaluator,
	null: nullEvaluator,
	bool: boolEvaluator,
	num: numEvaluator,
	str: strEvaluator,
	arr: arrEvaluator,
	obj: objEvaluator,
	prop: propEvaluator,
	index: indexEvaluator,
	plus: plusEvaluator,
	minus: minusEvaluator,
	not: notEvaluator,
	fn: fnEvaluator,
	block: blockEvaluator,
	exists: existsEvaluator,
	tmpl: tmplEvaluator,
	return: returnEvaluator,
	break: breakEvaluator,
	continue: continueEvaluator,
	ns: nsEvaluator,
	meta: metaEvaluator,
	pow: powEvaluator,
	mul: mulEvaluator,
	div: divEvaluator,
	rem: remEvaluator,
	add: addEvaluator,
	sub: subEvaluator,
	lt: ltEvaluator,
	lteq: lteqEvaluator,
	gt: gtEvaluator,
	gteq: gteqEvaluator,
	eq: eqEvaluator,
	neq: neqEvaluator,
	and: andEvaluator,
	or: orEvaluator,
	namedTypeSource: invalidEvaluator,
	fnTypeSource: invalidEvaluator,
	unionTypeSource: invalidEvaluator,
	attr: invalidEvaluator,
} as const;

export function evalAsync<T extends NodeType>(context: AsyncEvaluationContext, node: NodeOfType<T>, scope: Scope, callstack: readonly CallInfo[]): Promise<Value | Control> {
	if (Object.hasOwn(EVALUATORS, node.type)) {
		return EVALUATORS[node.type].evalAsync(context, node, scope, callstack);
	}
	throw new Error('invalid node type');
}

export function evalSync<T extends NodeType>(context: SyncEvaluationContext, node: NodeOfType<T>, scope: Scope, callstack: readonly CallInfo[]): Value | Control {
	if (Object.hasOwn(EVALUATORS, node.type)) {
		return EVALUATORS[node.type].evalSync(context, node, scope, callstack);
	}
	throw new Error('invalid node type');
}
