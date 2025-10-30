import { Body, Controller, Get, Post } from '@nestjs/common'; 
import { AuthService } from './auth.service'; 
import { AuthExchangeDto } from './dto/auth-exchange.dto';

@Controller('v1/auth') 
export class AuthController { 
  constructor(private svc: AuthService) {}

  @Post('exchange') 
  exchange(@Body() dto: AuthExchangeDto) { 
    return this.svc.exchange(dto); 
  }

  @Get('me') 
  me() { 
    return this.svc.me(); 
  }
}