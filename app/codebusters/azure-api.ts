import { int } from "qr-code-generator";

export interface ImageInformation {
    /** location of the image */
    uri: string;
    /** username of the user who uploaded the image */
    uploaderUsername: string;
}

export interface TokenInformation {
    /** token used to upload images for a specific model */
    token: string;
    /** model id associated with the token */
    modelId: string;
}

export interface ImageUploadResponse {
    /** number of images successfully uploaded */
    filesUploaded: int;
}

const AZURE_API_BASE_URL = "https://codebusters.azure-api.net/api";
const AZURE_API_BASE_MODEL_URL = AZURE_API_BASE_URL + "/model"

export class AzureAPI {
    private static getBaseModelUrl(modelId: string) {
        return AZURE_API_BASE_MODEL_URL + "/" + modelId;
    }

    private static performRequest(httpMethod: string, url: string, headers: Headers = new Headers()): Promise<Response> {
        // Without the Api-Version header, all requests would return a 404.
        headers.append("Api-Version", "v1");

        return new Promise((resolve, reject) => {
            fetch(url, {
                method: httpMethod,
                headers: headers
            }).then((response) => {
                if (response.ok && response.body !== null) {
                    resolve(response);
                } else {
                    if (response.body !== null) {
                        // TODO: The message will be in the "error" element. 
                        // TODO: Pass back this or an undefined error message.
                    } else {
                        reject("An unknown error has occurred.")
                    }
                }
            }).catch((reason) => {
                reject(reason);
            });
        });
    }

    public static getImagesForModel(modelId: string): Promise<ImageInformation[]> {
        const url = this.getBaseModelUrl(modelId) + "/images";
        return new Promise((resolve, reject) => {
            this.performRequest('GET', url).then(response => {
                // TODO: Parse the response into JSON elements of the image information
            }).catch(reason => {
                reject(reason);
            });
        });
    }

    public static getImageUploadToken(modelId: string, uploaderUsername: string): Promise<TokenInformation> {
        const url = this.getBaseModelUrl(modelId) + "/image/token";
        return new Promise((resolve, reject) => {
            this.performRequest('GET', url).then(response => {
                // TODO: Parse the response into JSON elements of the token information
            }).catch(reason => {
                reject(reason);
            });
        });
    }

    public static uploadImagesForModel(modelId: string, token: string): Promise<ImageUploadResponse> {
        return null;
    }
}