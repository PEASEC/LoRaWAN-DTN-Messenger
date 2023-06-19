import { Component, OnInit } from '@angular/core';
import { NetworkUiInterfaceService } from 'src/app/network-ui-interface.service';

@Component({
  selector: 'app-chat-input',
  templateUrl: './chat-input.component.html',
  styleUrls: ['./chat-input.component.scss'],
})
export class ChatInputComponent implements OnInit {
  chatInput: string = "";

  constructor(private networkUIInterface: NetworkUiInterfaceService) { }

  ngOnInit() {}

  /**
   * Handles Ctrl + Enter keyboard event in message input
   * If both keys are pressed, the method to send the message is called
   */
  checkKeyboardEvent(event: { ctrlKey: any; key: string; }){
    if(event.ctrlKey && event.key == 'Enter'){
      this.inputMessage();
    }
  }

  /**
   * Handles send event for chat input
   */
  inputMessage(): void{
    if(this.chatInput != "" && this.networkUIInterface.getDevicePhoneNumber() != "-1"){
      //send message to network interface
      this.networkUIInterface.sendMessageFromUIToLoRa(this.chatInput);

      //clean input
      this.chatInput = "";
    }
    else if(this.networkUIInterface.getDevicePhoneNumber() == "-1"){
      alert("Bitte gültige Telefonnummer in Einstellungen angeben.");
    }
  }

}
