/// <reference types="ciphertypes" />

import Mapper from "./mapper";
import mapBeaufort from "./mapBeaufort"
import mapVigenere from "./mapVigenere"
import mapVariant from "./mapVariant"
import mapGronsfeld from "./mapGronsfeld"
import mapPorta from "./mapPorta"

export default
    function mapperFactory(codevariant: string): Mapper {
    console.log(codevariant)
    switch (codevariant) {
        case 'beaufort':
            return new mapBeaufort

        case 'variant':
            return new mapVariant
            
        case 'gronsfeld':
            return new mapGronsfeld

        case 'porta':
            return new mapPorta
            
        default:
            return new mapVigenere
    }
}
