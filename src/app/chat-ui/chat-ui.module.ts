import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { ChatHistoryComponent } from './chat-history/chat-history.component';
import { StatusBarComponent } from './status-bar/status-bar.component';
import { ChatInputComponent } from './chat-input/chat-input.component';



@NgModule({
  declarations: [
    StatusBarComponent,
    ChatHistoryComponent,
    ChatInputComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule
  ],
  exports: [
    StatusBarComponent,
    ChatHistoryComponent,
    ChatInputComponent
  ]
})
export class ChatUIModule { }
