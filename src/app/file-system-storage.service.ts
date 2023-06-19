import { Injectable } from '@angular/core';
import { AppMessage } from './appMessage';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { appContact } from './appContact';
import { ChatHistoryList } from './chat-ui/chat-history/ChatHistoryList';

/**
 * Defines App intern directories to save files to and load files from
 */
enum FileNames {
  SERVERADDRESS = 'serverAddress',
  DEVICEPHONENUMBER = 'devicePhoneNumber',
  CHATHISTORY = 'chatHistory',
  UNREADMESSAGES = 'unreadMessages',
  APPCONTACTS = 'appContacts',
  SOSCONTACT = 'sosContact',
  SOSMESSAGE = 'sosMessage'
}

@Injectable({
  providedIn: 'root'
})
export class FileSystemStorageService {

  constructor() { }

  //---------------------------------------------------
  //App Settings to File System
  //---------------------------------------------------

  /**
   * Saves server address to the Filesystem
   * @param serverAddress server address that is to be saved
   */
  async saveServerAddressToFilesystem(serverAddress: string): Promise<void>{
    await this.writeTextFileToFilesystem(FileNames.SERVERADDRESS, serverAddress);
  }

  /**
   * Saves device phonenumber to the Filesystem
   * @param devicePhoneNumber device phone number that is to be saved
   */
  async saveDevicePhoneNumberToFilesystem(devicePhoneNumber: string): Promise<void>{
    await this.writeTextFileToFilesystem(FileNames.DEVICEPHONENUMBER, devicePhoneNumber);
  }

  /**
   * Loads server address from Filesystem
   * @returns last server address that was saved on the Filesystem or empty string if file was not found
   */
  async loadServerAddressFromFilesystem(): Promise<string>{
    return await this.readTextFileFromFilesystem(FileNames.SERVERADDRESS);
  }

  /**
   * Loads device phonenumber from Filesystem
   * @returns last device phonenumber that was saved on the Filesystem or empty string if file was not found
   */
  async loadDevicePhoneNumberFromFilesystem(): Promise<string>{
    return await this.readTextFileFromFilesystem(FileNames.DEVICEPHONENUMBER);
  }

  //---------------------------------------------------
  //SOS Settings to Filesystem
  //---------------------------------------------------

  /**
   * Saves contact for SOS-Messages to Filesystem
   * @param contact SOS contact
   */
  async saveSOSContactToFilesystem(contact: appContact | undefined){
    let contactString: string;
    if(contact != undefined){
      contactString = JSON.stringify(contact);
    }else{
      contactString = '';
    }
    await this.writeTextFileToFilesystem(FileNames.SOSCONTACT, contactString);
  }

  /**
   * Loads saved SOS-Contact from Filesystem
   * @returns last saved contact
   */
  async loadSOSContactFromFilesystem(): Promise<string>{
    return await this.readTextFileFromFilesystem(FileNames.SOSCONTACT);
  }

  /**
   * Saves the custom SOS-Message to the Filesystem
   * @param msg custom SOS-Message
   */
  async saveSOSMessageToFileSystem(msg: string){
    await this.writeTextFileToFilesystem(FileNames.SOSMESSAGE, msg);
  }
  
  /**
   * Loads custom SOS-Message from Filesystem
   * @returns last saved custom SOS-Message
   */
  async loadSOSMessageFromFilesystem(): Promise<string>{
    return await this.readTextFileFromFilesystem(FileNames.SOSMESSAGE);
  }

  //---------------------------------------------------
  //Chat History to Filesystem
  //---------------------------------------------------

  /**
   * Saves chat history to the Fileystem
   * @param chatHistory chat history that is to be saved
   */
  async saveChatHistoryToFilesystem(chatHistory: ChatHistoryList): Promise<void>{
    const history: string = JSON.stringify(chatHistory);
    await this.writeTextFileToFilesystem(FileNames.CHATHISTORY, history);
  }

  /**
   * Loads the last saved chat history from Filesystem
   * @returns last saved chat history
   */
  async loadChatHistoryFromFilesystem(): Promise<string>{
    return await this.readTextFileFromFilesystem(FileNames.CHATHISTORY);
  }

  /**
   * Saves list of contacts with unread Messages to Filesystem
   * @param unreadMessagesContacts list of contacts with unread messages present
   */
  async saveUnreadMessagesContactListToFilesystem(unreadMessagesContacts: string[]): Promise<void>{
    const unreadMessages: string = JSON.stringify(unreadMessagesContacts);
    await this.writeTextFileToFilesystem(FileNames.UNREADMESSAGES, unreadMessages);
  }

  /**
   * Loads last saved list of contacts with unread Messages from Filesystem
   * @returns list of contacts with unread Messages present
   */
  async loadUnreadMessagesContactListeFromFilesystem(): Promise<string>{
    return await this.readTextFileFromFilesystem(FileNames.UNREADMESSAGES);
  }

  //---------------------------------------------------
  //App Contacts to Filesystem
  //---------------------------------------------------
  
  /**
   * Saves App contact list on Filesystem
   * @param appContacts contact list that is to be saved
   */
  async saveAppContactsToFilesystem(appContacts: appContact[]): Promise<void>{
    const contacts = JSON.stringify(appContacts);
    await this.writeTextFileToFilesystem(FileNames.APPCONTACTS, contacts)
  }

  /**
   * Loads the last saved App contact list from Filesystem
   * @returns last saved contact list
   */
  async loadAppContactsFromFilesystem(): Promise<string>{
    return await this.readTextFileFromFilesystem(FileNames.APPCONTACTS);
  }

  //---------------------------------------------------
  //Other Filesystem functions
  //---------------------------------------------------

  /**
   * Deletes all Data from the Filesystem
   */
  async deleteDataFromFilesystemStorage(): Promise<void>{
    const fileNameList: string[] = Object.values(FileNames);
    const fileNameListLength: number = fileNameList.length;
    for(let i = 0; i < fileNameListLength; i++){
      await Filesystem.deleteFile({
        path: fileNameList[i] + '.txt',
        directory: Directory.Data
      });
    }
  }

  //---------------------------------------------------
  //Helper functions for saving and loading files to filesystem
  //---------------------------------------------------

  /**
   * Helper function to save a text file to the Filesystem
   * @param fileName name of the to be saved file
   * @param content text content of the to be saved file
   */
  async writeTextFileToFilesystem(fileName: string, content: string): Promise<void>{
    Filesystem.writeFile({
      path: fileName + '.txt',
      data: content,
      directory: Directory.Data,
      encoding: Encoding.UTF8
    })
  } 

  /**
   * Helper function to load a text file from the Filesystem
   * @param fileName name of the to be loaded file
   * @returns text content of the loaded file or empty string if file cannot be found
   */
  async readTextFileFromFilesystem(fileName: string): Promise<string>{
    try{
      const result = await Filesystem.readFile({
        path: fileName + '.txt',
        directory: Directory.Data,
        encoding: Encoding.UTF8
      })
      return result.data;
    }catch{
      return '';
    }
  } 
}