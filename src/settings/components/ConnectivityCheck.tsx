import * as React from "react";
import SettingsItem from "./SettingsItem";
import { useState } from "react";
import { Notice } from "obsidian";
import { Settings } from "../settings";
import AzureOAIClient from "../../prediction_services/api_clients/AzureOAIClient";
import OpenAIApiClient from "../../prediction_services/api_clients/OpenAIApiClient";

interface IProps {
    settings: Settings;
}

enum Status {
    NotStarted,
    Loading,
    Success,
    Failure,
}

export default function ConnectivityCheck(props: IProps): React.JSX.Element {
    const [status, setStatus] = useState<Status>(Status.NotStarted);

    React.useEffect(() => {
        setStatus(Status.NotStarted);
    }, [props.settings]);

    const createClient = () => {
        if (props.settings.apiProvider === "azure") {
            return AzureOAIClient.fromSettings(props.settings);
        }
        if (props.settings.apiProvider === "openai") {
            return OpenAIApiClient.fromSettings(props.settings);
        }
        throw new Error("Unknown API Provider");
    };

    const onClickConnectionButton = async () => {
        if (status === Status.Loading) {
            return;
        }

        setStatus(Status.Loading);


        const client = createClient();
        const isWorking = await client.isConfiguredCorrectly();
        if (!isWorking) {
            new Notice(
                `Cannot connect to the ${props.settings.apiProvider} API. Please check your settings.`
            );
            setStatus(Status.Failure);
            return;
        }

        new Notice(
            `Successfully connected to the ${props.settings.apiProvider} API.`
        );
        setStatus(Status.Success);
    };

    const ProgressFeedback = () => {
        if (status === Status.Loading) {
            return <span className="loader" />;
        }
        if (status === Status.Success) {
            return (
                <span className={"loaderPlaceholder"}>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="100%"
                        height="100%"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#00b344"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-check"
                    >
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                </span>
            );
        }
        if (status === Status.Failure) {
            return (
                <span className={"loaderPlaceholder"}>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#ff0000"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-x"
                    >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                    </svg>
                </span>
            );
        }

        return <span className={"loaderPlaceholder"} />;
    };

    return (
        <SettingsItem
            name={"Test Connection"}
            description={
                "Want to test if you configured the API correctly? Click the button below to test the connection."
            }
        >
            {ProgressFeedback()}
            <button
                aria-label="Test Connection"
                onClick={onClickConnectionButton}
                disabled={status === Status.Loading}
            >
                Test Connection
            </button>
        </SettingsItem>
    );
}
