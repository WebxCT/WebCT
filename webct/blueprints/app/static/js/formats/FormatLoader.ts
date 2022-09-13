import { configFull, configSubset } from "../types";

// https://stackoverflow.com/questions/43723313/typescript-abstract-class-static-method-not-enforced
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FormatLoader {
	as_config: () => configSubset;
}

export interface FormatLoaderStatic {
	from_config: (config:configFull) => FormatLoader;
	from_text: (obj:unknown) => FormatLoader;
}
