/* eslint-disable tsdoc/syntax */
import { nodeResolve } from "@rollup/plugin-node-resolve";
import { terser } from "rollup-plugin-terser";

// rollup.config.js
/**
 * @type {import('rollup').RollupOptions}
 */
const configs = [
	// One entry per page that has a code entrypoint. Libraries / shared code do
	// not need an entrypoint.
	{
		input: "webct/blueprints/errors/static/js/errors.js",
		output: {
			file: "webct/blueprints/errors/static/js/errors.b.js",
			format: "cjs",
			name: "main"
		},
		plugins: [
			nodeResolve({preferBuiltins:false}),
			// terser({format:{comments:false,semicolons:true}}),
		],
	},
	{
		input: "webct/blueprints/app/static/js/app.js",
		output: {
			file: "webct/blueprints/app/static/js/app.b.js",
			format: "cjs",
			name: "main"
		},
		plugins: [
			nodeResolve({preferBuiltins:false}),
			// terser({format:{comments:false,semicolons:true}})
		]
	},
];

export default configs;
