//defines standard Interface for Messages
export interface AppMessage{
    source: string;
    destination: string;
    timestamp: number;
    content: string;
}