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

        messages.forEach(message => {
            if (message.role === "system") {
                message.role = "user";
            }
        });

        for (let i = 0; i < messages.length - 1; i++) {
            // Check for consecutive messages with the same role
            if (messages[i].role === messages[i + 1].role) {
                const newMessage: ChatMessage = {
                    content: "Thanks.",  // Or any default content you wish to add
                    role: messages[i].role === "user" ? "assistant" : "user"
                };
                messages.splice(i + 1, 0, newMessage);  // Inject the opposite role message
                i++;  // Skip the newly added message to avoid immediate re-evaluation
            }
        }

        // Handle the case where the last message might need an alternation
        if (messages.length > 1 && messages[messages.length - 1].role === messages[messages.length - 2].role) {
            const newMessage: ChatMessage = {
                content: "Automated response",
                role: messages[messages.length - 1].role === "user" ? "assistant" : "user"
            };
            messages.push(newMessage);
        }

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
