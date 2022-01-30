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
const MODEL_ENDPOINT = "/model"

const HEADER_NAME_API_VERSION = "Api-Version";
const HEADER_API_VERSION_VALUE = "v1";

const HTTP_GET = "GET";
const ERROR_MESSAGE_UNKNOWN = "An unknown error has occurred.";

export class AzureAPI {
    /**
     * Takes the endpoint provided and appends to the end of the AZURE_API_BASE_URL constant.
     * The constant does not end with a "/".
     * @param endpoint Endpoint for the request
     * @returns The AZURE_API_BASE_URL with the appended endpoint given.
     */
    private static getCompleteUrl(endpoint: string) {
        return AZURE_API_BASE_URL + "/" + endpoint;
    }

    /**
     * Appends the model id provided to the end of the MODEL_ENDPOINT constant.
     * @param modelId Specific model's id
     * @returns A base model endpoint of the MODEL_ENDPOINT constant and the appended model id path
     */
    private static getBaseModelEndpoint(modelId: string) {
        return MODEL_ENDPOINT + "/" + modelId;
    }

    /**
     * Processes an API request to our APIM instance.
     * Adds version header/value to target when performing the request.
     * @param httpMethod The HTTP method to perform (Such as GET, POST, PUT, etc)
     * @param endpoint The endpoint appended to the base url
     * @param headers Any custom headers that need to be present (If null creates empty Headers object)
     * @returns A promise with the result being the parsed JSON body from the request.
     */
    private static performRequest(httpMethod: string, endpoint: string, headers: Headers = new Headers()): Promise<any> {
        // Without the Api-Version header, all requests would return a 404.
        headers.append(HEADER_NAME_API_VERSION, HEADER_API_VERSION_VALUE);

        const url = this.getCompleteUrl(endpoint);
        return new Promise((resolve, reject) => {
            fetch(url, {
                method: httpMethod,
                headers: headers
            }).then((response) => {
                response.json().then(json => {
                    if (response.ok) {
                        resolve(json);
                    } else {
                        reject(json.error ?? ERROR_MESSAGE_UNKNOWN);
                    }
                }).catch(error => {
                    reject(error);
                });
            }).catch((reason) => {
                reject(reason);
            });
        });
    }

    public static getImagesForModel(modelId: string): Promise<ImageInformation[]> {
        const endpoint = this.getBaseModelEndpoint(modelId) + "/images";
        return new Promise((resolve, reject) => {
            this.performRequest(HTTP_GET, endpoint).then(response => {
                // TODO: Parse the response into JSON elements of the image information
            }).catch(reason => {
                reject(reason);
            });
        });
    }

    public static getImageUploadToken(modelId: string, uploaderUsername: string): Promise<TokenInformation> {
        const endpoint = this.getBaseModelEndpoint(modelId) + "/image/token";
        return new Promise((resolve, reject) => {
            this.performRequest(HTTP_GET, endpoint).then(response => {
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