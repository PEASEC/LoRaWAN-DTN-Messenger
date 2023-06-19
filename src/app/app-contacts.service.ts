import { Injectable } from '@angular/core';
import { appContact } from './appContact';
import { crc32 } from 'crc';
import { FileSystemStorageService } from './file-system-storage.service';

@Injectable({
  providedIn: 'root'
})
export class AppContactsService {
  private contactList: appContact[] = [];

  constructor(private filesystemService: FileSystemStorageService) { 
    this.loadContactsFromFilesystem();
  }

  private async loadContactsFromFilesystem(): Promise<void>{
    const contactsFS: string = await this.filesystemService.loadAppContactsFromFilesystem();
    try{
      this.contactList = JSON.parse(contactsFS);
    }catch{
      //if contacts cannot be parsed, they are not loaded. Normally this is because the list was empty.
    }
  }

  /**
   * Add new contact to contact list, if contact ist not part of the list already
   * @param name name of the contact
   * @param phoneNumber phone number in E.123 international format e.g. +495555555
   * @returns true if contact was successfully added, false if the phone number was already given for a contact
   */
  addContactToApp(name:string, phoneNumber: string, phoneNumberCRC32: string): boolean{
    //create the new contact
    const newContact: appContact = {
      name: name,
      phoneNumber: phoneNumber,
      phoneNumberCRC32: phoneNumberCRC32
    }

    //check if contact is already in the list
    const element: appContact | undefined = this.contactList.find(element => (element.phoneNumber == phoneNumber));

    //if not, add it to the list
    if(element == undefined){
      this.contactList.push(newContact);
      this.filesystemService.saveAppContactsToFilesystem(this.contactList);
      return true;
    }else{
      return false;
    }
  }

  /**
   * Change the name of a contact
   * @param phoneNumber phone number of the contact, serves as identifier
   * @param newName the new Name of the contact
   */
  changeContactName(phoneNumber: string, newName: string): void{
    const element: appContact | undefined = this.contactList.find(element => element.phoneNumber == phoneNumber);
    if(element != undefined){
      element.name = newName;
      this.filesystemService.saveAppContactsToFilesystem(this.contactList);
    }
  }

  /**
   * Remove given contact from known app contacts
   * @param phoneNumber phone number in E.123 international format e.g. +495555555
   */
  removeContactFromApp(phoneNumber: string): void{
    const element: appContact | undefined = this.contactList.find(element => element.phoneNumber == phoneNumber);
    if(element != undefined){
      const index: number = this.contactList.indexOf(element);
      this.contactList.splice(index, 1);
      this.filesystemService.saveAppContactsToFilesystem(this.contactList);
    }
  }

  /**
   * Set the specified contact to at the top of the contact list
   * @param phoneNumber phone number of contact that should be set to the top
   * @returns true if contact was in the list and could be moved to the top, false if contact could not be found in the contact list
   */
  setContactToTheTopOfTheList(phoneNumber: string): boolean{
    //check if contact is in the list
    const element: appContact | undefined = this.contactList.find(element => (element.phoneNumber == phoneNumber));
    if(element != undefined){
      const index: number = this.contactList.indexOf(element);
      this.contactList.unshift(this.contactList.splice(index, 1)[0]);
      return true;
    }else{
      return false;
    }
  }

  /**
   * Retrieve the corresponding plain phone number of a CRC32 formatted phone number, if a contact for it exists
   * @param phoneNumberCRC32 phone number in CRC32 format e.g. 1804749753 
   * @returns phone number in E.123 international format, if a contact is known. e.g. +495555555
   * @returns undefined if no contact exists
   */
  getContactPhoneNumberFromCRC32(phoneNumberCRC32: string): string | undefined{
    const contact: appContact | undefined = this.contactList.find(element => element.phoneNumberCRC32 == phoneNumberCRC32);
    if(contact != undefined){
      return contact.phoneNumber;
    } else {
      return undefined;
    }
  }

  /**
   * Get crc32 representation of the phone number
   * @param phoneNumber phone number in E.123 international format e.g. +495555555
   * @returns phone number in CRC32 format e.g. 1804749753
   */
  getCRC32FormatOfPhoneNumber(phoneNumber: string): string{
    return crc32(phoneNumber).toString(10);
  }

  /**
   * Returns the list of all currently known contacts
   * @returns list of appContact
   */
  getContactList(): appContact[]{
    return this.contactList;
  }
}
