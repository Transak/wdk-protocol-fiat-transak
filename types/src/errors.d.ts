export class TransakApiError extends Error {
    /**
     * Create a new Transak API error. Thrown when a request to a Transak API
     * endpoint fails or returns an unexpected response.
     *
     * @param {string} message - The error's message.
     */
    constructor(message: string);
}
