import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { NetworkDataTransferService } from './lo-ra/network-data-transfer.service';
import { AppMessage } from './appMessage';
import { AppContactsService } from './app-contacts.service';
import { appContact } from './appContact';
import { Geolocation, Position } from '@capacitor/geolocation';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class NetworkUiInterfaceService {

  private devicePhoneNumber: string = "-1";
  private devicePhoneNumberCRC32: string = "-1";
  private targetContact: appContact | undefined;
  private isMobile: boolean = false;
  private chatHistoryLength: {[key: string]: number} = {};

  private messageRecieved = new Subject<AppMessage>();
  private connectionLog = new Subject<string>();
  private connectionStatus = new Subject<boolean>();
  private selectedContact = new Subject<appContact | undefined>();
  private clearChatHistoryContact = new Subject<appContact>();
  private unreadMessageForContact = new Subject<string>();
  private transferChatHistoryContact = new Subject<{source: string, destination: string}>();
  private setMessageIsSendOnUI = new Subject<{phoneNumber: string, index: number}>();

  messageRecieved$ = this.messageRecieved.asObservable();
  connectionLog$ = this.connectionLog.asObservable();
  connectionStatus$ = this.connectionStatus.asObservable();
  selectedContact$ = this.selectedContact.asObservable();
  clearChatHistoryContact$ = this.clearChatHistoryContact.asObservable();
  unreadMessageForContact$ = this.unreadMessageForContact.asObservable();
  transferChatHistoryContact$ = this.transferChatHistoryContact.asObservable();
  setMessageIsSendOnUI$ = this.setMessageIsSendOnUI.asObservable();

  //variables for SOS-Messages
  sosContact: appContact | undefined;
  sosCustomMessage: string = '';
  sosStandardMessage: string = 'Ich habe einen Notfall und benötige Hilfe!';

  constructor(public platform: Platform, private networkDataTransfer:NetworkDataTransferService, private appContacts:AppContactsService) {

    //check if device is android
    this.isMobile = platform.is('android');

    //request geo permission on startup
    if(this.isMobile){
      Geolocation.requestPermissions();
    }

    //initialize observables
    this.SendMessageFromLoRaToUI();
    this.getConnectionLogs();
    this.getConnectionStatus();
    this.setMessageStatusOnUIToSend();
  }

  /**
   * Connect to LoRa network
   */
  connectToLoRaNetwork(): void{
    this.networkDataTransfer.connectToServer();
  }

  /**
   * Sign off from LoRa Network
   */
  signOffFromLoRaNetwork(): void{
    this.networkDataTransfer.disconnect();
  }

  /**
   * Recieves Message from LoRa Network to display on the UI.
   * Subscribes to a observable.
   */
  SendMessageFromLoRaToUI(): void{
    this.networkDataTransfer.messageReadyForUI$.subscribe( msg => {
      //Convert timestamp
      const dtnEpoch = this.getTimestampEpochOffset();
      msg.timestamp = msg.timestamp + dtnEpoch;

      //convert device phone number from CRC32 format to plain format
      msg.destination = this.devicePhoneNumber;

      //try to convert source phone number if a contact for it exists in the App
      const plainPhoneNumber: string | undefined = this.appContacts.getContactPhoneNumberFromCRC32(msg.source);
      if(plainPhoneNumber != undefined){
        msg.source = plainPhoneNumber;
      }else{
        this.appContacts.addContactToApp('Unbekannter Kontakt-' + msg.source, msg.source, msg.source);
      }

      this.messageRecieved.next(msg);
      //flag contact for unread messages if the sender is not the currently selected contact
      if(this.targetContact == undefined || msg.source != this.targetContact.phoneNumber){
        this.unreadMessageForContact.next(msg.source);
      }
    });      
  }

  /**
   * Send Message to Network from UI to LoRa Network
   * @param msg message to be send, in plain format
   * @param dest destination phone number in E.123 international format, e.g. +495555555
   */
  sendMessageFromUIToLoRa(msg: string): void{
    //check if a contact is currently set as target
    if(this.targetContact == undefined){
      alert('Bitte Kontakt auswählen!');
      return;
    }

    //get timestamp for App and LoRaWAN
    const currentTimestamp = Date.now();
    const currentTimestampLoRaWAN = this.getCurrentTimestampForLoRaWAN();

    //create message in the standard interface
    let sendMsg: AppMessage = {
      source: this.devicePhoneNumber,
      destination: this.targetContact.phoneNumber,
      timestamp: currentTimestamp,
      content: msg
    };

    //set the index of the new message
    const chatHistoryIndex: number = this.chatHistoryLength[sendMsg.destination];
    //create copy of send message and send it to chat history
    this.messageRecieved.next(Object.assign({}, sendMsg));
    //set the current contact to the top of the contact list
    this.appContacts.setContactToTheTopOfTheList(sendMsg.destination);

    //adjust message with CRC32 for LoRa 
    sendMsg.source = this.devicePhoneNumberCRC32;
    sendMsg.destination = this.targetContact.phoneNumberCRC32;
    sendMsg.timestamp = currentTimestampLoRaWAN;

    //send message into the network
    this.networkDataTransfer.recieveMessageFromUI(sendMsg, chatHistoryIndex);
  }

  /**
   * Initialize clearance of chat history for a given Contact
   * @param contact Contact for that chat history should be deleted
   */
  clearChatHistoryForContact(contact: appContact): void{
    this.clearChatHistoryContact.next(contact);
  }

  /**
   * Transfer the chat History from one contact to another
   * @param sourcePhoneNumber phone number of contact of which the chat history should be transfered from
   * @param destinationPhoneNumber phone number of contact to which the chat history should be transfered to
   */
  transferChatHistoryForContact(sourcePhoneNumber: string, destinationPhoneNumber: string): void{
    this.transferChatHistoryContact.next({source: sourcePhoneNumber, destination: destinationPhoneNumber});
  }

  /**
   * Sends an SOS-Message into the network
   * The message will be sent to all devices that are registered on the current hofbox and additionaly to the SOS contact if defined
   * If a custom content for the message was defined, the custom message will be sent, otherwise the standard message will be sent
   */
  async sendSOSMessage(): Promise<void>{
    //define list of all reciptants of the SOS Message and retrieve all currently registered phone numbers on the backend
    let sosReciptants: string[] = await this.networkDataTransfer.getAddressesFromBackend();

    //check if a SOS Contact was defined and push it on the list
    if(this.sosContact != undefined){
      sosReciptants.unshift(this.sosContact.phoneNumber);
    }

    //define message content
    let content: string;
    if(this.sosCustomMessage != ''){
      content = this.sosCustomMessage;
    }else{
      content = this.sosStandardMessage;
    }

    //add geolocation to message
    if(this.isMobile){
      await Geolocation.requestPermissions();
      if(await Geolocation.checkPermissions()){
        const location: Position = await Geolocation.getCurrentPosition({enableHighAccuracy: true});
        const locationString: string = location.coords.latitude.toPrecision(7).toString() + '/' + location.coords.longitude.toPrecision(7).toString();
        content = content + ' ' + locationString;
      }
    }

    //define timestamp
    const timestamp = this.getCurrentTimestampForLoRaWAN();

    //send SOS Message to all reciptants
    const sosReciptantsLength = sosReciptants.length;
    let i: number = 0;
    //server filters message with the same content if they are sent very close to eachother in time
    //Therefore a timeout between the messages is needed to ensure the server doesn't ignore them
    const intervalID = setInterval(() => {
      if(i == sosReciptantsLength - 1){
        clearInterval(intervalID);
      }else if(sosReciptants[i] != this.devicePhoneNumber){
      //create AppMessage Object 
      const message: AppMessage = {
        source: this.devicePhoneNumberCRC32,
        destination: this.appContacts.getCRC32FormatOfPhoneNumber(sosReciptants[i]),
        timestamp: timestamp,
        content: content
      }
      //send message into the network
      this.networkDataTransfer.recieveMessageFromUI(message, -1);
      }

      i = i + 1;
    }, 10000);
  }

  /**
   * Set Websocket Server Address from Settings to LoRa Network
   * @param adr server url with port number e.g. hofbox:3001
   */
  setServerAddressLoRa(adr: string): void{
    this.networkDataTransfer.setServerAddress(adr);
  }

  /**
   * Set Phone number of device for network operations
   * @param phoneNumber phone number in E.123 international format e.g. +495555555
   */
  setDevicePhoneNumber(phoneNumber: string): void{
    this.devicePhoneNumber = phoneNumber;
    this.devicePhoneNumberCRC32 = this.appContacts.getCRC32FormatOfPhoneNumber(phoneNumber);
    this.networkDataTransfer.setDevicePhoneNumber(this.devicePhoneNumber, this.devicePhoneNumberCRC32);
  }

  /**
   * Set the currently selected contact for the App
   * @param contact the contact that is to be selected or undefined if no contact is selected
   */
  setTargetContact(contact: appContact | undefined): void{
    this.targetContact = contact;
    this.selectedContact.next(contact);
  }

  /**
   * Sets the contact that should recieve SOS-Messages
   * Parse undefiend if only nearby devices should recieve the SOS Message
   * @param contact 
   */
  setSOSContact(contact: appContact | undefined): void{
    this.sosContact = contact;
  }

  /**
   * Defines a custom message that should be send in SOS-Messages
   * Parse an empty string if the standard message should be used
   * @param msg 
   */
  setSOSCustomMessage(msg: string): void{
    this.sosCustomMessage = msg;
  }

  /**
   * Set the messageRecieved Subject manually, use only for testing purposes
   * @param msg message that should be added to Subject
   */
  setMessageRecieved(msg: AppMessage): void{
    this.messageRecieved.next(msg);
  }

  /**
   * Set the status of a message to isSend 
   * subscribes to observable
   */
  setMessageStatusOnUIToSend(): void{
    this.networkDataTransfer.messageIsSendToNetwork$.subscribe((e) => {
      //check if the plain phone number is known for the message
      const plainPhoneNumber: string | undefined = this.appContacts.getContactPhoneNumberFromCRC32(e.phoneNumber);
      if(plainPhoneNumber != undefined){
        e.phoneNumber = plainPhoneNumber;
      }

      //set status on UI
      this.setMessageIsSendOnUI.next(e);
    });
  }

  /**
   * Sets the current length of the chat history from a phoneNumber
   * This is used to determine the position of a send Message in the list to change it's status
   * @param phoneNumber phone number of the contact
   * @param length length of the list
   */
  setChatHistoryListLength(phoneNumber: string, length: number){
    this.chatHistoryLength[phoneNumber] = length;
  }

  /**
   * Retrieves the currently set phone number of the device
   * @returns phone number in E.123 international format e.g. +495555555
   */
  getDevicePhoneNumber(): string{
    return this.devicePhoneNumber;
  }

  /**
   * Retrieve the connection logs of the websocket.
   * Subscribes to an observable.
   */
  getConnectionLogs(): void{
    this.networkDataTransfer.connectionLog$.subscribe( state => this.connectionLog.next(state));
  }

  /**
   * Retrieves the current connection status of the websocket server
   * Subscribes to observable.
   */
  getConnectionStatus(): void{
    this.networkDataTransfer.connectionStatus$.subscribe( state => this.connectionStatus.next(state))
  }

  /**
   * Get the offset for the time since epoch between App and LoRa Network
   * @returns Epoch offset
   */
  getTimestampEpochOffset(): number{
    return Date.parse("2000-01-01T00:00:00.000Z");
  }

  /**
   * calculate current timestamp and calculate epoch offset for LoRa network
   * @returns LoRaWAN compatible timestamp
   */
  getCurrentTimestampForLoRaWAN(): number{
    const currentTimestamp = Date.now();
    const dtnEpoch = this.getTimestampEpochOffset();
    return currentTimestamp - dtnEpoch;
  }
}
