/// <reference types="ciphertypes" />

import Mapper from "./mapper";
import mapBeaufort from "./mapBeaufort"
import mapVigenere from "./mapVigenere"
import mapVariant from "./mapVariant"

export default
    function mapperFactory(codevariant: string): Mapper {
    console.log(codevariant)
    switch (codevariant) {
        case 'beaufort':
            return new mapBeaufort

        case 'variant':
            return new mapVariant
            
        default:
            return new mapVigenere
    }
}
