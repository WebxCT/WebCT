import { configFull, configSubset, ExportOptions } from "../types";

// https://stackoverflow.com/questions/43723313/typescript-abstract-class-static-method-not-enforced
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FormatLoader {
	as_config: () => configSubset;
	to_text: () => string;
}

export interface FormatLoaderStatic {
	from_config: (config:configFull, options:ExportOptions) => FormatLoader;
	from_text: (obj:string) => FormatLoader;
	can_parse: (text:string) => boolean;
}
