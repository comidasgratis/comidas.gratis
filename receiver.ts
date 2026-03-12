import { TermWrapper, ValueMapping, TermMapping } from "https://unpkg.com/rdfjs-wrapper"


// https://github.com/rdfjs/wrapper
// https://github.com/solid/object/tree/main

export const COMIDAS = {
  agent: "https://example.org/agent",
} as const;

class Receiver extends TermWrapper {
	get agent() {
		return this.singularNullable(COMIDAS.agent, ValueMapping.literalToString)
	}

	set agent(value) {
		this.overwriteNullable(COMIDAS.agent, value, TermMapping.literalToString)
	}
}


// Writing out what I meant -- Rui
class Receiver extends TermWrapper {
    agent = single_rdf_value(COMIDAS.agent, ValueMapping.literalToString)
}
