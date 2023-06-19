import { TestBed } from '@angular/core/testing';

import { AppContactsService } from './app-contacts.service';
import { appContact } from './appContact';

describe('AppContactsService', () => {
  let service: AppContactsService;
  let testName1: string;
  let testName2: string
  let testPhoneNumber1: string;
  let testPhoneNumber2: string;
  let testPhoneNumberCRC321: string;
  let testPhoneNumberCRC322: string;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AppContactsService);
    testName1 = 'Tester1';
    testName2 = 'Tester2';
    testPhoneNumber1 = '+495555555';
    testPhoneNumber2 = '+496666666';
    testPhoneNumberCRC321 = service.getCRC32FormatOfPhoneNumber(testPhoneNumber1);
    testPhoneNumberCRC322 = service.getCRC32FormatOfPhoneNumber(testPhoneNumber2);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  //Test addContactToApp method
  it('add contact to App', () => {
    service.addContactToApp(testName1, testPhoneNumber1, testPhoneNumberCRC321);
    let contactList: appContact[] = service.getContactList();
    expect(contactList.length)
      .withContext('list length should equal 1 if a contact is added')
      .toEqual(1);
    const contact: appContact | undefined = contactList.find(element => element.phoneNumber == testPhoneNumber1);
    expect(contact?.phoneNumber)
      .withContext('list element should contain the added telephone number')
      .toEqual(testPhoneNumber1);
    expect(contact?.phoneNumberCRC32)
      .withContext('list element should contain the correct CRC32 version of the added telephone number')
      .toEqual(testPhoneNumberCRC321);

    service.addContactToApp(testName1, testPhoneNumber1, testPhoneNumberCRC321);
    contactList = service.getContactList();
    expect(contactList.length)
      .withContext('same contact should not be added to the list twice')
      .toEqual(1);

    service.addContactToApp(testName2, testPhoneNumber2, testPhoneNumberCRC322);
    contactList = service.getContactList();
    expect(contactList.length)
      .withContext('a second different contact should be added to the list')
      .toEqual(2);
  });

  //Test changeContactName method
  it('change name of contact', () => {
    const newName: string = 'newTester';
    service.addContactToApp(testName1, testPhoneNumber1, testPhoneNumberCRC321);
    service.changeContactName(testPhoneNumber1, newName);

    let contactList: appContact[] = service.getContactList();
    expect(contactList[0].name)
      .withContext('Contact should have new name after change')
      .toEqual(newName);
  });

  //Test removeContactFromApp method
  it('remove contact from App', () => {
    service.addContactToApp(testName1, testPhoneNumber1, testPhoneNumberCRC321);
    let contactList: appContact[] = service.getContactList();
    expect(contactList.length)
      .withContext('list length should equal 1 if a contact is added')
      .toEqual(1);

    service.removeContactFromApp('+493333333');
    contactList = service.getContactList();
    expect(contactList.length)
      .withContext('list length should still equal 1 if a non existant contact is tried to be removed')
      .toEqual(1);

    service.removeContactFromApp(testPhoneNumber1);
    contactList = service.getContactList();
    expect(contactList.length)
      .withContext('list length should equal 0 after a contact was removed')
      .toEqual(0);

    service.addContactToApp(testName1, testPhoneNumber1, testPhoneNumberCRC321);
    service.addContactToApp(testName2, testPhoneNumber2, testPhoneNumberCRC322);
    contactList = service.getContactList();
    expect(contactList.length)
      .withContext('list length should equal 2 after three contacts were added')
      .toEqual(2);
    service.removeContactFromApp(testPhoneNumber1);
    contactList = service.getContactList();
    expect(contactList.length)
      .withContext('list length should equal 1 after a contact was removed')
      .toEqual(1);
    expect(contactList[0].phoneNumber)
      .withContext('non removed contact should still be in the list')
      .toEqual(testPhoneNumber2);
  });

  //Test setContactToTheTopOfTheList method
  it('set given contact to the top of the list', () => {
    service.addContactToApp(testName1, testPhoneNumber1, testPhoneNumberCRC321);
    service.addContactToApp(testName2, testPhoneNumber2, testPhoneNumberCRC322);
    expect(service.getContactList()[0].name)
      .withContext('Contacts should be in the list in the order they were added')
      .toEqual(testName1);

    service.setContactToTheTopOfTheList(testPhoneNumber2);
    expect(service.getContactList()[0].name)
      .withContext('Contact should be at the top of the list after the list was sorted')
      .toEqual(testName2);
  });

  //Test getContactPhoneNumberFromCRC32 method
  it('get plain phone number from CRC32 format', () => {
    let plainPhoneNumber: string | undefined = service.getContactPhoneNumberFromCRC32(testPhoneNumberCRC321);
    expect(plainPhoneNumber)
      .withContext('if contact is not in the list, undefinded should be returned')
      .toEqual(undefined);

    service.addContactToApp(testName1, testPhoneNumber1, testPhoneNumberCRC321);
    plainPhoneNumber = service.getContactPhoneNumberFromCRC32(testPhoneNumberCRC321);
    expect(plainPhoneNumber)
      .withContext('should return correct plain phone number from CRC32 format if contact is known')
      .toEqual(testPhoneNumber1);
  });
});
