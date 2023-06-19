import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { AppMessage } from '../appMessage';

@Injectable({
  providedIn: 'root'
})
export class NetworkDataTransferService {
  private messageReadyForUI = new Subject<AppMessage>();
  private connectionLog = new Subject<string>();
  private connectionStatus = new Subject<boolean>();
  private messageIsSendToNetwork = new Subject<{phoneNumber: string, index: number}>();
  private serverAddress: string = "";
  private devicePhoneNumber: string = "";
  private devicePhoneNumberCRC32: string = "";
  socket: WebSocket | undefined;
  private connectionID: number = 0;
  private messageBuffer: {msg: AppMessage, chatHistoryIndexOfMessage: number}[] = [];

  //flag if reconnectig Process is started
  //don't push messages in the connection log to avoid spam during reconnection
  private reconnectingStarted: boolean = false;

  //flag to indicate if the App was manually signed off from the server, no reconnection will be tried if true
  private signedOffFromServer: boolean = true;
  
  connectionLog$ = this.connectionLog.asObservable();
  connectionStatus$ = this.connectionStatus.asObservable();
  messageReadyForUI$ = this.messageReadyForUI.asObservable();
  messageIsSendToNetwork$ = this.messageIsSendToNetwork.asObservable();


  constructor() { }

  /**
   * Connect through the websocket server to the LoRa Network.
   */
  connectToServer(): void{
    if(this.serverAddress != ""){
      //check if a websocket is already open
      if(this.socket != undefined && this.socket.readyState != this.socket.CLOSED){
        this.socket.close();
      }
      try{
        //set unique connection ID to differentiate between connections
        let cid: number = this.connectionID;
        //don't track automatic reconnection attempts
        if(!this.reconnectingStarted){
          this.connectionID = this.connectionID + 1;
        }

        //save current server address for connection log
        const serverAdr: string = this.serverAddress;

        this.socket = new WebSocket("ws://" + serverAdr + "/ws");

        //don't write automatic reconnection attempts to the connection log
        if(!this.reconnectingStarted){
          this.connectionLog.next("CID: "+ cid + " - " + serverAdr + ": Verbindung wird aufgebaut");
        }
        let _this = this;       

        this.socket.onopen = function(event) {
          //don't write automatic reconnection attempts to the connection log
          if(!_this.reconnectingStarted){
            _this.connectionLog.next("CID: "+ cid + " - " + serverAdr + ": Verbindung erfolgreich");
          }
          //no longer signed off from a server
          _this.signedOffFromServer = false;

          //set connection status for UI status bar
          _this.connectionStatus.next(true);

          //empty message buffer after successfull connection to websocket server
          _this.emptyMessageBuffer();
        }

        this.socket.onclose = function(event) {
          //don't write automatic reconnection attempts to the connection log
          if(!_this.reconnectingStarted){
            _this.connectionLog.next("CID: "+ cid + " - " + serverAdr + ": Verbindung geschlossen, Code: " + event.code);
          }

          //check if Websocket Connection is really closed or another was opened in the meantime 
          if(_this.socket?.readyState == _this.socket?.CLOSED){
            //set connection status for UI status bar
            _this.connectionStatus.next(false);
            //try to reconnect
          _this.tryToReconnectAtRegularIntervalls();
          }
        }

        this.socket.onerror = function(event) {
          //don't write automatic reconnection attempts to the connection log
          if(!_this.reconnectingStarted){
            _this.connectionLog.next("CID: "+ cid + " - " + serverAdr + ": Verbindungsfehler");
          }
        }
        
        this.socket.onmessage = function(event) {
          //only process messages that are JSON parsable
          try {
            const data = JSON.parse(event.data);
            _this.processIncommingMessage(data);
          } catch {
          }          
        }
      }catch (e){
        //don't write automatic reconnection attempts to the connection log
        if(!this.reconnectingStarted){
          this.connectionLog.next(this.serverAddress + ": Server nicht erreichbar");
        }
      }
    }else{
      //don't write automatic reconnection attempts to the connection log
      if(!this.reconnectingStarted){
        this.connectionLog.next("Keine Server Adresse hinterlegt");
      }
    }
  }

  /**
   * Disconnect from LoRa Network.
   * Removes current phone number on backend and closes websocket connection.
   */
  disconnect(): void{
    if(this.socket != undefined){
      if(this.devicePhoneNumber != ""){
        this.removeTelephoneNumberFromBackend(this.devicePhoneNumber);
      }
      this.socket.close();
      const cid: number = this.connectionID - 1;
      this.connectionLog.next("CID: "+ cid + " - " + this.serverAddress + ": Verbindung wird getrennt");
    }
    //set flag that App is signed off
    this.signedOffFromServer = true;
  }

  /**
   * Tries to reastablish a connection to the server after the connection was closed at regular intervals
   * Only executed if the disconnect was caused by a network error and not if the user signed off manually from the settings modal
   */
  tryToReconnectAtRegularIntervalls(){
    //check if the reconnection process was already started, so not several processes are started in parallel
    //Also check if a serverAddress is set and the socket is really closed
    if(this.serverAddress != "" && this.reconnectingStarted == false && this.signedOffFromServer == false && this.socket != undefined && this.socket.readyState == this.socket.CLOSED){
      const intveralID = setInterval(() => {
        //try to reconnect as long the socket is still closed
        if(this.socket != undefined && this.socket.readyState == this.socket.CLOSED){
          this.reconnectingStarted = true;
          this.connectToServer();
        }else{
          //if socket could be opened, stop the reconnecting process
          clearInterval(intveralID);
          this.reconnectingStarted = false;
        }
      }, 10000);
    }
  }

  /**
   * Convert BP7 Protocol message into AppMessage format and send it to the UI for display
   * @param data message in BP7 format
   */
  processIncommingMessage(data: string): void{
    const payload: string = data[1][4];

    //convert array of char codes from payload into a string
    let content: string = "";
    const payloadLength: number = payload.length;
    for (let i: number = 0; i < payloadLength; i++){
      const charCode: number = Number(payload[i]);
      //only char codes of 8-Bit are supported
      if (charCode <= 255){
        content += String.fromCharCode(charCode);
      }
    }

    //read destination, source and timestamp from the BP7 message
    let destination = data[0][3][1];    
    let source = data[0][4][1];
    const timestamp = Number(data[0][6][0]);

    //convert to processable format
    destination = destination.substring(2, destination.length - 1);
    source = source.substring(2, source.length - 1);

    //create AppMessage
    const msg: AppMessage = {
      source: source,
      destination: destination,
      timestamp: timestamp,
      content: content
    }

    //check if the reciptant of the message equals this device's phone number
    if(msg.destination == this.devicePhoneNumberCRC32){
      //send message to UI for display
      this.sendMessageToUI(msg);
    }
  }

  /**
   * Convert AppMessage into BP7 format and send it into the LoRa network
   * @param data message that should be send
   * @param chatHistoryIndex index of the message in the ChatHistoryList, is used to flag the message as isSend. Set to -1 if not needed.
   * @returns message in BP7 format, only necessary for testing purposes, ignore otherwise
   */
  processOutgoingMessage(data: AppMessage, chatHistoryIndex: number): string{
    //check if a websocket server connection is available
    if(this.socket != undefined && this.socket.readyState == this.socket.OPEN){

      //set time to live for the message
      const ttl = 60 * 60 * 1000; // 1h = 60 (minutes) * 60 (seconds) * 1000 (milli-seconds)

      //convert string from AppMessage content to array of char codes for BP7 message
      let payload: number[] = []
      const messageLength: number = data.content.length;
      for(let i: number = 0; i < messageLength; i++){
        const charCode: number = data.content.charCodeAt(i);
        if(charCode <= 255){
          payload.push(charCode);
        }
      }

      //create BP7 message
      const msgBP7: (number | (string | number)[])[][] = [
        [
          7,
          0,
          0,
          [1, "//" + data.destination + "/LoRaEmergency"],
          [1, "//" + data.source + "/LoRaEmergency"],
          [1, "//" + data.source + "/LoRaEmergency"],
          [data.timestamp, 0],
          ttl,
        ],
        [1, 1, 0, 0, payload]
      ];    
      const msgBP7String = JSON.stringify(msgBP7);

      //send message to the Websocket server
      this.socket.send(msgBP7String);

      //set message status as send on the UI
      if(chatHistoryIndex >= 0){
        this.messageIsSendToNetwork.next({phoneNumber: data.destination, index: chatHistoryIndex});
      }

      //return plain string if needed for testing
      return msgBP7String;
      
    } else {
      //if websocket server is unavailable, buffer send message 
      this.messageBuffer.push({msg: data, chatHistoryIndexOfMessage: chatHistoryIndex});

      return "";
    }
  }

  /**
   * Send all elements inside messageBuffer into the LoRa network
   */
  emptyMessageBuffer(): void{
    const messageBufferLength: number = this.messageBuffer.length;
    for(let i: number = 0; i < messageBufferLength; i++){
      const bufferedMessage: {msg: AppMessage, chatHistoryIndexOfMessage: number} | undefined = this.messageBuffer.pop();
      if(bufferedMessage != undefined){
        this.processOutgoingMessage(bufferedMessage.msg, bufferedMessage.chatHistoryIndexOfMessage);
      }
    }
  }

  /**
   * Add telephone number to the Backend so the Backend knows that it is available on that node
   * @param phoneNumber phone number in plain format that should be added to the backend
   */
  addTelephoneNumberToBackend(phoneNumber: string): void{

    //check if websocket connection exists
    if(this.socket == undefined || this.socket.readyState == this.socket.CLOSED){
      return;
    }

    //create the following curl instruction:
    //curl -X POST -H 'Content-Type: application/json' -d '{"end_devices": ["1","2","3","4"]}' serverAddress/api/end_devices
    const opts = {
      headers: {
        mode: "cors",
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({end_devices: [phoneNumber]}),
    };

    //send the curl instruction to add the address on the backend
    fetch("http://" + this.serverAddress + "/api/end_devices", opts);
  
  }

  /**
   * Removes the telephone number from the Backend so the Backend knows it is no longer available on that node
   * @param phoneNumber phone number in plain format that should be removed from the backend
   */
  removeTelephoneNumberFromBackend(phoneNumber: string): void{

    //check if websocket connection exists
    if(this.socket == undefined || this.socket.readyState == this.socket.CLOSED){
      return;
    }

    //create the following curl instruction:
    //curl -X DELETE -H 'Content-Type: application/json' -d '{"end_devices": ["1","2","3","4"]}' serverAddress/api/end_devices
    const opts = {
      headers: {
        mode: "cors",
        "Content-Type": "application/json",
      },
      method: "DELETE",
      body: JSON.stringify({end_devices: [phoneNumber]}),
    };

    //send the curl instruction to remove the address on the backend
    fetch("http://" + this.serverAddress + "/api/end_devices", opts);

  }

  /**
   * Get the current address list from the Backend
   * @returns list of phone numbers in plain format
   */
  async getAddressesFromBackend(): Promise<string[]> {
    const opts = {
      headers: {
        mode: "cors",
      },
    };

    let addresses: string[] = [];
  
    await fetch("http://" + this.serverAddress + "/api/end_devices", opts)
      .then((res) => res.json())
      .then((res) => {
        addresses = res.end_devices;
      });

    return addresses;
  
  }

  /**
   * Recieves a message from the UI that should be send to the LoRa Network
   * @param msg message that should be send
   * @param chatHistoryIndex index of the message in the ChatHistoryList, is used to flag the message as isSend. Set to -1 if not needed.
   */
  recieveMessageFromUI(msg: AppMessage, chatHistoryIndex: number): void{
    this.processOutgoingMessage(msg, chatHistoryIndex);
  }

  /**
   * Send message to UI for display
   * @param msg message that is to be displayed in the UI
   */
  sendMessageToUI(msg: AppMessage): void{
    this.messageReadyForUI.next(msg);
  }

  /**
   * Set the server address for the websocket server
   * @param adr server address including port number
   */
  setServerAddress(adr: string): void{
    this.serverAddress = adr;
  }

  /**
   * Set the phone number of the current device for network operations
   * @param phoneNumber phone number in plain format
   * @param phoneNumberCRC32 phone number in CRC32 format
   */
  setDevicePhoneNumber(phoneNumber: string, phoneNumberCRC32: string): void{
    //Check if a phone number was set previously
    if(this.devicePhoneNumber == ""){
      this.addTelephoneNumberToBackend(phoneNumber);
    } else {
      //if a number was set previously, then remove old number from backend first
      this.removeTelephoneNumberFromBackend(this.devicePhoneNumber);
      this.addTelephoneNumberToBackend(phoneNumber);
    }
    this.devicePhoneNumber = phoneNumber;
    this.devicePhoneNumberCRC32 = phoneNumberCRC32;
  }

  /**
   * Retrieves the current content of the message buffer for to be send messages
   * @returns message buffer
   */
  getMessageBuffer(): {msg: AppMessage, chatHistoryIndexOfMessage: number}[]{
    return this.messageBuffer;
  }

}
