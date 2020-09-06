import Convergence, { ConvergenceDomain, LogLevel } from '@convergence/convergence';
import { KJUR } from 'jsrsasign';

export interface ConvergenceLoginParameters {
    username: string;
    firstName: string;
    lastName: string;
    displayName?: string;
    emailAddress?: string;
}

export interface ConvergenceSettings {
    baseUrl: string;
    namespace: string;
    domain: string;
    keyId: string;
    privateKey: string;
}

export class ConvergenceAuthentication {
    private static readonly ALG_RS256 = 'RS256';
    private static readonly JWT_ISSUER = 'Codebusters';
    private static readonly JWT_AUDIENCE = 'Convergence';

    // Yes we know putting the key here is insecure, but it is going to be
    // revoked as soon as we are finished testing.
    private static readonly TESTING_KEY_ID_PRIVATE_KEY =
        `-----BEGIN RSA PRIVATE KEY-----
  MIIEpAIBAAKCAQEAhx0FDPxUQzyoDuHafI28aj2p/bMll63xxMdQYFkw/AE33nQ4
  zdn0H4soObDIq+AAurwtYZMDx/eUS563HHBQij1THP9XymjL7QDcRgJOlsm/HlGg
  f6U3B4cmQGHpky2szISvHcnMkpQblrpSSmc50jNpg4bmhyNi0R2wOdwTauIhMVRc
  066nS1zbCrgPGVUhIO09XxzBxqTBRqtIjtq6ZfTyZKScBvp1xwUtuNifP+e57xht
  nIHI+hK9N7pYIqr6aGM7CxM2V5Sb2GraqfM9ISJ2kiMHanj/HtKBnxZIgqFk1aS/
  z6ovB5So2s9t7r2PYq9sYuepOPM6ZMRZjwSk9QIDAQABAoIBAHpup3b+53QN8NOb
  gRpAbS1wNyu3PCdX7a68VW8ZIzQX/oJLmnWePIKg3JB6SzzDvKV5gz3ZtCFtjSmA
  5riUZcb+juPF1c2KbM+UagXebUxiABb/LIq+MUFXDChnEPrW9rBUw0Ig7IkeQGmy
  6IKXS2PYRpJymU53mEGZv2iOreG5OU+UQz+eIGSya/5uVe8kt2dtKnc3GGfodOxf
  RRiCI6J+VrUZ/ikskJcBHNRWd5moEv+RtOQQIXhKk4tnFl/TSmyzHag5swLJvX6K
  NIgLUvPh3bVMsNBG4DPyM213y5qkWu6u1QeJDUrHt7u3RMlEt2WPMEi0tnRydXOP
  IEjW/rkCgYEAxkPamXuAyQyitObXuSd1Ivtr3U7oIyJ+2H+1E4IpBCBUc5aLHjoT
  VhdsFIpajbzWUPwtE4GnehAig6nWgO8O2v+F+PDC6op+fOZCeCTqG/++Z+h0CezQ
  9hD/3Ji3RtHh7dPJQLSRBRBger0ZMOPzTmK/apBlrbp2uXsDB6oR9/cCgYEArnVe
  2gLUExVBASQvbagHS8zfjsGLWHmAi06qDiZqZNJFQ/K2WvJwHxNeNr0azwNrKFco
  wLPUT0Yr8D7GnVAAiXRx7UcxED/5XeQHP2CKjU7+0OkB18ja3+iKnTuAIne71BKR
  J25+ipIp1QGMriwFCp0fkHdqqilyrOiqleSJh3MCgYEAgj1SnR43JFrriyBVN2jH
  FtrIKZHLBkGDx95kadNH9FD0iRWsf4ew6g3qzrdv8snIk1yEk9rI1HNC6PCpWvsu
  7AeMz1IBCKc/nfZ4VYoSS6A9SO63Q0nQnsPd/+BGDPyUiHFmM94poYT3i8kqgiZL
  zwMpMOx4Dp59nSxEekVrFlMCgYBsaMkhZoKMvTdg0zCZzsGB6/S8DC9gMlibuK1a
  D6srrbKXL7r7tw3PccSo9Ug0feZX8hmD7fuvq2Zga1IWrYE36WFmVkf51hdKrgmG
  66INf5o/DZw0kD7axvFkFXZhdNAGT+ddfn8p8vwFvmnCTd5wIwVbS6m/xfPZ2Ncw
  QAzqWwKBgQCvW2dGM98mgrsFVaJSjdT+zTwjbbojtS2CMWpfddLRy+arwu8TzsYa
  +VTjDB+VvB/qZtLAiVwwLx/rqc9l7RA3Xth0oid/5mqpoBpEydN1GvFuqz4p7jue
  sSRrkGTbVtr3OlrTfk3k3YZdjSjlvqb2GWHbzU7bkomLdIsG0Xx3Xg==
  -----END RSA PRIVATE KEY-----`;

    private static formatConnectUrl(baseUrl: string, namespace: string, domain: string) {
        return baseUrl + '/api/realtime/' + namespace + '/' + domain;
    }

    public static getLocalPrivateKey(): string {
        return this.TESTING_KEY_ID_PRIVATE_KEY;
    }

    public static connect(settings: ConvergenceSettings, loginParameters: ConvergenceLoginParameters): Promise<ConvergenceDomain> {
        const connectUrl = this.formatConnectUrl(settings.baseUrl, settings.namespace, settings.domain);

        const tNow = KJUR.jws.IntDate.get('now');
        const tEnd = KJUR.jws.IntDate.get('now + 1hour');

        let emailAddress = loginParameters.emailAddress
        if (emailAddress === undefined || emailAddress == null) {
            emailAddress = loginParameters.username;
        }

        let displayName = loginParameters.displayName
        if (displayName === undefined || displayName == null) {
            displayName = loginParameters.firstName + ' ' + loginParameters.lastName;
        }

        var header = { alg: this.ALG_RS256, typ: 'JWT', kid: settings.keyId }
        var payload = {
            iss: this.JWT_ISSUER,
            sub: loginParameters.username,
            nbf: tNow,
            iat: tNow,
            exp: tEnd,
            aud: this.JWT_AUDIENCE,
            firstName: loginParameters.firstName,
            lastName: loginParameters.lastName,
            displayName: displayName,
            email: emailAddress
        };

        const stringHeader = JSON.stringify(header);
        const stringPayload = JSON.stringify(payload);
        const signedJWT = KJUR.jws.JWS.sign(this.ALG_RS256, stringHeader, stringPayload, settings.privateKey);
        // Convergence.configureLogging({
        //     root: LogLevel.DEBUG,
        //     loggers: {
        //         "protocol.ping": LogLevel.SILENT
        //     }
        // });

        return Convergence.connectWithJwt(connectUrl, signedJWT);
        // return Convergence.connectAnonymously(connectUrl);
    }
}
