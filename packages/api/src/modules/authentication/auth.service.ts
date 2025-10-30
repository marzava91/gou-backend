import { Injectable } from '@nestjs/common'; 
import { AuthRepository } from './auth.repository';

@Injectable() 
export class AuthService { 
  constructor(private repo: AuthRepository) {}

  async exchange(_: any) { 
    return { data: { token: 'demo' } }; 
  }

  async me() { 
    return { data: { user: { id: 'demo' } } }; 
  }
}