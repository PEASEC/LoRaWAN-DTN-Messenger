import { ChatHistoryElement } from "./ChatHistoryElement";

//Defines Chathistory where the key is the phone number of the contact and the list of ChatHistoryElements is its chat history
export interface ChatHistoryList{
    [key: string]: ChatHistoryElement[];
}