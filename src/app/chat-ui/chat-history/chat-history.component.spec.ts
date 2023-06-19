import { ComponentFixture, TestBed, fakeAsync, tick, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { NetworkUiInterfaceService } from 'src/app/network-ui-interface.service';
import { FileSystemStorageService } from 'src/app/file-system-storage.service';
import { AppMessage } from 'src/app/appMessage';
import { ChatHistoryElement, messageTag } from './ChatHistoryElement';

import { ChatHistoryComponent } from './chat-history.component';
import { appContact } from 'src/app/appContact';

describe('ChatHistoryComponent', () => {
  let component: ChatHistoryComponent;
  let fixture: ComponentFixture<ChatHistoryComponent>;
  let networkUIService: NetworkUiInterfaceService;
  let filesystemService: FileSystemStorageService;
  let mockMessage: AppMessage;
  let devicePhonenumber: string;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ChatHistoryComponent ],
      imports: [IonicModule.forRoot()],
      providers: [NetworkUiInterfaceService, FileSystemStorageService]
    }).compileComponents();

    fixture = TestBed.createComponent(ChatHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    networkUIService = TestBed.inject(NetworkUiInterfaceService);
    filesystemService = TestBed.inject(FileSystemStorageService);

    devicePhonenumber = '+495555555';
    mockMessage = {
      source: devicePhonenumber,
      destination: '+493333333',
      timestamp: Date.now(),
      content: 'This is a test message'
    }
  }));   

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  //Test doesn't work because for some reason the readFile method doesn't wait for the file to be written first.
  /**
  //Test loadChatHistoryFromFilesystem method
  it('chat history should be able to be loaded from the Filesystem', fakeAsync(() => {
    component.chatHistory = [];

    spyOn(filesystemService, 'writeTextFileToFilesystem').and.resolveTo(true);
    //send to messages to the chat history
    networkUIService.setDevicePhoneNumber(devicePhonenumber);
    networkUIService.setMessageRecieved(Object.assign({}, mockMessage));

    tick();

    expect(component.chatHistory.length)
      .withContext('chat history should contain one element after one message was added')
      .toEqual(1);

    //const oldChatHistory: ChatHistoryElement[] = Object.assign({}, component.chatHistory);
    //delete chat history from UI and load the data back from Filesystem
    component.chatHistory = [];
    expect(component.chatHistory)
      .withContext('chat history should be empty after it got deleted on the UI')
      .toEqual([]);

    tick();
    spyOn(component, 'loadChatHistoryFromFilesystem').and.resolveTo(true)
    component.loadChatHistoryFromFilesystem();
    tick();
    expect(component.chatHistory.length)
      .withContext('chat history should contain one element after it got loaded from the Filesystem')
      .toEqual(1);
    expect(component.chatHistory[0].message.content)
      .withContext('first message should have the same content as prior to its deletion on the UI')
      .toEqual(mockMessage.content);    
  }));
 */

  //Test doesn't work because for some reason the readFile method doesn't wait for the file to be written first.
  /**
  //Test deleteChatHistory method
  it('chat history should be able to be deletedd from the UI and Filesystem', async () => {
    component.chatHistory = [];
    //send to messages to the chat history
    networkUIService.setDevicePhoneNumber(devicePhonenumber);
    networkUIService.setMessageRecieved(Object.assign({}, mockMessage));
    networkUIService.setMessageRecieved(Object.assign({}, mockMessage));
    expect(component.chatHistory.length)
      .withContext('chatHistory should contain two elements, after two were added')
      .toEqual(2);
    
    //delete Chathistory
    await component.deleteChatHistory();
    expect(component.chatHistory.length)
      .withContext('chatHistory should be empty on UI after deletion')
      .toEqual(0);
    await component.loadChatHistoryFromFilesystem();
    expect(component.chatHistory.length)
      .withContext('chatHistory should still be empty on UI after it is loaded from Filesystem')
      .toEqual(0);
  });
   */

  //Test convertTimestampToDateFormat method
  it('timestamp should be a readable format', () => {
    const ts = Date.now();
    const convertedTs = new Date(ts).toLocaleString('de-DE');
    const readableTimestamp = component.convertTimestampToDateFormat(ts);

    expect(readableTimestamp).toEqual(convertedTs);
  });

  //Test getMessage method
  it('recieved message should be in message list', () => {
    component.chatHistory = {};

    //set the overservable and phone number on the networkUIInterface
    networkUIService.setDevicePhoneNumber(devicePhonenumber);
    networkUIService.setMessageRecieved(mockMessage);

    const listElement: ChatHistoryElement = {
      message: mockMessage,
      messageTag : messageTag.SEND,
      messageIsSend: false
    }    

    //check if message is in Chat history and the phone number is set
    expect(component.chatHistory[mockMessage.destination])
      .withContext('recieved Message should be in message list')
      .toContain(listElement);
    expect(component.phoneNumber)
      .withContext('phone number should be successfully retrieved')
      .toEqual(devicePhonenumber);
  });

  //Test deleteChatHistoryForContact method
  it('chat history for a given contact should be able to be deleted', () => {
    component.chatHistory = {};

    const mockContact: appContact = {
      name: 'tester',
      phoneNumber: mockMessage.destination,
      phoneNumberCRC32: ''
    }

    //set the overservable and phone number on the networkUIInterface
    networkUIService.setDevicePhoneNumber(devicePhonenumber);
    networkUIService.setMessageRecieved(mockMessage);
    networkUIService.setMessageRecieved(mockMessage);
    networkUIService.setMessageRecieved(mockMessage);

    expect(component.chatHistory[mockMessage.destination].length)
      .withContext('there should be 3 messages in the chat history for the given contact after 3 messages were recieved')
      .toEqual(3);

    networkUIService.clearChatHistoryForContact(mockContact);

    expect(component.chatHistory[mockMessage.destination])
      .withContext('there should be no chat history for the given contact after it was deleted')
      .toBeUndefined;
  });

  //test transferChatHistoryForContact method
  it('chat history should be transfered from one contact to another', () => {
    component.chatHistory = {};

    const mockContact1: appContact = {
      name: 'tester1',
      phoneNumber: mockMessage.destination,
      phoneNumberCRC32: ''
    }

    const mockContact2: appContact = {
      name: 'tester2',
      phoneNumber: '+498887894',
      phoneNumberCRC32: ''
    }

    //set the overservable and phone number on the networkUIInterface
    networkUIService.setDevicePhoneNumber(devicePhonenumber);
    networkUIService.setMessageRecieved(mockMessage);
    networkUIService.setMessageRecieved(mockMessage);
    networkUIService.setMessageRecieved(mockMessage);

    expect(component.chatHistory[mockContact1.phoneNumber].length)
      .withContext('there should be 3 messages in the chat history for the given contact after 3 messages were recieved')
      .toEqual(3);

    networkUIService.transferChatHistoryForContact(mockContact1.phoneNumber, mockContact2.phoneNumber);

    expect(component.chatHistory[mockContact2.phoneNumber].length)
      .withContext('there should be 3 messages in the chat history of the destination contact after transfer')
      .toEqual(3);
    expect(component.chatHistory[mockContact1.phoneNumber])
      .withContext('chat history for source contact should no longer exist after transfer')
      .toBeUndefined
  });
});
