import { type Value, type VFn } from './value.js';
import type { Reference } from './reference.js';
import type { Control } from './control.js';
import type { Ast, Scope } from '../index.js';
import type { CallInfo, LogObject } from './types.js';

interface EvaluatorContextBase {
	log(type: string, params: LogObject): void;
}

export interface AsyncEvaluatorContext extends EvaluatorContextBase {
	eval(node: Ast.Node, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control>;

	evalClause(node: Ast.Statement | Ast.Expression, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control>;

	fn(fn: VFn, args: Value[], callStack: readonly CallInfo[], pos?: Ast.Pos): Promise<Value>;

	getReference(dest: Ast.Expression, scope: Scope, callStack: readonly CallInfo[]): Promise<Reference | Control>;

	run(program: Ast.Node[], scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control>;
}

export interface SyncEvaluatorContext extends EvaluatorContextBase {
	eval(node: Ast.Node, scope: Scope, callStack: readonly CallInfo[]): Value | Control;

	evalClause(node: Ast.Statement | Ast.Expression, scope: Scope, callStack: readonly CallInfo[]): Value | Control;

	fn(fn: VFn, args: Value[], callStack: readonly CallInfo[], pos?: Ast.Pos): Value;

	getReference(dest: Ast.Expression, scope: Scope, callStack: readonly CallInfo[]): Reference | Control;

	run(program: Ast.Node[], scope: Scope, callStack: readonly CallInfo[]): Value | Control;
}
