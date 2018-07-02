import Mapper from "./mapper";
import mapBeaufort from "./mapBeaufort"
import mapVigenere from "./mapVigenere"
import mapVariant from "./mapVariant"
import mapGronsfeld from "./mapGronsfeld"
import mapPorta from "./mapPorta"
import { ICipherType }  from "./ciphertypes"


export default
    function mapperFactory(codevariant: ICipherType): Mapper {
    console.log(codevariant)
    switch (codevariant) {
        case ICipherType.Beaufort:
            return new mapBeaufort

        case ICipherType.Variant:
            return new mapVariant
            
        case ICipherType.Gronsfeld:
            return new mapGronsfeld

        case ICipherType.Porta:
            return new mapPorta
            
        default:
            return new mapVigenere
    }
}
