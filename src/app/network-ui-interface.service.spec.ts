import { TestBed } from '@angular/core/testing';
import { NetworkDataTransferService } from './lo-ra/network-data-transfer.service';
import { AppMessage } from './appMessage';
import { AppContactsService } from './app-contacts.service';

import { NetworkUiInterfaceService } from './network-ui-interface.service';
import { appContact } from './appContact';

describe('NetworkUiInterfaceService', () => {
  let service: NetworkUiInterfaceService;
  let networkDataService: NetworkDataTransferService;
  let appContactsService: AppContactsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NetworkDataTransferService]
    });
    service = TestBed.inject(NetworkUiInterfaceService);
    networkDataService = TestBed.inject(NetworkDataTransferService);
    appContactsService = TestBed.inject(AppContactsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  //Test SendMessageFromLoRaToUI method
  it('recieve message from Network and send it to the UI', () => {
    let recMsg !: AppMessage;
    service.messageRecieved$.subscribe(msg => {
      recMsg = msg;
    })
    let currentTimestamp = Date.now();

    const mockMessage: AppMessage = {
      source : appContactsService.getCRC32FormatOfPhoneNumber('+495555555'),
      destination : appContactsService.getCRC32FormatOfPhoneNumber('+493333333'),
      timestamp : currentTimestamp - service.getTimestampEpochOffset(),
      content : 'this is a test message'
    }

    networkDataService.sendMessageToUI(mockMessage);
    expect(recMsg)
      .withContext('recieved message should be an instance of AppMessage')
      .toBe(mockMessage);
    expect(recMsg.source)
      .withContext('source address in recieved message from network should be equal in message that is send to the UI')
      .toEqual(mockMessage.source);
    expect(recMsg.destination)
      .withContext('destination address in recieved message from network should be equal in message that is send to the UI')
      .toEqual(mockMessage.destination);
    expect(recMsg.timestamp)
      .withContext('timestamp in recieved message from network should have the epoch offset applied in message that is send to the UI')
      .toEqual(currentTimestamp);
    expect(recMsg.content)
      .withContext('content in recieved message from network should be equal in message that is send to the UI')
      .toEqual(mockMessage.content);
  });

  //Test sendMessageFromUIToLoRa method
  it('recieve message from UI and send it to the Network', () => {
    let recMsg !: AppMessage;
    service.messageRecieved$.subscribe(msg => {
      recMsg = msg;
    });
    let currentTimestamp = Date.now();
    let source = '+495555555';
    let destination = '+493333333';
    let content = 'this is a test message';

    const targetContact: appContact = {
      name: 'Tester',
      phoneNumber: destination,
      phoneNumberCRC32: ''
    }

    service.setDevicePhoneNumber(source);
    service.setTargetContact(targetContact)
    service.sendMessageFromUIToLoRa(content);

    expect(recMsg.source)
      .withContext('source address in send message from UI should be equal in message that is send to the Network')
      .toEqual(source);
    expect(recMsg.destination)
      .withContext('destination address in send message from UI should be equal in message that is send to the Network')
      .toEqual(destination);
    expect(recMsg.timestamp - currentTimestamp)
      .withContext('timestamp in send message from UI should be equal to current timestamp')
      .toBeLessThan(100);
    expect(recMsg.content)
      .withContext('content in send message from UI should be equal in message that is send to the Network')
      .toEqual(content);
  });

  //Test setDevicePhoneNumber and getDevicePhoneNumber method
  it('set device phone number for App', () => {
    let testPhoneNumber = '+495555555';
    service.setDevicePhoneNumber(testPhoneNumber);

    expect(service.getDevicePhoneNumber())
      .withContext('input phone number should be set on the NetworkUIInterface')
      .toEqual(testPhoneNumber);
  });
});
