import { ComponentFixture, TestBed, waitForAsync, fakeAsync, tick } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { NetworkUiInterfaceService } from 'src/app/network-ui-interface.service';
import { FileSystemStorageService } from 'src/app/file-system-storage.service';

import { StatusBarComponent } from './status-bar.component';
import { appContact } from 'src/app/appContact';

describe('StatusBarComponent', () => {
  let component: StatusBarComponent;
  let fixture: ComponentFixture<StatusBarComponent>;
  let networkUIService: NetworkUiInterfaceService;
  let fileSystemService: FileSystemStorageService;

  let testPhoneNumber: string;
  let testFaultyPhoneNumber: string;
  let testServerAddress: string;
  let testFaultyServerAddress: string;
  let mockContact: appContact;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ StatusBarComponent ],
      imports: [IonicModule.forRoot()],
      providers: [NetworkUiInterfaceService, FileSystemStorageService]
    }).compileComponents();

    networkUIService = TestBed.inject(NetworkUiInterfaceService);
    fileSystemService = TestBed.inject(FileSystemStorageService);
    fixture = TestBed.createComponent(StatusBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    //reset class variables
    component.loadFromFileSystem = false;
    component.deviceTelephoneNumberUI = '';
    component.serverAddressUI = '';
    component.lastAcceptedDevicePhoneNumber = '';
    component.lastAcceptedServerAddress = '';
    component.statusLog = [];

    //set test variables
    testPhoneNumber = '+495555552';
    testFaultyPhoneNumber = '495555552';
    testServerAddress = 'example.org:4000';
    testFaultyServerAddress = 'example';

    mockContact = {
      name: 'Tester',
      phoneNumber: testPhoneNumber,
      phoneNumberCRC32: ''
    }
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  //Test loadDevicePhoneNumberFromFilesystem method
  it('load device phonenumber from Filesystem', fakeAsync(() => {
    component.loadFromFileSystem = true;

    fileSystemService.saveDevicePhoneNumberToFilesystem('');
    tick();
    component.loadDevicePhoneNumberFromFilesystem();
    tick();
    expect(component.deviceTelephoneNumberUI)
      .withContext('if no phonenumber was set previously on the Filesysten, none should be loaded on the App UI')
      .toEqual('');
    expect(networkUIService.getDevicePhoneNumber())
      .withContext('if no phonenumber was set previously on the Filesysten, none should be loaded on the Network Modules')
      .toEqual('-1');

    
    fileSystemService.saveDevicePhoneNumberToFilesystem(testPhoneNumber);
    tick();
    spyOn(fileSystemService, 'loadDevicePhoneNumberFromFilesystem').and.resolveTo(testPhoneNumber);
    component.loadDevicePhoneNumberFromFilesystem();
    tick();
    expect(component.deviceTelephoneNumberUI)
      .withContext('after device phonenumber was set previously on the Filesystem, it should be loaded on the App UI')
      .toEqual(testPhoneNumber);
    expect(networkUIService.getDevicePhoneNumber())
      .withContext('after device phonenumber was set previously on the Filesystem, it should be loaded on Network Modules')
      .toEqual(testPhoneNumber);
  }));

  //Test loadServerSettingsFromFilesystem method
  it('load server address from Filesystem', fakeAsync(() => {
    component.loadFromFileSystem = true;

    fileSystemService.saveServerAddressToFilesystem('');
    tick();
    component.loadServerSettingsFromFilesystem();
    tick();
    expect(component.serverAddressUI)
      .withContext('if no server address was set previously on the Filesysten, none should be loaded on the App UI')
      .toEqual('');

    component.deviceTelephoneNumberUI = testPhoneNumber;
    fileSystemService.saveServerAddressToFilesystem(testServerAddress);
    tick();
    spyOn(fileSystemService, 'loadServerAddressFromFilesystem').and.resolveTo(testServerAddress);
    component.loadServerSettingsFromFilesystem();
    tick();
    expect(component.serverAddressUI)
      .withContext('after server address was set previously on the Filesystem, it should be loaded on the App UI')
      .toEqual(testServerAddress);
    expect(component.statusLog.length)
      .withContext('if valid server address is loaded from Filesystem, a connection attempt to the server should be made')
      .toBeGreaterThan(0)
  }));

  //Test contactsSelectContact method
  it('select contact in contact modal', () => {
    let selectedTarget: appContact | undefined = undefined;
    networkUIService.selectedContact$.subscribe(target => {
      selectedTarget = target;
    })

    component.unreadMessagesForContacts.push(mockContact.phoneNumber);

    component.contactsSelectContact(mockContact);

    expect(component.selectedContactForMessaging)
      .withContext('Selected contact should be displayed on the UI')
      .toEqual(mockContact);
    expect(selectedTarget).toBeDefined
    if(selectedTarget){
      expect(selectedTarget)
        .withContext('Selected Target Contact for the App should be the selected contact')
        .toEqual(mockContact);
    }
    expect(component.unreadMessagesForContacts.length)
      .withContext('list of contacts for who unread messages are present should not contain the selected contact anymore')
      .toEqual(0);

  });

  //Test convertAndCheckImportedPhoneNumber method
  it('Try to convert invalid phonenumbers into correct format', () => {
    let result: boolean;
    component.selectedContactForImport = mockContact;
    result = component.convertAndCheckImportedPhoneNumber();
    expect(result)
      .withContext('A phone number, that is already in the correct format, should be recognized as such')
      .toEqual(true);
    mockContact.phoneNumber = '+49 176 5697468'
    result = component.convertAndCheckImportedPhoneNumber();
    expect(result)
      .withContext('A phone number with whitespaces should be converted')
      .toEqual(true);
    mockContact.phoneNumber = '+49 (176) 5697468'
    result = component.convertAndCheckImportedPhoneNumber();
    expect(result)
      .withContext('A phone number with whitespaces and special characters should be converted')
      .toEqual(true);
    mockContact.phoneNumber = '+49 -176- 5697468'
    result = component.convertAndCheckImportedPhoneNumber();
    expect(result)
      .withContext('Unknown formats cannot be converted and should return false')
      .toEqual(false);
  });

  //Test contactsImportContactFromDevice method
  it('Add imported Contact to app contact list', () => {
    //change phone number to make sure the contact was not added by a previous test
    mockContact.phoneNumber = mockContact.phoneNumber + '1';
    component.contactsImportContactFromDevice(mockContact);
    expect(component.statusContactSuccessfullyImported)
      .withContext('a valid contact should be able to be imported')
      .toEqual(true);
    component.contactsImportContactFromDevice(mockContact);
    expect(component.statusContactAlreadyExistsImportContact)
      .withContext('User should be informed if the to be added contact already exists in the app')
      .toEqual(true);
    mockContact.phoneNumber = 'invalid'
    component.contactsImportContactFromDevice(mockContact);
    expect(component.statusContactImportInvalidInput)
      .withContext('User should be informed that the phone number of the contact is invalid')
      .toEqual(true);
  });

  //Test contactsCheckForUnreadMessagesForContact method
  it('check if unread messages are present for a given contact',() => {
    let result: boolean = component.contactsCheckForUnreadMessagesForContact(mockContact.phoneNumber);
    expect(result)
      .withContext('should return false if contact is not on the list')
      .toEqual(false);
    component.unreadMessagesForContacts.push(mockContact.phoneNumber);
    result = component.contactsCheckForUnreadMessagesForContact(mockContact.phoneNumber);
    expect(result)
      .withContext('should return true if contact is on the list')
      .toEqual(true);
  });

  //Test contactsAddContact method
  it('add contacts on contacts modal', () => {
    component.newContactName = mockContact.name;
    component.newContactPhoneNumber = mockContact.phoneNumber;

    component.contactsAddContact();
    expect(component.statusContactSuccessfullyAdded)
      .withContext('UI should show that contact was successfully added')
      .toEqual(true);
    expect(component.newContactName)
      .withContext('name field should be reset after contact was successfully added')
      .toEqual('');
    expect(component.newContactPhoneNumber)
      .withContext('phone number field should be reset after contact was successfully added') 
      .toEqual('');

    component.newContactName = mockContact.name;
    component.newContactPhoneNumber = mockContact.phoneNumber;
    component.contactsAddContact();
    expect(component.statusContactAlreadyExistsNewContact)
      .withContext('UI should show that the to be added contact already exists')
      .toEqual(true);
  });

  //Test contactsRemoveContact method
  it('remove contacts on contacts modal', () => {
    let selectedTarget: appContact | undefined = undefined;
    networkUIService.selectedContact$.subscribe(target => {
      selectedTarget = target;
    })

    //spy on confirm window and automatically select an answer
    let confirmReturn = function(){
      return false;
    }
    spyOn(window, 'confirm').and.callFake(confirmReturn);

    component.newContactName = mockContact.name;
    component.newContactPhoneNumber = mockContact.phoneNumber;
    component.contactsAddContact();

    component.selectedContactForRemoval = mockContact;
    component.contactsRemoveContact();
    expect(component.selectedContactForRemoval).toBeDefined;
    expect(component.statusContactSuccessfullyRemoved)
      .withContext('if the result of the confirm window is not true, the contact should not be removed')
      .toEqual(false);

    confirmReturn = function(){
      return true;
    }
    component.contactsRemoveContact();
    expect(component.selectedContactForRemoval)
      .withContext('contact to be removed should be reset on the UI as it no longer exists')
      .toBeUndefined;
    expect(component.selectedContactForMessaging)
      .withContext('contact selected for messaging should be undefined after a contact was removed')
      .toBeUndefined;
    expect(selectedTarget)
      .withContext('target contact for the App should be set to undefined if a contact was removed')
      .toBeUndefined;
  });

  //Test contactsChangeContact method
  it('change contact in contacts modal', () => {
    component.contactsChangeContact();
    expect(component.statusContactChangeInvalidInput)
      .withContext('UI should show if an invalid input was given')
      .toEqual(true);

    component.changeContactName = mockContact.name
    component.changeContactPhoneNumber = mockContact.phoneNumber;
    component.selectedContactForChange = mockContact;
    component.contactsChangeContact();
    expect(component.statusContactAlreadyExistsChangeContact)
      .withContext('UI should show if the phone number already exists in the App')
      .toEqual(true);

    component.changeContactName = 'New Name'
    component.changeContactPhoneNumber = '+4958789875';
    component.selectedContactForChange = mockContact;

    component.contactsChangeContact();
    expect(component.statusContactSuccessfullyChanged)
      .withContext('UI should show that the contact was successfully changed')
      .toEqual(true);
  })

  //Test settingsCancel method
  it('cancel on settings modal', () => {
    component.lastAcceptedDevicePhoneNumber = testPhoneNumber;
    component.lastAcceptedServerAddress = testServerAddress;

    component.deviceTelephoneNumberUI = '+493333333';
    component.serverAddressUI = 'example.org:4567';

    component.settingsCancel();

    expect(component.deviceTelephoneNumberUI)
      .withContext('input phone number should not be taken over on cancel')
      .toEqual(testPhoneNumber);
    expect(component.serverAddressUI)
      .withContext('input server address should not be taken over on cancel')
      .toEqual(testServerAddress);
  });

  //Test settingsConfirm method
  it('confirm on settings modal', () => {
    //test telephone number
    component.deviceTelephoneNumberUI = testFaultyPhoneNumber;
    component.settingsConfirm();
    expect((component.lastAcceptedDevicePhoneNumber))
      .withContext('last accepted device phone number should be empty if no valid phone number was set prevously')
      .toEqual('');
    expect(networkUIService.getDevicePhoneNumber())
      .withContext('device phone number on network should be -1 if no valid phone number was set previously')
      .toEqual('-1');
    component.deviceTelephoneNumberUI = testPhoneNumber;
    component.settingsConfirm();
    expect(component.lastAcceptedDevicePhoneNumber)
      .withContext('last accepted device phone number should equal the last valid input phone number')
      .toEqual(testPhoneNumber);
    expect(networkUIService.getDevicePhoneNumber())
      .withContext('device phone number on the networkUIInterface should equal the last valid input phone number')
      .toEqual(testPhoneNumber);
    component.deviceTelephoneNumberUI = testFaultyPhoneNumber;
    component.settingsConfirm();
    expect(component.lastAcceptedDevicePhoneNumber)
      .withContext('last accepted device phone number should equal last valid input phone number, after invalid phone number was set')
      .toEqual(testPhoneNumber);
    expect(networkUIService.getDevicePhoneNumber())
      .withContext('device phone number on the networkUIInterface should equal the last valid input phone number, after invalid phone number was set')
      .toEqual(testPhoneNumber);

    //test server address
    component.serverAddressUI = testFaultyServerAddress;
    component.settingsConfirm();
    expect(component.lastAcceptedServerAddress)
      .withContext('last accepted server address should be empty if no valid server address was set previously')
      .toEqual('');
    component.serverAddressUI = testServerAddress;
    component.settingsConfirm();
    expect(component.lastAcceptedServerAddress)
      .withContext('last accepted server address should equal last valid input server address')
      .toEqual(testServerAddress);
    component.serverAddressUI = testFaultyServerAddress;
    expect(component.lastAcceptedServerAddress)
      .withContext('last accepted server address should equal last valid input server address, after invalid server address was set')
      .toEqual(testServerAddress);

  });

  //Test emptyStatusLog method
  it('status log should be emptied', () => {
    const logLength = component.statusLog.length;
    component.statusLog.push('test1');
    component.statusLog.push('test2');
    expect(component.statusLog.length)
      .withContext('status log should have two more elements after two elements are inserted')
      .toEqual(logLength + 2);
    component.emptyStatusLog(new Event('test'));
    expect(component.statusLog.length)
      .withContext('status log should be an empty list after emptyStatusLog is called')
      .toEqual(0);
  });

  //Test checkForValidServerAdress method
  it('check for valid server address format', () => {
    expect(component.checkForValidServerAddress('example5:8000'))
      .withContext('example5:8000 should be a valid server address')
      .toEqual(true);
    expect(component.checkForValidServerAddress('example.org:400'))
      .withContext('example.org:400 should be a valid server address')
      .toEqual(true);
    expect(component.checkForValidServerAddress('192.168.0.1:50'))
      .withContext('192.168.0.1:50 should be a valid server address')
      .toEqual(true);
    expect(component.checkForValidServerAddress('[2001:0db8:85a3:0000:0000:8a2e:0370:7334]:70000'))
      .withContext('[2001:0db8:85a3:0000:0000:8a2e:0370:7334]:70000 should be a valid server address')
      .toEqual(true);
    expect(component.checkForValidServerAddress(':8000'))
      .withContext(':8000 should not be a valid server address')
      .toEqual(false);
    expect(component.checkForValidServerAddress('example.org:'))
      .withContext('example: should not be a valid server address')
      .toEqual(false);
    expect(component.checkForValidServerAddress('192.168.1.5'))
      .withContext('192.168.1.5 should not be a valid server address')
      .toEqual(false);
  });

  //Test checkForValidPhoneNumber method
  it('check for valid phone number format', () => {
    expect(component.checkForValidPhoneNumber('+495555555'))
      .withContext('+495555555 should be a valid phone number')
      .toEqual(true);
    expect(component.checkForValidPhoneNumber('+4912345678912'))
      .withContext('+4912345678912 should be a valid phone number')
      .toEqual(true);
    expect(component.checkForValidPhoneNumber('49123456789121'))
      .withContext('49123456789121 should not be a valid phone number')
      .toEqual(false);
    expect(component.checkForValidPhoneNumber('+15555555554444444444'))
      .withContext('+15555555554444444444 should not be a valid phone number')
      .toEqual(false);
    expect(component.checkForValidPhoneNumber('+4587a5577'))
      .withContext('+4587a5577 should not be a valid phone number')
      .toEqual(false);
  });

  //Test setPhoneNumber method
  it('phone number should be set on networkUIInterface', () => {
    component.deviceTelephoneNumberUI = '+495555555';
    component.setPhoneNumber();
    expect(networkUIService.getDevicePhoneNumber())
      .withContext('Phone number should be set on networkUIInterface unchanged')
      .toEqual(component.deviceTelephoneNumberUI);
  });

  //Test getStatusLogs method
  it('get status logs from network', () => {
    component.getConnectionLogs();
    networkUIService.connectToLoRaNetwork();
    expect(component.statusLog.length)
      .withContext('status Log should contain entries, after connectToServer is called')
      .toBeGreaterThan(0);
    component.statusLog = [];
  });
});
