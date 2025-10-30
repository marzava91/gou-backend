import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'; 
import { map } from 'rxjs/operators';

@Injectable() 
export class TransformInterceptor implements NestInterceptor { 
  intercept(_:ExecutionContext, next:CallHandler){ 
    return next.handle().pipe(map((data:any)=> data?.data!==undefined? data : { data })); 
  } 
}