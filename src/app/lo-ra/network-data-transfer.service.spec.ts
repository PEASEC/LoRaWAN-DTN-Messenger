import { TestBed} from '@angular/core/testing';
import { AppMessage } from '../appMessage';

import { NetworkDataTransferService } from './network-data-transfer.service';
import { AppContactsService } from '../app-contacts.service';

describe('NetworkDataTransferService', () => {

  //Set if a server for testing is available and its address
  //-------------------------------------------------
  const testServerAvailable: boolean = false;
  const testServerAddress: string = 'localhost:3000';
  //-------------------------------------------------

  let service: NetworkDataTransferService;
  let appContactsService: AppContactsService;
  let telephoneNumberPool: string[];
  let message: string;
  let timestamp: number;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NetworkDataTransferService);
    appContactsService = TestBed.inject(AppContactsService);

    //set different phone number for each test, so tests don't get in the way of each other
    telephoneNumberPool = [
      '+491111111',
      '+492222222',
      '+493333333',
      '+494444444',
      '+495555555',
      '+496666666',
      '+497777777',
      '+498888888',
      '+499999999',
      '+4910101010',
      '+4911111111'
    ];
    message = 'this is a test message';
    timestamp = Date.now();
  });

  afterAll(async () => {
    if(testServerAvailable){
      //connect to server
      service.setServerAddress(testServerAddress);
      service.connectToServer();
      if(service.socket != undefined){
        await waitForOpenConnection(service.socket);
      }
    }

    //remove left over phone numbers from testing
    const listLength: number = telephoneNumberPool.length;
    for(let i:number = 0; i < listLength; i++){
      service.removeTelephoneNumberFromBackend(telephoneNumberPool[i]);
    }
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('test connectToServer method', async () => {
    if(testServerAvailable){
      //subscribe to connection log
      let connectionLog: string[] = [];
      service.connectionLog$.subscribe( log => {
        connectionLog.push(log);
      })

      //check error message if no server address is yet given
      service.connectToServer();
      //check if a connection error is returned if tried to connect to a non existant server address
      const invalidTestAdress: string = 'invalidTestAdress:8000';
      service.setServerAddress(invalidTestAdress);
      service.connectToServer();
      //connect with a valid test server address
      service.setServerAddress(testServerAddress);
      service.connectToServer();

      if(service.socket != undefined){
        await waitForOpenConnection(service.socket);
      }

      expect(connectionLog[0])
        .withContext('if no server address is given, the method should return the appropiate error')
        .toEqual('Keine Server Adresse hinterlegt');
      expect(connectionLog[1]).toEqual('CID: 0 - ' + invalidTestAdress + ': Verbindung wird aufgebaut');
      expect(connectionLog[2]).toEqual('CID: 0 - ' + invalidTestAdress + ': Verbindungsfehler');
      expect(connectionLog[3])
        .withContext('old connection should be closed if a new one is opened')
        .toEqual('CID: 0 - ' + invalidTestAdress + ': Verbindung geschlossen, Code: 1006');
      expect(connectionLog[4]).toEqual('CID: 1 - ' + testServerAddress + ': Verbindung wird aufgebaut');
      expect(connectionLog[5]).toEqual('CID: 1 - ' + testServerAddress + ': Verbindung erfolgreich');

    } else {
      expect(true).toEqual(true);
    }    
  })

  it('test disconnect method', async () => {
    if(testServerAvailable){
      //subscribe to connection log
      let connectionLog: string[] = [];
      service.connectionLog$.subscribe( log => {
        connectionLog.push(log);
      })

      //connect to Server 
      service.setServerAddress(testServerAddress);
      service.connectToServer();
      if(service.socket != undefined){
        await waitForOpenConnection(service.socket);
      }

      //check that no phone number was removed if none was set previously on the App
      const length1: number = (await service.getAddressesFromBackend()).length;
      service.disconnect();
      const length2: number = (await service.getAddressesFromBackend()).length;
      expect(length1)
        .withContext('no address should be removed on disconnect, if no phone number was set on the App previously')
        .toEqual(length2);

      //set phone number on backend
      service.setDevicePhoneNumber(telephoneNumberPool[0], appContactsService.getCRC32FormatOfPhoneNumber(telephoneNumberPool[0]));

      //disconnect from Server
      service.connectToServer();
      service.disconnect();
      expect(connectionLog.pop())
        .withContext('websocket should be closed after disconnect')
        .toEqual('CID: ' + 1 + ' - ' + testServerAddress + ': Verbindung wird getrennt');
      expect(await service.getAddressesFromBackend())
        .withContext('phone number should not be in address list of backend after disconnect')
        .not.toContain(telephoneNumberPool[0]);
    } else {
      expect(true).toEqual(true);
    }
  })

  it('test processIncommingMessage method', () => {
    //set device phone number
    service.setDevicePhoneNumber(telephoneNumberPool[1], appContactsService.getCRC32FormatOfPhoneNumber(telephoneNumberPool[1]));

    //convert to CRC32
    let destination: string = appContactsService.getCRC32FormatOfPhoneNumber(telephoneNumberPool[1]);
    let source: string = appContactsService.getCRC32FormatOfPhoneNumber(telephoneNumberPool[2]);

    //subscribe to message that is send to UI
    let recMsg!: AppMessage; 
    service.messageReadyForUI$.subscribe(msg => {
      recMsg = msg;
    });

    //convert string from AppMessage content to array of char codes for BP7 message
    let payload: number[] = []
    const messageLength: number = message.length;
    for(let i: number = 0; i < messageLength; i++){
      const charCode: number = message.charCodeAt(i);
      if(charCode <= 255){
        payload.push(charCode);
      }
    }

    //create mock message in BP7 format of LoRa network
    const ttl: number = 60 * 60 * 1000;
    const msgBP7: (number | (string | number)[])[][] = [
      [
        7,
        0,
        0,
        [1, "//" + destination + "/"],
        [1, "//" + source + "/"],
        [1, "//" + source + "/"],
        [timestamp, 0],
        ttl,
      ],
      [1, 1, 0, 0, payload]
    ];
    let msgBP7String = JSON.stringify(msgBP7);
    msgBP7String = JSON.parse(msgBP7String);

    //process mock message
    service.processIncommingMessage(msgBP7String);

    expect(recMsg.destination)
      .withContext('destination address in UI message should match address in BP7 message')
      .toEqual(destination);
    expect(recMsg.source)
      .withContext('source address in UI message should match address in BP7 message')
      .toEqual(source);
    expect(recMsg.content)
      .withContext('message content in UI message should match content in BP7 message')
      .toEqual(message);
    expect(recMsg.timestamp - timestamp)
      .withContext('timestamp in UI message should match timestamp in BP7 message')
      .toBeLessThan(100);
  });

  // buffering is tested with the message buffer test
  it('test processOutgoingMessage method', async () => {
    if(testServerAvailable){
      //create mock message
      const msg: AppMessage = {
        source: appContactsService.getCRC32FormatOfPhoneNumber(telephoneNumberPool[9]),
        destination: appContactsService.getCRC32FormatOfPhoneNumber(telephoneNumberPool[10]),
        timestamp: timestamp,
        content: message
      };

      const ttl = 60 * 60 * 1000;

      let payload: number[] = []
      const messageLength: number = message.length;
      for(let i: number = 0; i < messageLength; i++){
        const charCode: number = message.charCodeAt(i);
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
          [1, "//" + msg.destination + "/LoRaEmergency"],
          [1, "//" + msg.source + "/LoRaEmergency"],
          [1, "//" + msg.source + "/LoRaEmergency"],
          [msg.timestamp, 0],
          ttl,
        ],
        [1, 1, 0, 0, payload]
      ];    
      const msgBP7String = JSON.stringify(msgBP7);

      //connect to server
      service.setServerAddress(testServerAddress);
      service.connectToServer();
      if(service.socket != undefined){
        await waitForOpenConnection(service.socket);
      }

      //send message
      const result: string = service.processOutgoingMessage(msg, -1);
      expect(result)
        .withContext('send message should be in correct BP7 format')
        .toEqual(msgBP7String);
    } else {
      expect(true).toEqual(true);
    }
  });

  it('test emptyMessageBuffer method and message buffer functionality', async () => {
    if(testServerAvailable){
      //create mock message
      const msg: AppMessage = {
        source: telephoneNumberPool[3],
        destination: telephoneNumberPool[4],
        timestamp: timestamp,
        content: message
      }

      expect(service.getMessageBuffer().length)
        .withContext('buffer should be empty at start')
        .toEqual(0);

      //send a messages while no connection to websocket server is established
      service.processOutgoingMessage(msg, -1);

      expect(service.getMessageBuffer().length)
        .withContext('buffer should contain two elements')
        .toEqual(1);
      const bufferedMessage: {msg: AppMessage, chatHistoryIndexOfMessage: number} = service.getMessageBuffer()[0];
      expect(bufferedMessage.msg.source)
        .withContext('source address in buffered message should be equal to the message sent')
        .toEqual(telephoneNumberPool[3]);
      expect(bufferedMessage.msg.destination)
        .withContext('destination address in buffered message should be equal to the message sent')
        .toEqual(telephoneNumberPool[4]);
      expect(bufferedMessage.msg.timestamp)
        .withContext('timestamp in buffered message should be equal to the message sent')
        .toEqual(timestamp);
      expect(bufferedMessage.msg.content)
        .withContext('content in buffered message should be equal to the message sent')
        .toEqual(message); 
        
      //connect to server and empty the message buffer after connecting
      service.setServerAddress(testServerAddress);
      service.connectToServer();
      if(service.socket != undefined){
        await waitForOpenConnection(service.socket);
      }

      expect(service.getMessageBuffer().length)
        .withContext('after the empty operation is called, message buffer should be empty')
        .toEqual(0);
    } else {
      expect(true).toEqual(true);
    }
  });

  it('test addTelephoneNumberToBackend method', async () => {
    if(testServerAvailable){
      //Connect to server
      service.setServerAddress(testServerAddress);
      service.connectToServer();
      if(service.socket != undefined){
        await waitForOpenConnection(service.socket);
      }

      //add telephone number to backend
      service.addTelephoneNumberToBackend(telephoneNumberPool[5]);
      expect(await service.getAddressesFromBackend())
          .withContext('phone number should be in address list of backend after it was added')
          .toContain(telephoneNumberPool[5]);
    } else {
      expect(true).toEqual(true);
    }
  });

  it('test removeTelephoneNumberFromBackend method', async () => {
    if(testServerAvailable){
      //Connect to server
      service.setServerAddress(testServerAddress);
      service.connectToServer();
      if(service.socket != undefined){
        await waitForOpenConnection(service.socket);
      }

      //add telephone number to backend
      service.addTelephoneNumberToBackend(telephoneNumberPool[6]);
      expect(await service.getAddressesFromBackend())
          .withContext('phone number should be in address list of backend after it was added')
          .toContain(telephoneNumberPool[6]);

      //remove telephone number from backend
      service.removeTelephoneNumberFromBackend(telephoneNumberPool[6]);
      expect(await service.getAddressesFromBackend())
          .withContext('phone number should not be in address list of backend after it was removed')
          .not.toContain(telephoneNumberPool[6]);
    } else {
      expect(true).toEqual(true);
    }
  });

  it('test setDevicePhoneNumber method', async () => {
    if(testServerAvailable){
      //Connect to server
      service.setServerAddress(testServerAddress);
      service.connectToServer();
      if(service.socket != undefined){
        await waitForOpenConnection(service.socket);
      }

      //set phone numbers for testing
      const n1: string = telephoneNumberPool[7];
      const n2: string = telephoneNumberPool[8];

      service.setDevicePhoneNumber(n1, appContactsService.getCRC32FormatOfPhoneNumber(n1));
      expect(await service.getAddressesFromBackend())
          .withContext('phone number should be in address list of backend after it was first added')
          .toContain(n1);

      service.setDevicePhoneNumber(n2, appContactsService.getCRC32FormatOfPhoneNumber(n2));
      expect(await service.getAddressesFromBackend())
          .withContext('phone number should no longer be in address list of backend after it was a second was added')
          .not.toContain(n1);
      expect(await service.getAddressesFromBackend())
          .withContext('phone number should be in address list of backend after it was in the second step added')
          .toContain(n2);
    } else {
      expect(true).toEqual(true);
    }
  
  }); 

  //Helper function that waits until the socket connection is open
  //source: https://dev.to/ndrbrt/wait-for-the-websocket-connection-to-be-open-before-sending-a-message-1h12
  const waitForOpenConnection = (socket: WebSocket) => {
    return new Promise<void>((resolve) => {
        const maxNumberOfAttempts: number = 10;
        const intervalTime: number = 200; 

        let currentAttempt: number = 0;
        const interval = setInterval(() => {
            if (currentAttempt >= maxNumberOfAttempts) {
                clearInterval(interval);
            } else if (socket.readyState === socket.OPEN) {
                clearInterval(interval);
                resolve();
            }
            currentAttempt++;
        }, intervalTime);
    })
}

});
