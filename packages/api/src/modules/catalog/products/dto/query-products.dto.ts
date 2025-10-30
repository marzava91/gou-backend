import { IsInt, IsOptional, IsString, Min } from 'class-validator'; 

export class QueryProductsDto { 
  @IsOptional() @IsString() search?: string; 
  @IsOptional() @IsString() categoryId?: string; 
  @IsOptional() @IsString() brandId?: string; 
  @IsOptional() @IsInt() @Min(1) page = 1; 
  @IsOptional() @IsInt() @Min(1) limit = 20; 
}