import { Component, OnInit, ViewChild } from '@angular/core';
import { IonModal } from '@ionic/angular';
import { ModalController } from '@ionic/angular';
import { NetworkUiInterfaceService } from 'src/app/network-ui-interface.service';
import { FileSystemStorageService } from 'src/app/file-system-storage.service';
import { AppContactsService } from 'src/app/app-contacts.service';
import { appContact } from 'src/app/appContact';
import { Contacts, GetContactsResult} from '@capacitor-community/contacts';
import { Platform } from '@ionic/angular';

@Component({
  selector: 'app-status-bar',
  templateUrl: './status-bar.component.html',
  styleUrls: ['./status-bar.component.scss'],
})
export class StatusBarComponent implements OnInit {
  @ViewChild(IonModal)  modal!: IonModal;
  isMobile!: boolean;

  //---------------------------------------------------
  //Variables of Settings Modal
  //---------------------------------------------------
  settingsModalType: string = 'showNetwork';
  serverAddressUI: string = '';
  deviceTelephoneNumberUI: string = '';
  lastAcceptedServerAddress: string = '';
  lastAcceptedDevicePhoneNumber: string = '';
  statusLog: string[] = [];
  loadFromFileSystem: boolean = true;

  //Variables for SOS Messages
  selectedContactForSOSMessages: appContact | undefined;
  determinedContactForSOSMessages: appContact | undefined;
  sosMessageInputUI: string = '';

  //variables for status messages
  displayConnectionStatusMessages: boolean = false;
  statusServerConnectionSuccessfull: boolean = false;
  statusServerConnectionFailure: boolean = false;

  //---------------------------------------------------
  //Variables for Regular Expressions
  //---------------------------------------------------

  //Pattern definition for correct server adress and phone number
  ipv4Pattern:string = "(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)"
  //source: https://stackoverflow.com/questions/4460586/javascript-regular-expression-to-check-for-ip-addresses
  
  ipv6Pattern:string = "(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))"
  //source: https://stackoverflow.com/questions/53497/regular-expression-that-matches-valid-ipv6-addresses
  
  urlPattern:string = "[A-Za-z0-9]+"
  //source: https://stackoverflow.com/questions/1410311/regular-expression-for-url-validation-in-javascript

  portPattern:string = ":[0-9]{2,5}"
  
  serverAdressPattern: string = "(" + this.ipv4Pattern +"|" + "\\[" + this.ipv6Pattern + "\]" + "|"+ this.urlPattern + ")" + this.portPattern + '$';

  //telephone number pattern in E.123 format without spaces"
  telephoneNumberPattern: string = "[+][0-9]{9,13}$";  

  //---------------------------------------------------
  //Variables for Status bar
  //---------------------------------------------------
  connectionStatus: boolean = false;

  //---------------------------------------------------
  //Variables for Contacts Modal
  //---------------------------------------------------
  contactModalType: string = 'showContacts';
  selectedContactForMessaging: appContact | undefined;
  unreadMessagesForContacts: string[] = [];

  //variables for UI input
  newContactName: string = '';
  newContactPhoneNumber: string = ''; 
  changeContactName: string = '';
  changeContactPhoneNumber: string = '';
  importContactPhoneNumber: string = '';
  selectedContactForImport: appContact | undefined;
  selectedContactForRemoval: appContact | undefined;
  selectedContactForChange: appContact | undefined;
  importedContactListFromDevice: appContact[] | undefined;

  //variables for status messages
  statusContactSuccessfullyAdded: boolean = false;
  statusContactSuccessfullyRemoved: boolean = false;
  statusContactSuccessfullyChanged: boolean = false;
  statusContactSuccessfullyImported: boolean = false;
  statusContactAlreadyExistsNewContact: boolean = false;
  statusContactAlreadyExistsChangeContact: boolean = false;
  statusContactAlreadyExistsImportContact: boolean = false;
  statusContactChangeInvalidInput: boolean = false;
  statusContactImportInvalidInput: boolean = false;



  constructor(public platform: Platform, private modalCtrl: ModalController, private networkUIInterface: NetworkUiInterfaceService, private fileSystemStorageService: FileSystemStorageService, private appContactsService: AppContactsService) { 

    //check if device is android
    this.isMobile = platform.is('android');

    //subscribe to observables
    this.getConnectionLogs();
    this.getConnectionStatus();    
    this.contactsSetUnreadMessagesForContact()
  }

  async ngOnInit() {
    //load data from Filesystem
    await this.loadServerSettingsFromFilesystem();
    await this.loadDevicePhoneNumberFromFilesystem();
    await this.loadUnreadMessagesContactListFromFilesystem();
    await this.loadSOSMessageDataFromFilesystem();

    //load contacts from device, if device is not a browser
    if(this.isMobile){
      await this.contactsGetContactListFromDevice();
    }
  }

  //---------------------------------------------------
  //Methods for Filesystem operations
  //---------------------------------------------------

  /**
   * loads the last saved device phonenumber from Filesystem, sets it on the UI and in the Network Module
   */
  async loadDevicePhoneNumberFromFilesystem(): Promise<void>{
    const pn = await this.fileSystemStorageService.loadDevicePhoneNumberFromFilesystem();
    if(pn != '' && this.loadFromFileSystem){
      this.deviceTelephoneNumberUI = pn;
      this.lastAcceptedDevicePhoneNumber = pn;
      this.setPhoneNumber();
    }
  }

  /**
   * loads the last saved server address from Filesystem, sets it on the UI and tries to connect to the server
   */
  async loadServerSettingsFromFilesystem(): Promise<void>{
    const addr = await this.fileSystemStorageService.loadServerAddressFromFilesystem();
    if(addr != '' && this.loadFromFileSystem){
      this.serverAddressUI = addr;
      this.lastAcceptedServerAddress = addr;
      this.connectToServer();
    }
  }

  /**
   * loads last saved list of contacts with unread messages
   */
  async loadUnreadMessagesContactListFromFilesystem(): Promise<void>{
    const unreadMessages = await this.fileSystemStorageService.loadUnreadMessagesContactListeFromFilesystem();
    try{
      this.unreadMessagesForContacts = JSON.parse(unreadMessages);
    }catch{
      //if contact list for unread messages cannot be parsed, it will not be loaded, this is normally the case if it was empty previously.
      this.unreadMessagesForContacts = [];
    }
  }

  /**
   * Loads last saved SOS-Contact and custom SOS-Message from Filesystem
   */
  async loadSOSMessageDataFromFilesystem(): Promise<void>{
    //load SOS-Contact
    let contact: appContact | undefined = undefined;
    try{
      contact = JSON.parse(await this.fileSystemStorageService.loadSOSContactFromFilesystem());
    }catch{
      //if contact cannot be parsed it will not be loaded, this is normally the case if it was empty previously.
    }
    if(contact != undefined){
      this.selectedContactForSOSMessages = contact;
      this.settingsSetSOSContact();
    }

    //load custom SOS-Message
    let msg: string = '';
    try{
      msg = await this.fileSystemStorageService.loadSOSMessageFromFilesystem();
    }catch{
      //if message cannot be parsed it will not be loaded, this is normally the case if it was empty previously.
    }
    if(msg != ''){
      this.sosMessageInputUI = msg;
      this.settingsSetCustomSOSMessage();
    }
  }

  //---------------------------------------------------
  //Methods for Contacts Modal
  //---------------------------------------------------

  /**
   * Load Contact List from Filesystem
   * @returns List of appContact
   */
  contactsLoadContacts(): appContact[]{
    return this.appContactsService.getContactList();
  }

  /**
   * Handles Select contact event on contact modal
   * @param contact appContact that is to be selected
   */
  contactsSelectContactUI(contact: appContact): void{
    this.contactsSelectContact(contact);
    this.modalCtrl.dismiss(null, 'cancel', 'contactsModal');
  }

  /**
   * Change selected Contact for ChatHistory and ChatInput
   * @param contact appContact that is to be selected
   */
  contactsSelectContact(contact: appContact): void{
    this.selectedContactForMessaging = contact;
    this.networkUIInterface.setTargetContact(contact);

    //remove contact from unread Messages list
    const element: string | undefined = this.unreadMessagesForContacts.find(elem => elem == contact.phoneNumber);
    if(element != undefined){
      const index: number = this.unreadMessagesForContacts.indexOf(element);
      this.unreadMessagesForContacts.splice(index, 1);
      this.fileSystemStorageService.saveUnreadMessagesContactListToFilesystem(this.unreadMessagesForContacts);
    }
  }

  /**
   * Checks if unread Messages are present for the given contact
   * @param phoneNumber phone number of contact that should be checked
   * @returns true if unread messages are present and false if not
   */
  contactsCheckForUnreadMessagesForContact(phoneNumber: string): boolean{
    const unreadMessages: string | undefined = this.unreadMessagesForContacts.find(element => element == phoneNumber);
    if (unreadMessages == undefined){
      return false;
    }else{
      return true;
    }
  } 

  /**
   * Import Contact List from Device
   */
  async contactsGetContactListFromDevice(): Promise<void>{
    
    //get contacts from Device
    await Contacts.requestPermissions();
    const result: GetContactsResult = await Contacts.getContacts({
      projection: {
        name: true,
        phones: true,
      }
    });
    const resultLength: number = result.contacts.length;

    //convert API result into list of appContact
    let deviceContactList: appContact[] = [];
    for(let i = 0; i < resultLength; i++){
      
      //check if required fields are defined for the given contact
      if(result.contacts[i].name != undefined && result.contacts[i].phones != undefined){
        let primaryPhoneNumber: string = '';
        let displayName: string = '';
        const phoneNumberListLength: number = result.contacts[i].phones!.length;

        //try to get the display name of the contact
        if(result.contacts[i].name!.display != undefined){
          displayName = result.contacts[i].name!.display!;
        //if no display name is set for the contact, don't load it
        }else{
          break;
        }

        //if there is more than one phone number, check what the primary one is
        if(phoneNumberListLength > 1){
          for(let j = 0; j < phoneNumberListLength; j++){
            if(result.contacts[0].phones![j].isPrimary){
              primaryPhoneNumber = result.contacts[0].phones![j].number!;
              break;
            }
          }
        //otherwise get the one phone number
        }else{
          primaryPhoneNumber = result.contacts[i].phones![0].number!;
        }

        //create appContact Object with the extracted information
        const contact: appContact = {
          name: displayName,
          phoneNumber: primaryPhoneNumber,
          phoneNumberCRC32: ''
        }
        deviceContactList.push(contact);
      }
      //set list on the UI
      this.importedContactListFromDevice = deviceContactList;
    }
    
  }

  /**
   * Try to convert the phone number of the imported contact into an E.123 representation
   * @returns true if conversion was successfull and false if not
   */
  convertAndCheckImportedPhoneNumber(): boolean{
    //check if the phone number is already valid first
    if(this.checkForValidPhoneNumber(this.selectedContactForImport!.phoneNumber)){
      return true;
    }else{
      let phoneNumber: string = this.selectedContactForImport!.phoneNumber;
      //remove all whitespaces
      phoneNumber = phoneNumber.replace(/\s/g, '');
      //remove possible special characters
      phoneNumber = phoneNumber.replace('(', '');
      phoneNumber = phoneNumber.replace(')', '');
      //if phone number starts with 0, replace the 0 with +49
      if(phoneNumber[0] == '0'){
        phoneNumber = '+49' + phoneNumber.substring(1);
      }
      //check if conversion could successfully convert the phone number in the correct format
      if(this.checkForValidPhoneNumber(phoneNumber)){
        this.selectedContactForImport!.phoneNumber = phoneNumber;
        return true;
      }else{
        return false;
      }
    }
  }

  /**
   * Add the given Contact to the App Contact list
   * @param contact contact that is to be added
   */
  contactsImportContactFromDevice(contact: appContact): void{
    let result: boolean | undefined = undefined;
    //Check if the phone number of the given contact is valid and import it
    if(this.checkForValidPhoneNumber(contact.phoneNumber)){
      result = this.appContactsService.addContactToApp(contact.name, contact.phoneNumber, this.appContactsService.getCRC32FormatOfPhoneNumber(contact.phoneNumber));
    //if not check if the input fields on the UI are valid, as the User will be prompted to change the phone number manually
    }else if(this.importContactPhoneNumber != '' && this.checkForValidPhoneNumber(this.importContactPhoneNumber)){
      result = this.appContactsService.addContactToApp(contact.name, this.importContactPhoneNumber, this.appContactsService.getCRC32FormatOfPhoneNumber(this.importContactPhoneNumber));
    }

    //set status messages on the UI
    if(result == undefined){
      this.statusContactImportInvalidInput = true;
      setTimeout(() => this.statusContactImportInvalidInput = false, 3000);
    } else if(result == false){
      this.statusContactAlreadyExistsImportContact = true;
      setTimeout(() => this.statusContactAlreadyExistsImportContact = false, 3000);
    } else {
      this.statusContactSuccessfullyImported = true;

      //reset UI Variables
      this.selectedContactForImport = undefined;
      this.importContactPhoneNumber = '';

      setTimeout(() => this.statusContactSuccessfullyImported = false, 3000);
    }
  }

  /**
   * Add new Contact to Contact list and save it to the Filesystem
   */
  contactsAddContact(): void{
    if(this.newContactName != '' && this.newContactPhoneNumber != '' && this.checkForValidPhoneNumber(this.newContactPhoneNumber)){
      const result: boolean = this.appContactsService.addContactToApp(this.newContactName, this.newContactPhoneNumber, this.appContactsService.getCRC32FormatOfPhoneNumber(this.newContactPhoneNumber));
      if(!result){
        this.statusContactAlreadyExistsNewContact = true;
        setTimeout(() => this.statusContactAlreadyExistsNewContact = false, 3000);
      }else{
        this.newContactName = '';
        this.newContactPhoneNumber = '';
        this.statusContactSuccessfullyAdded = true;
        setTimeout(() => this.statusContactSuccessfullyAdded = false, 3000);
      }
    }
  }

  /**
   * Removes existing Contact from Contact List and save the new List to the Filesystem
   * Also delete it's chat history
   */
  contactsRemoveContact(): void{
    if(this.selectedContactForRemoval != undefined){
      if(confirm('Sie sind dabei den folgenden Kontakt zu löschen:\n\nName: ' + this.selectedContactForRemoval.name + '\nTelefonnummer: '
       + this.selectedContactForRemoval.phoneNumber + '\n\nMöchten sie fortfahren?\nDieser Prozess kann nicht rückgängig gemacht werden!')){
        this.appContactsService.removeContactFromApp(this.selectedContactForRemoval.phoneNumber);
        this.networkUIInterface.clearChatHistoryForContact(this.selectedContactForRemoval);
        this.selectedContactForMessaging = undefined;
        this.networkUIInterface.setTargetContact(undefined);
        this.selectedContactForRemoval = undefined;
        this.statusContactSuccessfullyRemoved = true;
        setTimeout(() => this.statusContactSuccessfullyRemoved = false, 3000);
      }
    } 
  }

  /**
   * Change existing Contact to new Contact name or phone number, also transfers chat history if phone number is changed
   */
  contactsChangeContact(): void{
    //check for valid input
    if(this.changeContactName != '' && this.changeContactPhoneNumber != '' && this.checkForValidPhoneNumber(this.changeContactPhoneNumber) && this.selectedContactForChange != undefined){

      //check if only a name change is requested
      if(this.selectedContactForChange.phoneNumber == this.changeContactPhoneNumber && this.selectedContactForChange.name != this.changeContactName){
        this.appContactsService.changeContactName(this.selectedContactForChange.phoneNumber, this.changeContactName);
      }else{

        //Otherwise the telephonenumber has changed and the contact needs to be readded to the App
        //add contact to App
        const result: boolean = this.appContactsService.addContactToApp(this.changeContactName, this.changeContactPhoneNumber, this.appContactsService.getCRC32FormatOfPhoneNumber(this.changeContactPhoneNumber));
        //check for duplicates
        if(!result){
          this.statusContactAlreadyExistsChangeContact = true;
          setTimeout(() => this.statusContactAlreadyExistsChangeContact = false, 3000);
          return;
        }else{
          //transfer chatHistory from old contact and remove the old contact
          this.networkUIInterface.transferChatHistoryForContact(this.selectedContactForChange.phoneNumber, this.changeContactPhoneNumber);
          this.appContactsService.removeContactFromApp(this.selectedContactForChange.phoneNumber);
          //also transfer unread message flag if necessary
          const unreadMessagesResult = this.unreadMessagesForContacts.find(elem => elem == this.selectedContactForChange!.phoneNumber);
          if (unreadMessagesResult != undefined){
            //remove old phone number
            const index: number = this.unreadMessagesForContacts.indexOf(unreadMessagesResult);
            this.unreadMessagesForContacts.splice(index, 1);
            //add new phone number
            this.unreadMessagesForContacts.push(this.changeContactPhoneNumber);
            this.fileSystemStorageService.saveUnreadMessagesContactListToFilesystem(this.unreadMessagesForContacts);
          }
        }
      }
      //reset contacts variables for consistency
      this.networkUIInterface.setTargetContact(undefined);
      this.selectedContactForMessaging = undefined;
      this.changeContactName = '';
      this.changeContactPhoneNumber = '';
      this.selectedContactForChange = undefined;

      //confirm action on UI
      this.statusContactSuccessfullyChanged = true;
      setTimeout(() => this.statusContactSuccessfullyChanged = false, 3000);
    }else{
      this.statusContactChangeInvalidInput = true;
      setTimeout(() => this.statusContactChangeInvalidInput = false, 3000);
    }

  }

  /**
   * Control Dismiss event of Contact Modal
   * @param event 
   */
  contactsOnDismiss(event: Event): void{
    //reset UI variables
    this.newContactName = '';
    this.newContactPhoneNumber = ''; 
    this.changeContactName = '';
    this.changeContactPhoneNumber = '';
    this.importContactPhoneNumber = '';
    this.selectedContactForImport = undefined;
    this.selectedContactForRemoval = undefined;
    this.selectedContactForChange = undefined;

    this.modalCtrl.dismiss(null, 'cancel', 'contactsModal');
  }

  /**
   * Adds Contact to the List of Contacts with unread Messages present
   * Subscribes to observable.
   */
  contactsSetUnreadMessagesForContact(): void{
    this.networkUIInterface.unreadMessageForContact$.subscribe(phoneNumber => {
      const element: string | undefined = this.unreadMessagesForContacts.find(elem => elem == phoneNumber);
      if (element == undefined){
        this.unreadMessagesForContacts.push(phoneNumber);
        this.fileSystemStorageService.saveUnreadMessagesContactListToFilesystem(this.unreadMessagesForContacts);
      }
      this.appContactsService.setContactToTheTopOfTheList(phoneNumber);
    })
  }

  //---------------------------------------------------
  //Methods for Settings Modal
  //---------------------------------------------------

  /**
   * Handles the cancel event on the Settings Modal
   */
  settingsCancelUI(): void{
    this.settingsCancel();
    this.displayConnectionStatusMessages = false;
    this.modalCtrl.dismiss(null, 'cancel', 'settingsModal')
  }

  /**
   * Handles logic of what happens when Settings Modal is canceled
   * Seperation is for automated testing purposes as these don't know about the existence of the modal and throw an error then they are dismissed
   */
  settingsCancel(): void{
    this.deviceTelephoneNumberUI = this.lastAcceptedDevicePhoneNumber;
    this.serverAddressUI = this.lastAcceptedServerAddress;
  }

  /**
   * Handles confirm event on the Settings Modal
   */
  settingsConfirmUI(): void{
    this.settingsConfirm();
    this.displayConnectionStatusMessages = false; 
    this.modalCtrl.dismiss([this.serverAddressUI, this.deviceTelephoneNumberUI], 'confirm', 'settingsModal');
  }

  /**
   * Handles logic of what happens when Settings Modal is confirmed
   * Seperation is for automated testing purposes as these don't know about the existence of the modal and throw an error then they are dismissed
   */
  settingsConfirm(): void{    
    //set phone number for the network
    if(this.checkForValidPhoneNumber(this.deviceTelephoneNumberUI)){
      this.lastAcceptedDevicePhoneNumber = this.deviceTelephoneNumberUI;
      this.fileSystemStorageService.saveDevicePhoneNumberToFilesystem(this.deviceTelephoneNumberUI);
      this.setPhoneNumber();
    }else{
      this.deviceTelephoneNumberUI = this.lastAcceptedDevicePhoneNumber;
    }

    //set server address for LoRa network
    if(this.checkForValidServerAddress(this.serverAddressUI)){
      this.lastAcceptedServerAddress = this.serverAddressUI;
      this.fileSystemStorageService.saveServerAddressToFilesystem(this.serverAddressUI);
      this.setServerAddress();
    }else{
      this.serverAddressUI = this.lastAcceptedServerAddress;
    }
    
    //set custom SOS Message
    this.settingsSetCustomSOSMessage();
  }

  /**
   * Delete all Data from Filesystem Storage
   */
  async settingsDeleteDataFromFilesystemStorage(): Promise<void>{
    if(confirm('Sind sie sicher das sie den App-Speicher wirklich löschen wollen?\n' + 
    'Dieser Prozess kann nicht rückgängig gemacht werden!\n' + 
    'Um den Prozess abzuschließen muss die App neugestartet werden!')){
      await this.fileSystemStorageService.deleteDataFromFilesystemStorage();
    }
  }

  /**
   * Sets the Contact for SOS Messages
   */
  settingsSetSOSContact(): void{
    if(this.selectedContactForSOSMessages != undefined){
      this.determinedContactForSOSMessages = this.selectedContactForSOSMessages;
      this.selectedContactForSOSMessages = undefined;
      this.networkUIInterface.setSOSContact(this.determinedContactForSOSMessages);

      //write to Filesystem
      this.fileSystemStorageService.saveSOSContactToFilesystem(this.determinedContactForSOSMessages);
    }
  }

  /**
   * Removes the currently set contact for SOS Messages
   */
  settingsRemoveSOSContact(): void{
    this.determinedContactForSOSMessages = undefined;
    this.networkUIInterface.setSOSContact(undefined);

    //write to Filesystem
    this.fileSystemStorageService.saveSOSContactToFilesystem(undefined);
  }

  /**
   * Set custom text content for SOS Messages
   */
  settingsSetCustomSOSMessage(): void{
    this.networkUIInterface.setSOSCustomMessage(this.sosMessageInputUI);

    //write to Filesystem
    this.fileSystemStorageService.saveSOSMessageToFileSystem(this.sosMessageInputUI);
  }

  /**
   * Handles on dismiss event on the settings Modal
   * @param event dismiss event
   */
  settingsOnDismiss(event: Event): void{
    this.settingsCancelUI();
  }

  //---------------------------------------------------
  //Network Methods
  //---------------------------------------------------

  /**
   * Calls it's Logic method and also sets variables for status messages
   * Seperation is done to handle status messages seperately from Logic
   */
  connectToServerUI(): void{
    this.displayConnectionStatusMessages = true;
    this.connectToServer();
  }

  /**
   * Sets currently input server address and tries to connect to the websocket server for the LoRa network
   */
  connectToServer(): void{
    if(this.checkForValidServerAddress(this.serverAddressUI)){
      this.lastAcceptedServerAddress = this.serverAddressUI;
      this.setServerAddress();
    }
    this.networkUIInterface.connectToLoRaNetwork();
  }

  /**
   * Signs off from the Websocket server of the LoRa network
   */
  signOffFromServer(): void{
    this.networkUIInterface.signOffFromLoRaNetwork();
  }

  /**
   * Empties the Status Log in the settings modal
   * @param event button click
   */
  emptyStatusLog(event: Event): void{
    event.stopPropagation();
    this.statusLog = [];
  }

  /**
   * Set server Adress in the App for LoRa network
   */
  setServerAddress(): void{
    this.networkUIInterface.setServerAddressLoRa(this.serverAddressUI);
  }

  /**
   * Set phone number in the App for network operations
   */
  setPhoneNumber(): void{
    this.networkUIInterface.setDevicePhoneNumber(this.deviceTelephoneNumberUI);
  }

  /**
   * Retrieve the server connection logs for display on the UI and to generate status messages for the settings modal
   * Subscribes to observable.
   */
  getConnectionLogs(): void{
    this.networkUIInterface.connectionLog$.subscribe( state => {
      this.statusLog.push(state);

      //Set UI Status Variables
      if(state.match('Verbindungsfehler') != null){
        this.statusServerConnectionSuccessfull = false;
        this.statusServerConnectionFailure = true;
      }else if(state.match('Verbindung erfolgreich') != null){
        this.statusServerConnectionFailure = false;
        this.statusServerConnectionSuccessfull = true;
      }    
    });
  }

  /**
   * Retrieve current connection status of websocket server
   * Subscribes to observable.
   */
  getConnectionStatus(): void{
    this.networkUIInterface.connectionStatus$.subscribe( state => (this.connectionStatus = state));
  }

  //---------------------------------------------------
  //Helper Methods
  //---------------------------------------------------

  /**
   * Checks if the user input for server address is valid
   * @returns true if is valid, false if not
   */
  checkForValidServerAddress(serverAdr: string): boolean{
    let serverAdressTest = new RegExp(this.serverAdressPattern);
    return serverAdressTest.test(serverAdr);
  }

  /**
   * Checks if the user input for the phone number in the settings modal is valid
   * @returns true if is valid, false if not
   */
  checkForValidPhoneNumber(phoneNumber: string): boolean{
    let phoneTest = new RegExp(this.telephoneNumberPattern);
    return phoneTest.test(phoneNumber);
  }

}
