import { Controller, Get } from '@nestjs/common';
import { SettingsService } from './settings.service';
@Controller('settings')
export class SettingsController {
  constructor(private svc: SettingsService) {}
  @Get() get() {
    return this.svc.get();
  }
}
