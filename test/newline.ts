import { describe, expect, test } from "vitest";
import { utils } from '../src/index.js';
import { NUM, STR, NULL, ARR, OBJ, BOOL, TRUE, FALSE, ERROR ,FN_NATIVE } from '../src/interpreter/value.js';
import { exe, getMeta } from './testutils.js';

describe('empty lines', () => {
    describe('match', () => {
		test.concurrent('empty line', async () => {
			const res = await exe(`
			<: match 1 {
				// comment
			}
			`);
			expect(res).toEqualValueOf(NULL);
		});

		test.concurrent('empty line before case', async () => {
			const res = await exe(`
			<: match 1 {
				// comment
				case 1 => 1
			}
			`);
			expect(res).toEqualValueOf(NUM(1));
		});

		test.concurrent('empty line after case', async () => {
			const res = await exe(`
			<: match 1 {
				case 1 => 1
				// comment
			}
			`);
			expect(res).toEqualValueOf(NUM(1));
		});

		test.concurrent('empty line before default', async () => {
			const res = await exe(`
			<: match 1 {
				// comment
				default => 1
			}
			`);
			expect(res).toEqualValueOf(NUM(1));
		});

		test.concurrent('empty line after default', async () => {
			const res = await exe(`
			<: match 1 {
				default => 1
				// comment
			}
			`);
			expect(res).toEqualValueOf(NUM(1));
		});
    });

    describe('call', () => {
		test.concurrent('empty line', async () => {
			const res = await exe(`
			@f() {
				1
			}
			<:f(
				// comment
			)
			`);
			expect(res).toEqualValueOf(NUM(1));
		});

		test.concurrent('empty line before', async () => {
			const res = await exe(`
			@f(a) {
				a
			}
			<:f(
				// comment
				1
			)
			`);
			expect(res).toEqualValueOf(NUM(1));
		});

		test.concurrent('empty line after', async () => {
			const res = await exe(`
			@f(a) {
				a
			}
			<:f(
				1
				// comment
			)
			`);
			expect(res).toEqualValueOf(NUM(1));
		});
    });

    describe('type params', () => {
        describe('function', () => {
            test.concurrent('empty line before', async () => {
                const res = await exe(`
                @f<
                    // comment
                    T
                >(v: T): T {
                    v
                }
                <: f(1)
                `);
                expect(res).toEqualValueOf(NUM(1));
            });

            test.concurrent('empty line after', async () => {
                const res = await exe(`
                @f<
                    T
                    // comment
                >(v: T): T {
                    v
                }
                <: f(1)
                `);
                expect(res).toEqualValueOf(NUM(1));
            });
        });

        describe('function type', () => {
            test.concurrent('empty line before', async () => {
                const res = await exe(`
                let f: @<
                    // comment
                    T
                >(T) => T = @(v) {
                    v
                }
                <: f(1)
                `);
                expect(res).toEqualValueOf(NUM(1));
            });

            test.concurrent('empty line after', async () => {
                const res = await exe(`
                let f: @<
                    T
                    // comment
                >(T) => T = @(v) {
                    v
                }
                <: f(1)
                `);
                expect(res).toEqualValueOf(NUM(1));
            });
        });
    });

    describe('function params', () => {
		test.concurrent('empty line', async () => {
			const res = await exe(`
			@f(
				// comment
			) {
				1
			}
			<: f()
			`);
			expect(res).toEqualValueOf(NUM(1));
		});

		test.concurrent('empty line before', async () => {
			const res = await exe(`
			@f(
				// comment
				a
			) {
				a
			}
			<: f(1)
			`);
			expect(res).toEqualValueOf(NUM(1));
		});

		test.concurrent('empty line after', async () => {
			const res = await exe(`
			@f(
				a
				// comment
			) {
				a
			}
			<: f(1)
			`);
			expect(res).toEqualValueOf(NUM(1));
		});
    });

    describe('if', () => {
        test.concurrent('empty line between if ~ elif', async () => {
            const res = await exe(`
            <: if true {
                1
            }
            // comment
            elif true {
                2
            }
            `);
            expect(res).toEqualValueOf(NUM(1));
        });

        test.concurrent('empty line between if ~ elif ~ elif', async () => {
            const res = await exe(`
            <: if true {
                1
            }
            // comment
            elif true {
                2
            }
            // comment
            elif true {
                3
            }
            `);
            expect(res).toEqualValueOf(NUM(1));
        });

        test.concurrent('empty line between if ~ else', async () => {
            const res = await exe(`
            <: if true {
                1
            }
            // comment
            else {
                2
            }
            `);
            expect(res).toEqualValueOf(NUM(1));
        });

        test.concurrent('empty line between if ~ elif ~ else', async () => {
            const res = await exe(`
            <: if true {
                1
            }
            // comment
            elif true {
                2
            }
            // comment
            else {
                3
            }
            `);
            expect(res).toEqualValueOf(NUM(1));
        });
    });

    describe('unary operation', () => {
        test.concurrent('empty line after', async () => {
            const res = await exe(`
            ! \\
            // comment
            true
            `);
            expect(res).toEqualValueOf(BOOL(false));
        });
    });

    describe('binary operation', () => {
        test.concurrent('empty line before', async () => {
            const res = await exe(`
            <: 2 \\
            // comment
            * 3
            `);
            expect(res).toEqualValueOf(NUM(6));
        });
    });

    describe('binary operation', () => {
        test.concurrent('empty line after', async () => {
            const res = await exe(`
            <: 2 * \\
            // comment
            3
            `);
            expect(res).toEqualValueOf(NUM(6));
        });
    });

    describe('variable definition', () => {
        test.concurrent('empty line after equal', async () => {
            const res = await exe(`
            let a =
            // comment
            1
            <: a
            `);
            expect(res).toEqualValueOf(NUM(1));
        });
    });

    describe('attribute', () => {
        test.concurrent('empty line after', async () => {
            const res = await exe(`
            #[abc]
            // comment
            let a = 1
            <: a
            `);
            expect(res).toEqualValueOf(NUM(1));
        });
    });

    describe('obj literal', () => {
        test.concurrent('empty line', async () => {
            const res = await exe(`
            <: {
                // comment
            }
            `);
            expect(res).toEqualValueOf(OBJ(new Map()));
        });

        test.concurrent('empty line before', async () => {
            const res = await exe(`
            let x = {
                // comment
                a: 1
            }
            <: x.a
            `);
            expect(res).toEqualValueOf(NUM(1));
        });

        test.concurrent('empty line after', async () => {
            const res = await exe(`
            let x = {
                a: 1
                // comment
            }
            <: x.a
            `);
            expect(res).toEqualValueOf(NUM(1));
        });
    });

    describe('arr literal', () => {
        test.concurrent('empty line', async () => {
            const res = await exe(`
            <: [
                // comment
            ]
            `);
            expect(res).toEqualValueOf(ARR([]));
        });

        test.concurrent('empty line before', async () => {
            const res = await exe(`
            let x = [
                // comment
                1
            ]
            <: x[0]
            `);
            expect(res).toEqualValueOf(NUM(1));
        });

        test.concurrent('empty line after', async () => {
            const res = await exe(`
            let x = [
                1
                // comment
            ]
            <: x[0]
            `);
            expect(res).toEqualValueOf(NUM(1));
        });
    });
});
