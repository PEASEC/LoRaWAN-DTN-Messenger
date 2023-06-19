import { Component, OnInit, ViewChild } from '@angular/core';
import { NetworkUiInterfaceService } from 'src/app/network-ui-interface.service';
import { FileSystemStorageService } from 'src/app/file-system-storage.service';
import { ChatHistoryElement, messageTag } from './ChatHistoryElement';
import { appContact } from 'src/app/appContact';
import { ChatHistoryList } from './ChatHistoryList';

@Component({
  selector: 'app-chat-history',
  templateUrl: './chat-history.component.html',
  styleUrls: ['./chat-history.component.scss'],
})
export class ChatHistoryComponent implements OnInit {
  @ViewChild('chatHistoryList') chatHistoryListUI:any;

  chatHistory: ChatHistoryList = {};
  phoneNumber: string = "-1";
  selectedContact!: appContact | undefined;

  //SOS Message variables
  sosPopoverIsOpen: boolean = false;
  sosPopoverConfirmIsOpen: boolean = false;
  sosPopoverAbortIsOpen: boolean = false;
  sosPopoverInfoIsOpen: boolean = false;
  sosMessageTimer: number = 10; //in seconds
  sosMessageTimerUI: number = this.sosMessageTimer; //timer display on UI
  sosShouldMessageBeSent: boolean = false;
  

  constructor(private networkUIInterface: NetworkUiInterfaceService, private filesystemService: FileSystemStorageService) { 

    //initialize observables
    this.getMessage();
    this.getSelectedContact();
    this.deleteChatHistoryForContact();
    this.transferChatHistoryForContact();
    this.getMessageIsSend();
  }

  async ngOnInit() {
    await this.loadChatHistoryFromFilesystem();
  }

  /**
   * load last chat history from Filesystem
   */
  async loadChatHistoryFromFilesystem(): Promise<boolean>{
    const result: string = await this.filesystemService.loadChatHistoryFromFilesystem();
    try{
      this.chatHistory = JSON.parse(result);

      //set length of chat history for all contacts on the networkUIInterface
      //this is necessary as the interface needs to know where a new send message is located in the chat history to set it's status later to isSend
      Object.keys(this.chatHistory).forEach(key => {
        this.networkUIInterface.setChatHistoryListLength(key, this.chatHistory[key].length);
      });

      return true;
    }catch{
      //if chat history cannot be parsed, it will not be loaded. This is normally the case if it was empty previously.
      this.chatHistory = {};
      return false;
    }
  }

  /**
   * Convert the timestamp to a readable format
   * @param ts timestamp in numerical format
   * @returns converted timestamp in de-DE locale format
   */
  convertTimestampToDateFormat(ts: number): string{
    const convertedTS = new Date(ts);
    return convertedTS.toLocaleString("de-DE");
  }

  /**
   * Get Message from Network to display on Chat history
   * Subscribes to observable
   */
  getMessage(): void{
    this.networkUIInterface.messageRecieved$.subscribe( async msg => {
      this.phoneNumber = this.networkUIInterface.getDevicePhoneNumber();
      let tag: messageTag;
      let index: string;

      if(msg.source == this.phoneNumber){
        tag = messageTag.SEND;
        index = msg.destination;
      }else{
        tag = messageTag.RECIEVED;
        index = msg.source;
      }

      //check for coordinates in message
      let containtsCoordinates: boolean = false;
      const coordinatesResult: string | undefined = this.checkForCoordinates(msg.content);
      if(coordinatesResult != undefined){
        containtsCoordinates = true;
      }

      //create ChatHistoryElement
      const newMsg: ChatHistoryElement = {
        message : msg,
        messageTag : tag,
        messageIsSend : false,
        messageContainsCoordinates : containtsCoordinates,
        messageCoordinatesOpenStreetMapLink : coordinatesResult,
      }

      let chatHistoryForContact = this.chatHistory[index];
      //If no chat history was previously present for the contact, make a new list, otherwise push the new message in the existing list
      if (chatHistoryForContact == undefined){
        this.chatHistory[index] = [newMsg];
      }else{
        chatHistoryForContact.push(newMsg);
      }

      //set the new Length on the Network interface
      this.networkUIInterface.setChatHistoryListLength(index, this.chatHistory[index].length);

      setTimeout(() => this.chatHistoryListUI.scrollToBottom(300), 300);
      await this.filesystemService.saveChatHistoryToFilesystem(this.chatHistory);
    });
  }

  /**
   * Check for geolocation in message and generate a OpenStreetMap Link
   * @param text message text that should be checked
   * @returns OpenStreetMap Link if coordinates were found, otherwise undefined
   */
  checkForCoordinates(text: string): string | undefined{
    //source for RegExp: https://stackoverflow.com/questions/3518504/regular-expression-for-matching-latitude-longitude-coordinates
    let geolocationRegExp = /[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?)\/[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)/g;
    const geolocationResult = text.match(geolocationRegExp);
    if(geolocationResult != null){
      const latitude: string = geolocationResult[0].split('/')[0];
      const longitude: string = geolocationResult[0].split('/')[1];
      const openStreetMapLink : string = 'https://www.openstreetmap.org/?mlat=' + latitude + '&mlon=' + longitude + '#map=15/' + geolocationResult[0];
      return openStreetMapLink;
    }else{
      return undefined;
    }
  }

  /**
   * Get Contact that is currently selected as Target for the App
   * Subscribes to observable
   */
  getSelectedContact(): void{
    this.networkUIInterface.selectedContact$.subscribe((e) => {
      this.selectedContact = e;
      setTimeout(() => this.chatHistoryListUI.scrollToBottom(300), 300);
    });
  }

  /**
   * Get Information if a message was send into the network and set it's flag on the list
   * subscribes to observable
   */
  getMessageIsSend(): void{
    this.networkUIInterface.setMessageIsSendOnUI$.subscribe( async (e) => {
      this.chatHistory[e.phoneNumber][e.index].messageIsSend = true;
      await this.filesystemService.saveChatHistoryToFilesystem(this.chatHistory);
    });
  }

  /**
   * Delete current chat history from UI and the Filesystem for a given contact
   * Subscribes to observable
   */
  deleteChatHistoryForContact(): void{
    this.networkUIInterface.clearChatHistoryContact$.subscribe(async contact => {
      if(this.chatHistory[contact.phoneNumber] != undefined){
        delete this.chatHistory[contact.phoneNumber];
        await this.filesystemService.saveChatHistoryToFilesystem(this.chatHistory);
      }
    });    
  }

  /**
   * Transfers the Chat History from one contact to another
   * Subscribes to observable
   */
  transferChatHistoryForContact(): void{
    this.networkUIInterface.transferChatHistoryContact$.subscribe(async phoneNumbers => {
      this.chatHistory[phoneNumbers.destination] = this.chatHistory[phoneNumbers.source];
      delete this.chatHistory[phoneNumbers.source];

      //set the current length for the new phone number on the networkUiInterface
      this.networkUIInterface.setChatHistoryListLength(phoneNumbers.destination, this.chatHistory[phoneNumbers.destination].length);

      await this.filesystemService.saveChatHistoryToFilesystem(this.chatHistory);
    });
  }

  /**
   * Starts process to send an SOS Message into the network
   * Opens Popover for User to interrupt the process if needed
   */
  sendSOSMessage(): void{
    this.sosShouldMessageBeSent = true;
    this.sosPopoverIsOpen = true;
    this.sosMessageTimerUI = this.sosMessageTimer;

    const intervalID = setInterval(() =>{
      //check if popover was closed
      if(!this.sosPopoverIsOpen){
        clearInterval(intervalID)
      }

      //check timer
      if(this.sosMessageTimerUI == 0){
        if(this.sosShouldMessageBeSent){

          //send SOS Message
          this.networkUIInterface.sendSOSMessage();
        }

        //reset UI
        this.sosPopoverIsOpen = false;

        //leave interval
        clearInterval(intervalID);
      }else{
        this.sosMessageTimerUI = this.sosMessageTimerUI - 1;
      }
    }, 1000);
  }

  /**
   * Cancel process of sending a SOS Message 
  */
  cancelSOSMessage(): void{
    this.sosPopoverAbortIsOpen = true;
    this.sosShouldMessageBeSent = false;
    this.sosPopoverIsOpen = false;
  }

  /**
   * Handle dismiss event of SOS Popover
   */
  dismissSOSPopover(): void{
    //only display confirm popover if the timer reached 0 otherwise display abort popover
    if(this.sosMessageTimerUI == 0){
      this.sosPopoverConfirmIsOpen = true;
    }else{
      this.cancelSOSMessage();
    }
    this.sosPopoverIsOpen = false;
  }
}
