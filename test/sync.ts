/* eslint-disable prefer-const */

import * as assert from 'assert';
import { describe, expect, test } from 'vitest';
import { Parser, Interpreter, Ast } from '../src/index.js';
import { NUM, STR, NULL, ARR, OBJ, BOOL, TRUE, FALSE, ERROR ,FN_NATIVE } from '../src/interpreter/value.js';
import { AiScriptSyntaxError, AiScriptRuntimeError, AiScriptIndexOutOfRangeError } from '../src/error.js';
import { exeSync, eq } from './testutils.js';

test.concurrent('Hello, world!', () => {
	const res = exeSync('"Hello, world!"');
	expect(res).toEqualValueOf(STR('Hello, world!'));
});


test.concurrent('Closure', () => {
	const res = exeSync(`
	@store(v) {
		let state = v
		@() {
			state
		}
	}
	let s = store("ai")
	s()
	`);
	expect(res).toEqualValueOf(STR('ai'));
});

test.concurrent('Closure (counter)', () => {
	const res = exeSync(`
	@create_counter() {
		var count = 0
		{
			get_count: @() { count },
			count: @() { count = (count + 1) },
		}
	}

	let counter = create_counter()
	let get_count = counter.get_count
	let count = counter.count

	count()
	count()
	count()

	get_count()
	`);
	expect(res).toEqualValueOf(NUM(3));
});

describe('extra', () => {
	test.concurrent('Fizz Buzz', () => {
		const res = exeSync(`
		let res = []
		for (let i = 1, 15) {
			let msg =
				if (i % 15 == 0) "FizzBuzz"
				elif (i % 3 == 0) "Fizz"
				elif (i % 5 == 0) "Buzz"
				else i
			res.push(msg)
		}
		res
		`);
		expect(res).toEqualValueOf(ARR([
			NUM(1),
			NUM(2),
			STR('Fizz'),
			NUM(4),
			STR('Buzz'),
			STR('Fizz'),
			NUM(7),
			NUM(8),
			STR('Fizz'),
			STR('Buzz'),
			NUM(11),
			STR('Fizz'),
			NUM(13),
			NUM(14),
			STR('FizzBuzz'),
		]));
	});

	test.concurrent('SKI', () => {
		const res = exeSync(`
		let s = @(x) { @(y) { @(z) {
			//let f = x(z) f(@(a){ let g = y(z) g(a) })
			let f = x(z)
			f(y(z))
		}}}
		let k = @(x){ @(y) { x } }
		let i = @(x){ x }

		// combine
		@c(l) {
			// extract
			@x(v) {
				if (Core:type(v) == "arr") { c(v) } else { v }
			}

			// rec
			@r(f, n) {
				if (n < l.len) {
					r(f(x(l[n])), (n + 1))
				} else { f }
			}

			r(x(l[0]), 1)
		}

		var result = null
		@_print(v) {
			result = v
		}

		let sksik = [s, [k, [s, i]], k]
		c([sksik, "foo", _print])

		result
		`);
		expect(res).toEqualValueOf(STR('foo'));
	});
});
