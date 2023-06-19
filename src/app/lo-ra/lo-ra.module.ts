import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NetworkDataTransferService } from './network-data-transfer.service';



@NgModule({
  declarations: [],
  imports: [
    CommonModule
  ],
  providers: [
    NetworkDataTransferService
  ]
})
export class LoRaModule {
  constructor(private networkDataTransfer:NetworkDataTransferService){}
 }
