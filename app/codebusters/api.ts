import { anyMap } from './ciphertest';

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
    isAdmin: boolean;
}

export interface StoreModelBody {
    id: string;
    type: string;
    content: string;
}

export interface CBModel {
    id: string;
    testId: string;
    sourceId: string;
    answerTemplateId: string;
    title: string;
    totalQuestions: number;
    type: string;
    createdBy: string;
}

export interface CBModelPermission {
    codeBusterModelId: string;
    username: string;
    read: boolean;
    write: boolean;
    delete: boolean;
    manage: boolean;
}

export interface CBUpdateUserPermissions {
    modelId: string;
    username: string;
    manage: boolean;
    read: boolean;
    write: boolean;
    remove: boolean;
}

export interface CBModelPermissionsResponse {
    status: string;
    permissions: [CBModelPermission];
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

    private getStoreModelUrl(): string {
        return this.baseUrl + '/api/convergence/StoreModel';
    }

    private getUpdateUserPermissions(): string {
        return this.baseUrl + '/api/convergence/UpdateUserPermissions';
    }

    public generateSpecificUserConvergenceToken(
        parameters: GenerateUserSpecificConvergenceToken
    ): Promise<any> {
        const url = this.getGenerateSpecificUserTokenUrl();

        const content = {
            ConvergenceUsername: parameters.convergenceUsername,
            ConvergencePassword: parameters.convergencePassword,
            UserID: parameters.userid,
            Email: parameters.userid,
            IsAdmin: parameters.isAdmin,
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

    public ensureUsersExist(token: string, parameters: EnsureUsersExistParameters): Promise<any> {
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
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                    Authorization: 'Bearer ' + token,
                },
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

    public updateUserPermissions(
        token: string,
        updateUserPermissions: CBUpdateUserPermissions
    ): Promise<boolean> {
        const content = {
            ModelID: updateUserPermissions.modelId,
            Username: updateUserPermissions.username,
            Manage: updateUserPermissions.manage,
            Write: updateUserPermissions.write,
            Read: updateUserPermissions.read,
            Remove: updateUserPermissions.remove,
        };

        const urlUpdatePermissions = this.getUpdateUserPermissions();
        return new Promise((resolve, reject) => {
            fetch(urlUpdatePermissions, {
                method: 'POST',
                body: JSON.stringify(content),
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                    Authorization: 'Bearer ' + token,
                },
            })
                .then((response) => {
                    if (response.ok && response.body !== null) {
                        response
                            .json()
                            .then((value) => {
                                resolve(value.result.permissionUpdated);
                            })
                            .catch((reason) => {
                                reject(reason);
                            });
                    } else if (!response.ok && response.body !== null) {
                        response
                            .text()
                            .then((value) => {
                                reject(
                                    'Response was not okay; Body contents of response: ' + value
                                );
                            })
                            .catch((reason) => {
                                reject(reason);
                            });
                    } else {
                        reject('Response was not okay and no body was found for response');
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
        }

        if (idToken === undefined || idToken === null) {
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

    public getModelContent(token: string, modelType: string, modelId: string): Promise<anyMap> {
        return new Promise((resolve, reject) => {
            const url =
                this.baseUrl + '/api/convergence/GetModelContent/' + modelType + '/' + modelId;
            fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                    Authorization: 'Bearer ' + token,
                },
            })
                .then((response) => {
                    if (response.ok && response.body !== null) {
                        response
                            .json()
                            .then((value) => {
                                resolve(JSON.parse(value.result.content) as anyMap);
                            })
                            .catch((reason) => {
                                reject(reason);
                            });
                    } else if (!response.ok && response.body !== null) {
                        response
                            .text()
                            .then((value) => {
                                reject(value);
                            })
                            .catch((reason) => {
                                reject(reason);
                            });
                    } else {
                        resolve(null);
                    }
                })
                .catch((reason) => {
                    reject(reason);
                });
        });
    }

    public getPermissionsForModel(
        token: string,
        modelId: string
    ): Promise<CBModelPermissionsResponse> {
        return new Promise((resolve, reject) => {
            const url = this.baseUrl + '/api/convergence/GetPermissionsForModel/' + modelId;
            fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                    Authorization: 'Bearer ' + token,
                },
            })
                .then((response) => {
                    if (response.ok && response.body !== null) {
                        response
                            .json()
                            .then((value) => {
                                resolve(value.result.permissionResult);
                            })
                            .catch((reason) => {
                                reject(reason);
                            });
                    } else if (!response.ok && response.body !== null) {
                        response
                            .text()
                            .then((value) => {
                                reject(value);
                            })
                            .catch((reason) => {
                                reject(reason);
                            });
                    } else {
                        resolve(null);
                    }
                })
                .catch((reason) => {
                    reject(reason);
                });
        });
    }

    public getModel(token: string, modelId: string): Promise<CBModel> {
        return new Promise((resolve, reject) => {
            const url = this.baseUrl + '/api/convergence/GetModelMetadata/' + modelId;
            fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                    Authorization: 'Bearer ' + token,
                },
            })
                .then((response) => {
                    if (response.ok && response.body !== null) {
                        response
                            .json()
                            .then((value) => {
                                resolve(value.result.model);
                            })
                            .catch((reason) => {
                                reject(reason);
                            });
                    } else if (!response.ok && response.body !== null) {
                        response
                            .text()
                            .then((value) => {
                                reject(value);
                            })
                            .catch((reason) => {
                                reject(reason);
                            });
                    } else {
                        resolve(null);
                    }
                })
                .catch((reason) => {
                    reject(reason);
                });
        });
    }

    public getModels(token: string, modelType: string): Promise<Array<CBModel>> {
        return new Promise((resolve, reject) => {
            let url = this.baseUrl + '/api/convergence/GetModels';
            if (modelType !== null) {
                url += '?modelType=' + modelType;
            }

            fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                    Authorization: 'Bearer ' + token,
                },
            })
                .then((response) => {
                    if (response.ok && response.body !== null) {
                        response
                            .json()
                            .then((value) => {
                                resolve(value.result.models);
                            })
                            .catch((reason) => {
                                reject(reason);
                            });
                    } else if (!response.ok && response.body !== null) {
                        response
                            .text()
                            .then((value) => {
                                reject(value);
                            })
                            .catch((reason) => {
                                reject(reason);
                            });
                    } else {
                        resolve([]);
                    }
                })
                .catch((reason) => {
                    reject(reason);
                });
        });
    }

    public storeModel(token: string, storeModelBody: StoreModelBody): Promise<any> {
        const content = {
            ID: storeModelBody.id,
            Type: storeModelBody.type,
            Content: storeModelBody.content,
        };

        const urlStoreModel = this.getStoreModelUrl();
        return new Promise((resolve, reject) => {
            fetch(urlStoreModel, {
                method: 'POST',
                body: JSON.stringify(content),
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                    Authorization: 'Bearer ' + token,
                },
            })
                .then((response) => {
                    if (response.ok && response.body !== null) {
                        response
                            .json()
                            .then((value) => {
                                resolve(value.result);
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
