import { AppMessage } from "src/app/appMessage";

/**
 * Defines if a message was send from the App or recieved from another App
 */
export enum messageTag {
    SEND = 0,
    RECIEVED = 1
}

/**
 * Represents a single element in the chat history list
 */
export interface ChatHistoryElement{
    message: AppMessage,
    messageTag: messageTag,
    messageIsSend: boolean, // Defines if a send message was send into the network or is currently in the messagebuffer, irrelevant for recieved messages
    messageContainsCoordinates: boolean, // Defines if Geo Coordinates were found in the message Text
    messageCoordinatesOpenStreetMapLink: string | undefined, //If coordinates were found, define the openstreetmap link
}