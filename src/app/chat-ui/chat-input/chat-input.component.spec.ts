import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { NetworkUiInterfaceService } from 'src/app/network-ui-interface.service';

import { ChatInputComponent } from './chat-input.component';

describe('ChatInputComponent', () => {
  let component: ChatInputComponent;
  let fixture: ComponentFixture<ChatInputComponent>;
  let networkUIService: NetworkUiInterfaceService;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ChatInputComponent ],
      imports: [IonicModule.forRoot()],
      providers: [NetworkUiInterfaceService]
    }).compileComponents();
    
    networkUIService = TestBed.inject(NetworkUiInterfaceService);

    fixture = TestBed.createComponent(ChatInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  //Test inputMessage method
  it('input message should be send', () => {
    
    spyOn(window, 'alert');

    //check error if telephone number was not set before
    component.inputMessage();
    expect(window.alert)
      .withContext('should throw alert message if telephone number is not set yet')
      .toHaveBeenCalledWith('Bitte gültige Telefonnummer in Einstellungen angeben.');

    //check if telephone number was set, but the destination input is empty
    networkUIService.setDevicePhoneNumber('+495555555');
    component.inputMessage();

    //check if message is sent when phone number and destination are set
    component.chatInput = 'This is a test message';
    component.inputMessage();
    expect(component.chatInput)
      .withContext('Chat input field should be emptied after a message is sent')
      .toEqual('');
  });
});
