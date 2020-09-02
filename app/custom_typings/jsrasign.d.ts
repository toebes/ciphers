declare module 'jsrasign' {
    export module KJUR {
        module jws {
            module JWS {
                function readSafeJSONString(token: string): any;
                function verifyJWT(token: string, key: string, data: Object): boolean;
                function parse(jwt:any);
                function verify(jwt, key, AllowedSigningAlgs);
                function sign(algorithm: string, header: string, payload: string, privateKey: string)
           }

           module IntDate {
               function get(property: string)
           }
        }
    }
  }