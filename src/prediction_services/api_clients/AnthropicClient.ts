import {ApiClient, ChatMessage, ModelOptions} from "../types";

import {Settings} from "../../settings/versions";
import {Result} from "neverthrow";
import {makeAPIRequest} from "./utils";

class AnthropicApiClient implements ApiClient {
    private readonly apiKey: string;
    private readonly url: string;
    private readonly modelOptions: Omit<ModelOptions, "frequency_penalty" | "presence_penalty">;
    private readonly model: string;

    static fromSettings(settings: Settings): AnthropicApiClient {
        return new AnthropicApiClient(
            settings.anthropicApiSettings.key,
            settings.anthropicApiSettings.url,
            settings.anthropicApiSettings.model,
            settings.modelOptions
        );
    }

    constructor(
        apiKey: string,
        url: string,
        model: string,
        modelOptions: ModelOptions
    ) {
        this.apiKey = apiKey;
        this.url = url;
        const { frequency_penalty, presence_penalty, ...modelOptionsWithoutPenalties } = modelOptions;
        this.modelOptions = modelOptionsWithoutPenalties;
        this.model = model;
    }

    async queryChatModel(messages: ChatMessage[]): Promise<Result<string, Error>> {
        const headers = {
            "content-type": "application/json",
            "anthropic-version": "2023-06-01",
            "x-api-key": this.apiKey,
        };
        const body = {
            messages,
            model: this.model,
            ...this.modelOptions,
        }

        const data = await makeAPIRequest(this.url, "POST", body, headers);
        return data.map((data) => data.content[0].text);
    }

    async checkIfConfiguredCorrectly(): Promise<string[]> {
        const errors: string[] = [];
        if (!this.apiKey) {
            errors.push("Anthropic API key is not set");
        }
        if (!this.url) {
            errors.push("Anthropic API url is not set");
        }
        if (errors.length > 0) {
            // api check is not possible without passing previous checks so return early
            return errors;
        }
        const result = await this.queryChatModel([
            {content: "Say hello world and nothing else.", role: "user"},
        ]);

        if (result.isErr()) {
            errors.push(result.error.message);
        }
        return errors;
    }
}

export default AnthropicApiClient;
