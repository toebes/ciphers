export interface GetConvergenceTokenParameters {
    googleIdToken?: string;
    microsoftIdToken?: string;
}

export interface EnsureUsersExistParameters {
    convergenceNamespace: string;
    convergenceDomainID: string;
    usernames: string[];
}

export interface GenerateUserSpecificConvergenceToken {
    convergenceUsername: string;
    convergencePassword: string;
    userid: string;
}

export class API {
    baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private getGoogleSignInUrl(): string {
        return this.baseUrl + '/api/authentication/GoogleSignIn/';
    }

    private getMicrosoftSignInUrl(): string {
        return this.baseUrl + '/api/authentication/MicrosoftSignIn/';
    }

    private getEnsureUsersExistUrl(): string {
        return this.baseUrl + '/api/convergence/EnsureUsersExist';
    }

    private getGenerateSpecificUserTokenUrl(): string {
        return this.baseUrl + '/api/convergence/GenerateToken';
    }

    public generateSpecificUserConvergenceToken(
        parameters: GenerateUserSpecificConvergenceToken
    ): Promise<any> {
        const url = this.getGenerateSpecificUserTokenUrl();

        const content = {
            ConvergenceUsername: parameters.convergenceUsername,
            ConvergencePassword: parameters.convergencePassword,
            UserID: parameters.userid,
        };

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

    public ensureUsersExist(parameters: EnsureUsersExistParameters): Promise<any> {
        const url = this.getEnsureUsersExistUrl();

        const content = {
            ConvergenceNamespace: parameters.convergenceNamespace,
            ConvergenceDomain: parameters.convergenceDomainID,
            Usernames: parameters.usernames,
        };

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
        if (parameters.googleIdToken === undefined && parameters.microsoftIdToken === undefined) {
            return Promise.reject(
                'No token was passed to parameters for GetConvergenceTokenParameters'
            );
        }

        let signInUrl = this.getGoogleSignInUrl();
        let idToken = parameters.googleIdToken;
        if ((idToken === undefined || idToken === null) && parameters.microsoftIdToken !== null) {
            idToken = parameters.microsoftIdToken;
            signInUrl = this.getMicrosoftSignInUrl();
        } else {
            return Promise.reject(
                'A parameter was passed to GetConvergenceTokenParameters but was null'
            );
        }

        const content = {
            IDToken: idToken,
        };

        return new Promise((resolve, reject) => {
            fetch(signInUrl, {
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
