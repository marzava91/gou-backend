import { IsNumber, IsString, IsOptional } from 'class-validator'; 

export class CreateProductDto { 
    @IsString() name:string; 
    @IsString() sku:string; 
    @IsNumber() price:number; 
    @IsOptional() @IsString() imageUrl?:string; 
}