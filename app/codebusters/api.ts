export interface GetConvergenceTokenParameters {
    googleIdToken: string;
}

export interface EnsureUsersExistParameters {
    convergenceNamespace: string;
    convergenceDomainID: string;
    usernames: string[];
}

export class API {
    baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private getGoogleSignInUrl(): string {
        return this.baseUrl + '/api/authentication/GoogleSignIn/';
    }

    private getEnsureUsersExistUrl(): string {
        return this.baseUrl + '/api/convergence/EnsureUsersExist';
    }

    public ensureUsersExist(parameters: EnsureUsersExistParameters): Promise<any> {
        const url = this.getEnsureUsersExistUrl();

        const content = new Map<string, any>();
        content.set('ConvergenceNamespace', parameters.convergenceNamespace);
        content.set('ConvergenceDomain', parameters.convergenceDomainID);
        content.set('Usernames', parameters.usernames);

        return new Promise((resolve, reject) => {
            fetch(url, {
                method: 'POST',
                body: JSON.stringify(content),
                headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            })
                .then((response) => {
                    if (response.ok && response.body !== null) {
                        response
                            .json()
                            .then((value) => {
                                resolve(value);
                            })
                            .catch((reason) => {
                                reject(reason);
                            });
                    } else if (!response.ok && response.body !== null) {
                        response
                            .text()
                            .then((value) => {
                                resolve(
                                    'Response was not okay; Body contents of response: ' + value
                                );
                            })
                            .catch((reason) => {
                                reject(reason);
                            });
                    } else {
                        resolve('Response was not okay and no body was found for response');
                    }
                })
                .catch((reason) => {
                    reject(reason);
                });
        });
    }

    public getConvergenceToken(parameters: GetConvergenceTokenParameters): Promise<any> {
        const googleSignInUrl = this.getGoogleSignInUrl();

        const content = new Map<string, string>();
        content.set('IDToken', parameters.googleIdToken);

        return new Promise((resolve, reject) => {
            fetch(googleSignInUrl, {
                method: 'POST',
                body: JSON.stringify(content),
                headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            })
                .then((response) => {
                    if (response.ok && response.body !== null) {
                        response
                            .json()
                            .then((value) => {
                                resolve(value);
                            })
                            .catch((reason) => {
                                reject(reason);
                            });
                    } else if (!response.ok && response.body !== null) {
                        response
                            .text()
                            .then((value) => {
                                resolve(
                                    'Response was not okay; Body contents of response: ' + value
                                );
                            })
                            .catch((reason) => {
                                reject(reason);
                            });
                    } else {
                        resolve('Response was not okay and no body was found for response');
                    }
                })
                .catch((reason) => {
                    reject(reason);
                });
        });
    }
}
